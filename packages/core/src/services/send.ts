import * as web3 from "@solana/web3.js";
import { transaction_queue } from "../schema/transaction_queue";
import {
  CommitmentStatus,
  computeUnitLimit,
  computeUnitPrice,
  lookupTableAddress,
  maxAddressesPerTransaction,
  maxAddressesPerInstruction,
} from "../config/constants";
import { desc, asc, sql, eq, count, isNull, or } from "drizzle-orm";
import { buildAndSignTx, createRpc, Rpc } from "@lightprotocol/stateless.js";
import * as splToken from "@solana/spl-token";
import {
  CompressedTokenProgram,
  createTokenPool,
} from "@lightprotocol/compressed-token";
import {
  AirdropError,
  AirdropErrorCode,
  AirdropErrorMessage,
} from "../utils/airdropError";
import { logger } from "./logger";
import bs58 from "bs58";
import { SendTransactionError } from "@solana/web3.js";
import { sleep } from "../utils/common";

// Using db: any instead of db: BetterSQLite3Database | SqliteRemoteDatabase because of typescript limitations
// https://github.com/drizzle-team/drizzle-orm/issues/1966#issuecomment-1981726977
interface SendParams {
  db: any;
  keypair: web3.Keypair;
  url: string;
}

export async function send(params: SendParams) {
  const { keypair, url, db } = params;

  if (!db) {
    throw new Error("Database is not loaded");
  }

  // Fetch total amount of addresses to send
  const totalQueue = await db
    .select({ count: count() })
    .from(transaction_queue);
  const totalTransactionsToSend = totalQueue[0].count;

  while (true) {
    // Fetch total amount of addresses to send
    const totalFinalizedQueue = await db
      .select({ count: count() })
      .from(transaction_queue)
      .where(
        or(
          eq(transaction_queue.commitment_status, CommitmentStatus.Confirmed),
          eq(transaction_queue.commitment_status, CommitmentStatus.Finalized)
        )
      );
    const totalTransactionsFinalized = totalFinalizedQueue[0].count;

    if (totalTransactionsFinalized === totalTransactionsToSend) {
      break;
    }

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
      .where(isNull(transaction_queue.signature))
      .orderBy(
        asc(transaction_queue.id),
        desc(transaction_queue.last_attempted_at),
        asc(transaction_queue.commitment_status)
      );

    // No transaction to send. Wait for a second and try again
    if (transactionQueue.length === 0) {
      logger.info(
        "All transactions sent. Checking for possible retries in 5 seconds..."
      );
      await sleep(5000);
      continue;
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
      logger.info("Token pool created.");
    } catch (error: any) {
      if (error.message.includes("already in use")) {
        logger.info("Token pool already exists. Skipping...");
      } else {
        logger.error("Failed to create token pool:", error);
      }
    }

    for (const transaction of transactionQueue) {
      try {
        const addresses = transaction.addresses.map(
          (address: any) => new web3.PublicKey(address)
        );

        const instructions = await createInstructions(
          keypair,
          mintAddress,
          sourceTokenAccount,
          addresses,
          transaction.amount
        );

        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash();

        const signedTx = buildAndSignTx(
          instructions,
          keypair,
          blockhash,
          undefined,
          [lookupTableAccount]
        );

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
            last_valid_block_height: lastValidBlockHeight,
          })
          .where(eq(transaction_queue.id, transaction.id));
        logger.info(
          `Transaction [${transaction.id}/${totalTransactionsToSend}] sent: ${signature}`
        );
      } catch (error) {
        if (error instanceof SendTransactionError) {
          if (error.logs?.includes("Program log: Error: insufficient funds")) {
            logger.error(AirdropErrorMessage.airdropInsufficientFunds);
            throw new AirdropError(AirdropErrorMessage.airdropInsufficientFunds, AirdropErrorCode.airdropInsufficientFunds);
          }
          logger.error(error.message);
        } else {
          logger.error(error);
        }
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

  // Create batches of 5 addresses per instruction to not go over the maximum cross-program invocation instruction size
  const batches = Math.ceil(addresses.length / maxAddressesPerInstruction);
  for (let i = 0; i < batches; i++) {
    const batch = addresses.slice(i * maxAddressesPerInstruction, (i + 1) * maxAddressesPerInstruction);

    // Skip empty batches.
    // This may occur due to floating-point precision errors in JavaScript.
    if (batch.length === 0) {
      continue;
    }

    // Compress tokens for each airdrop address and add it to the transaction
    const compressIx = await CompressedTokenProgram.compress({
      payer: keypair.publicKey, // The payer of the transaction.
      owner: keypair.publicKey, // owner of the *uncompressed* token account.
      source: sourceTokenAccount.address, // source (associated) token account address.
      toAddress: batch, // address to send the compressed tokens to.
      amount: batch.map(() => Number(amount)), // amount of tokens to compress.
      mint: mintAddress, // Mint address of the token to compress.
    });
    instructions.push(compressIx);
  }

  return instructions;
}
