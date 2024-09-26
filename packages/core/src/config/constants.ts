import * as web3 from "@solana/web3.js";
export const MICRO_LAMPORTS_PER_LAMPORT = 1_000_000;
export const maxAddressesPerTransaction = 15;
export const maxAddressesPerInstruction = 5;
export const baseFee = 5000;
// Compression fee per compress instruction is 1500 lamports
// In total we need 3 compress instructions per transaction to send 15 addresses
export const compressionFee = 1500 * 3;
export const computeUnitLimit = 550_000;
// Compute unit price is micro lamports
export const computeUnitPrice = 10_000;
export const lookupTableAddressDevnet = new web3.PublicKey(
  "qAJZMgnQJ8G6vA3WRcjD9Jan1wtKkaCFWLWskxJrR5V"
);
export const lookupTableAddressMainnet = new web3.PublicKey(
  "9NYFyEqPkyXUhkerbGHXUXkvb4qpzeEdHuGpgbgpH1NJ"
);
export const saga2PreOrderTokenMintAddress = new web3.PublicKey(
  "2DMMamkkxQ6zDMBtkFp8KH7FoWzBMBA1CGTYwom4QH6Z"
);

// https://docs.solanalabs.com/consensus/commitments
export enum CommitmentStatus {
  Undefined = 0,
  Processed = 1,
  Confirmed = 2,
  Finalized = 3,
}

// Constants
export const databaseFile = "airship.db";
export const TABLE_NAME = "transaction_queue";
export const SQLITE_MAX_VARIABLE_NUMBER = 999;
