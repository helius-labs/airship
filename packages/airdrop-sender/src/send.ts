import * as web3 from "@solana/web3.js";
import { db } from "./db";
import { transaction_queue } from "./schema/transaction_queue";
import {
  computeUnitLimit,
  computeUnitPrice,
  lookupTableAddress,
  maxAddressesPerTransaction,
} from "./constants";
import { ne, desc, asc, sql, eq, count } from "drizzle-orm";
import { buildAndSignTx, createRpc, Rpc } from "@lightprotocol/stateless.js";
import * as splToken from "@solana/spl-token";
import {
  CompressedTokenProgram,
  createTokenPool,
} from "@lightprotocol/compressed-token";
import { AirdropError, AirdropErrorCode, AirdropErrorMessage } from "./errors";
import { logger } from "./logger";
import bs58 from "bs58";
import { SendTransactionError } from "@solana/web3.js";

// https://docs.solanalabs.com/consensus/commitments
enum CommitmentStatus {
  Undefined = 0,
  Processed = 1,
  Confirmed = 2,
  Finalized = 3,
}

interface SendParams {
  keypair: web3.Keypair;
  url: string;
}

export async function send(params: SendParams) {
  const { keypair, url } = params;

  // Fetch total amount of addresses to send
  const totalQueue = await db
    .select({ count: count() })
    .from(transaction_queue);
  const totalTransactionsToSend = totalQueue[0].count;

  // Fetch the airdrop queue
  const transactionQueue = await db
    .select({
      id: transaction_queue.id,
      mint_address: transaction_queue.mint_address,
      addresses: transaction_queue.addresses,
      amount: transaction_queue.amount,
      attempts: transaction_queue.attempts,
    })
    .from(transaction_queue)
    .where(ne(transaction_queue.commitment_status, CommitmentStatus.Finalized))
    .orderBy(
      asc(transaction_queue.id),
      desc(transaction_queue.last_attempted_at),
      asc(transaction_queue.commitment_status)
    );

  if (transactionQueue.length === 0) {
    throw new AirdropError(
      AirdropErrorMessage.airdropNothingToSend,
      AirdropErrorCode.airdropNothingToSend
    );
  }

  const connection: Rpc = createRpc(url, url);

  // get the table from the cluster
  const lookupTableAccount = (
    await connection.getAddressLookupTable(lookupTableAddress)
  ).value!;

  const mintAddress = new web3.PublicKey(transactionQueue[0].mint_address);

  // Get the source token account for the mint address
  const sourceTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
    connection,
    keypair,
    mintAddress,
    keypair.publicKey
  );

  // Create a token pool for the mint address if it doesn't exist
  try {
    await createTokenPool(connection, keypair, mintAddress);
    console.log("Token pool created.");
    logger.info("Token pool created.");
  } catch (error: any) {
    if (error.message.includes("already in use")) {
      console.log("Token pool already exists.");
      logger.info("Token pool already exists.");
    } else {
      console.error("Failed to create token pool:", error);
      logger.error("Failed to create token pool:", error);
    }
  }

  for (const transaction of transactionQueue) {
    try {
      console.log(
        `Transaction [${transaction.id}/${totalTransactionsToSend}] sending...`
      );
      logger.info(
        `Transaction [${transaction.id}/${totalTransactionsToSend}] sending...`
      );

      const addresses = transaction.addresses.map(
        (address) => new web3.PublicKey(address)
      );

      const instructions = await createInstructions(
        keypair,
        mintAddress,
        sourceTokenAccount,
        addresses,
        transaction.amount
      );

      const { blockhash } = await connection.getLatestBlockhash();

      const signedTx = buildAndSignTx(
        instructions,
        keypair,
        blockhash,
        undefined,
        [lookupTableAccount]
      );

      // TODO: only send the transaction and use a worker thread to check the status
      // Direclty save the signature to the database to avoid sending the same transaction twice
      const signature = await connection.sendRawTransaction(
        signedTx.serialize(),
        {
          skipPreflight: false,
        }
      );

      await db
        .update(transaction_queue)
        .set({
          signature: signature,
          attempts: transaction.attempts + 1,
          last_attempted_at: sql`(unixepoch())`,
          blockhash: blockhash,
          serialised_transaction: bs58.encode(signedTx.serialize()),
        })
        .where(eq(transaction_queue.id, transaction.id));

      console.log(
        `Transaction [${transaction.id}/${totalTransactionsToSend}] sent: ${signature}`
      );
      logger.info(
        `Transaction [${transaction.id}/${totalTransactionsToSend}] sent: ${signature}`
      );
    } catch (error) {
      if (error instanceof SendTransactionError) {
        if (error.logs?.includes("Program log: Error: insufficient funds")) {
          logger.error(
            AirdropErrorMessage.airdropInsufficientFunds +
              ": " +
              keypair.publicKey.toBase58()
          );
          throw new AirdropError(
            AirdropErrorMessage.airdropInsufficientFunds +
              ": " +
              keypair.publicKey.toBase58(),
            AirdropErrorCode.airdropInsufficientFunds
          );
        }
        console.error(error.message);
        logger.error(error.message);
      } else {
        console.error(error);
        logger.error(error);
      }
    }
  }
}

async function createInstructions(
  keypair: web3.Keypair,
  mintAddress: web3.PublicKey,
  sourceTokenAccount: splToken.Account,
  addresses: web3.PublicKey[],
  amount: bigint
): Promise<web3.TransactionInstruction[]> {
  if (addresses.length === 0) {
    throw new AirdropError(
      AirdropErrorMessage.airdropNoAddresses,
      AirdropErrorCode.airdropNoAddresses
    );
  }

  if (addresses.length > maxAddressesPerTransaction) {
    throw new AirdropError(
      AirdropErrorMessage.airdropMaxAddressesPerTransaction,
      AirdropErrorCode.airdropMaxAddressesPerTransaction
    );
  }

  const instructions: web3.TransactionInstruction[] = [];

  // Set the compute unit limit and add it to the transaction
  const unitLimitIX = web3.ComputeBudgetProgram.setComputeUnitLimit({
    units: computeUnitLimit,
  });

  instructions.push(unitLimitIX);

  // Set the compute unit limit and add it to the transaction
  const unitPriceIX = web3.ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: computeUnitPrice,
  });

  instructions.push(unitPriceIX);

  // Compress tokens for each airdrop address and add it to the transaction
  const compressIx = await CompressedTokenProgram.compress({
    payer: keypair.publicKey, // The payer of the transaction.
    owner: keypair.publicKey, // owner of the *uncompressed* token account.
    source: sourceTokenAccount.address, // source (associated) token account address.
    toAddress: addresses, // address to send the compressed tokens to.
    amount: addresses.map(() => Number(amount)), // amount of tokens to compress.
    mint: mintAddress, // Mint address of the token to compress.
  });
  instructions.push(compressIx);

  return instructions;
}
