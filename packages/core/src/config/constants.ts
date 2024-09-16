import * as web3 from "@solana/web3.js";

export const maxAddressesPerTransaction = 15;

export const baseFee = 5000;
export const compressionFee = 300;
export const computeUnitLimit = 500_000;
// Compute unit price is micro lamports
export const computeUnitPrice = 10_000;
export const lookupTableAddress = new web3.PublicKey(
  "qAJZMgnQJ8G6vA3WRcjD9Jan1wtKkaCFWLWskxJrR5V"
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
