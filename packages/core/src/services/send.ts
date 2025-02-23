import * as web3 from "@solana/web3.js";
import { transaction_queue } from "../schema/transaction_queue";
import {
  CommitmentStatus,
  computeUnitLimit,
  computeUnitPrice,
  maxAddressesPerTransaction,
  maxAddressesPerInstruction,
  lookupTableAddressDevnet,
  lookupTableAddressMainnet,
} from "../config/constants";
import { desc, asc, sql, eq, count, isNull, or } from "drizzle-orm";
import { buildAndSignTx, buildTx, createRpc, pickRandomTreeAndQueue, Rpc } from "@lightprotocol/stateless.js";
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
import { SendTransactionError } from "@solana/web3.js";
import { sleep } from "../utils/common";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getToken } from "./getToken";
import { getPriorityFeeEstimate } from "./getPriorityFeeEstimate";

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
  
  const connection: Rpc = createRpc(url, url, undefined, {
    commitment: "confirmed",
  });

  const lookupTableAccountDevnet = (
    await connection.getAddressLookupTable(lookupTableAddressDevnet)
  ).value!;
  const lookupTableAccountMainnet = (
    await connection.getAddressLookupTable(lookupTableAddressMainnet)
  ).value!;
  const lookupTableAccount = lookupTableAccountMainnet || lookupTableAccountDevnet;

  // Get the mint address from the first transaction in the queue
  const firstTransaction = await db
    .select({ mint_address: transaction_queue.mint_address })
    .from(transaction_queue)
    .limit(1);

  const mintAddress = new web3.PublicKey(firstTransaction[0].mint_address);

  // Get the token type using the DAS API getAsset

  const token = await getToken({ mintAddress, url });
  if (!token) {
    logger.error(`Token not found for mint address: ${mintAddress.toBase58()}`);
    throw new Error(`Token not found for mint address: ${mintAddress.toBase58()}`);
  }

  const tokenProgramId = token.tokenType === "SPL" ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID;

  // Get or create the source token account for the mint address
  let sourceTokenAccount: splToken.Account;
  try {
    sourceTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      mintAddress,
      keypair.publicKey,
      undefined, 
      undefined,
      undefined,
      tokenProgramId
    );
  } catch (error) {
    logger.error("Source token account not found and failed to create it. Please add funds to your wallet and try again.");
    throw new Error("Source token account not found and failed to create it. Please add funds to your wallet and try again.");
  }

  // Create a token pool for the mint address if it doesn't exist
  try {
    await createTokenPool(connection, keypair, mintAddress, undefined, tokenProgramId);
    logger.info("Token pool created.");
  } catch (error: any) {
    if (error.message.includes("already in use")) {
      logger.info("Token pool already exists. Skipping...");
    } else {
      logger.error("Failed to create token pool:", error);
    }
  }

  while (true) {
    const shouldContinue = await processBatch(db, connection, keypair, lookupTableAccount, totalTransactionsToSend, sourceTokenAccount, mintAddress, tokenProgramId);
    if (!shouldContinue) {
      break;
    }

    await sleep(100);
  }
}

async function processBatch(
  db: any,
  connection: Rpc,
  keypair: web3.Keypair,
  lookupTableAccount: web3.AddressLookupTableAccount,
  totalTransactionsToSend: number,
  sourceTokenAccount: splToken.Account,
  mintAddress: web3.PublicKey,
  tokenProgramId: web3.PublicKey
): Promise<boolean> {
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
    return false;
  }

  // Fetch the airdrop queue
  const transactionQueue = await db
    .select({
      id: transaction_queue.id,
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
    )
    .limit(100);

  // No transaction to send. Wait for a second and try again
  if (transactionQueue.length === 0) {
    logger.info(
      "All transactions sent. Checking for possible retries in 5 seconds..."
    );
    await sleep(5000);
    return true;
  }

  const activeStateTrees = await connection.getCachedActiveStateTreeInfo();

  for (const transaction of transactionQueue) {
    try {
      const addresses = transaction.addresses.map(
        (address: any) => new web3.PublicKey(address)
      );

      const { tree } = pickRandomTreeAndQueue(activeStateTrees);

      const instructions = await createInstructions(
        keypair,
        mintAddress,
        sourceTokenAccount,
        addresses,
        transaction.amount,
        tokenProgramId,
        tree
      );

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();

      const tx = buildTx(
        instructions,
        keypair.publicKey,
        blockhash,
        [lookupTableAccount]
      );

      // Get the priority fee estimate
      const priorityFeeEstimate = await getPriorityFeeEstimate(connection.rpcEndpoint, "Low", tx);

      // Set the compute unit limit and add it to the transaction
      const unitPriceIX = web3.ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: priorityFeeEstimate ?? computeUnitPrice,
      });

      // Insert the unit price instruction at the second position in the instructions array
      instructions.splice(1, 0, unitPriceIX);

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
        if (error.logs?.includes("Program log: Error: insufficient funds") || error.message.includes("insufficient funds")) {
          logger.error(AirdropErrorMessage.airdropInsufficientFunds);
          throw new AirdropError(AirdropErrorMessage.airdropInsufficientFunds, AirdropErrorCode.airdropInsufficientFunds);
        }
        logger.error(error);
      } else {
        logger.error(error);
      }
    }
  }

  return true;
}

async function createInstructions(
  keypair: web3.Keypair,
  mintAddress: web3.PublicKey,
  sourceTokenAccount: splToken.Account,
  addresses: web3.PublicKey[],
  amount: bigint,
  tokenProgramId: web3.PublicKey,
  outputStateTree: web3.PublicKey
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

  // Create batches of 5 addresses per instruction to not go over the maximum cross-program invocation instruction size
  const batches = Math.ceil(addresses.length / maxAddressesPerInstruction);

  for (let i = 0; i < batches; i++) {
    const batch = addresses.slice(i * maxAddressesPerInstruction, (i + 1) * maxAddressesPerInstruction);

    // Compress tokens for each airdrop address and add it to the transaction
    const compressIx = await CompressedTokenProgram.compress({
      payer: keypair.publicKey, // The payer of the transaction.
      owner: keypair.publicKey, // owner of the *uncompressed* token account.
      source: sourceTokenAccount.address, // source (associated) token account address.
      toAddress: batch, // address to send the compressed tokens to.
      amount: batch.map(() => Number(amount)), // amount of tokens to compress.
      mint: mintAddress, // Mint address of the token to compress.
      tokenProgramId: tokenProgramId,
      outputStateTree: outputStateTree
    });
    instructions.push(compressIx);
  }

  return instructions;
}
