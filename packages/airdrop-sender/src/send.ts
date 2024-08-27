import * as web3 from "@solana/web3.js";
import { db } from "./db";
import { transaction_queue } from "./schema/transaction_queue";
import {
  computeUnitLimit,
  lookupTableAddress,
  maxAddressesPerTransaction,
} from "./constants";
import { ne, desc, asc, sql, eq } from "drizzle-orm";
import {
  buildAndSignTx,
  createRpc,
  Rpc,
  sendAndConfirmTx,
} from "@lightprotocol/stateless.js";
import * as splToken from "@solana/spl-token";
import { CompressedTokenProgram } from "@lightprotocol/compressed-token";
import { AirdropError, AirdropErrorCode, AirdropErrorMessage } from "./errors";
import { logger } from "./logger";
import bs58 from "bs58";
import { log } from "winston";

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
  mintAddress: web3.PublicKey;
}

export async function send(params: SendParams) {
  const { keypair, url, mintAddress } = params;

  // Fetch the airdrop queue
  const transactionQueue = await db
    .select({
      id: transaction_queue.id,
      addresses: transaction_queue.addresses,
      amount: transaction_queue.amount,
      attempts: transaction_queue.attempts,
    })
    .from(transaction_queue)
    .where(ne(transaction_queue.commitment_status, CommitmentStatus.Finalized))
    .orderBy(
      desc(transaction_queue.last_attempted_at),
      asc(transaction_queue.commitment_status)
    );

  const connection: Rpc = createRpc(url, url);

  // get the table from the cluster
  const lookupTableAccount = (
    await connection.getAddressLookupTable(lookupTableAddress)
  ).value!;

  // Get the source token account for the mint address
  const sourceTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
    connection,
    keypair,
    mintAddress,
    keypair.publicKey
  );

  for (const transaction of transactionQueue) {
    try {
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
      // const signature = await connection.sendRawTransaction(tx.serialize());
      const signature = await sendAndConfirmTx(connection, signedTx, {
        commitment: "finalized",
      });

      await db
        .update(transaction_queue)
        .set({
          signature: signature,
          attempts: transaction.attempts + 1,
          last_attempted_at: sql`(unixepoch())`,
          serialised_transaction: bs58.encode(signedTx.serialize()),
          commitment_status: CommitmentStatus.Finalized,
        })
        .where(eq(transaction_queue.id, transaction.id));

      console.log(
        `Transaction ${transaction.id} sent successfully: ${signature}`
      );
      logger.info(
        `Transaction ${transaction.id} sent successfully: ${signature}`
      );
    } catch (error) {
      console.error(error);
      logger.error(error);
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
  const budgetIX = web3.ComputeBudgetProgram.setComputeUnitLimit({
    units: computeUnitLimit,
  });

  instructions.push(budgetIX);

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
