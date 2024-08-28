import * as web3 from "@solana/web3.js";

export const maxAddressesPerTransaction = 4;
export const computeUnitLimit = 500_000;
// Compute unit price is micro lamports
export const computeUnitPrice = 10_000;
export const lookupTableAddress = new web3.PublicKey(
  "DA35UyyzGTonmEjsbw1VGRACpKxbKUPS2DvrG193QYHC"
);
export const saga2PreOrderTokenMintAddress = new web3.PublicKey(
  "2DMMamkkxQ6zDMBtkFp8KH7FoWzBMBA1CGTYwom4QH6Z"
);
