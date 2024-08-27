import { maxAddressesPerTransaction } from "./constants";

export enum AirdropErrorCode {
  airdropNoAddresses = 1,
  airdropCSVEmpty = 2,
  aidrdopCSVInvalid = 3,
  airdopAddressInvalid = 4,
  airdropMaxAddressesPerTransaction = 5,
  airdropInsufficientFunds = 6,
}

export enum AirdropErrorMessage {
  airdropNoAddresses = "No addresses to airdrop to",
  airdropCSVEmpty = "CSV file is empty",
  aidrdopCSVInvalid = "CSV file is invalid",
  airdopAddressInvalid = "Address is invalid",
  airdropMaxAddressesPerTransaction = `Max addresses per transaction is ${maxAddressesPerTransaction}`,
  airdropInsufficientFunds = "Insufficient funds, please add funds to address",
}

export class AirdropError extends Error {
  public readonly code: AirdropErrorCode;

  constructor(message: string, code: AirdropErrorCode) {
    super(message);
    this.name = "AirdropError";
    this.code = code;
  }
}
