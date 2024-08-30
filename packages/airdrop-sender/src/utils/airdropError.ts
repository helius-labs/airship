import { maxAddressesPerTransaction } from "../config/constants";

export enum AirdropErrorCode {
  airdropNoAddresses = 1,
  airdropCSVEmpty = 2,
  aidrdopCSVInvalid = 3,
  airdopAddressInvalid = 4,
  airdropMaxAddressesPerTransaction = 5,
  airdropInsufficientFunds = 6,
  airdropNothingToSend = 7,
}

export enum AirdropErrorMessage {
  airdropNoAddresses = "No addresses to airdrop to",
  airdropCSVEmpty = "CSV file is empty",
  aidrdopCSVInvalid = "CSV file is invalid",
  airdopAddressInvalid = "Address is invalid",
  airdropMaxAddressesPerTransaction = `Max addresses per transaction is ${maxAddressesPerTransaction}`,
  airdropInsufficientFunds = "Insufficient funds, please add funds to address",
  airdropNothingToSend = "Nothing to send",
}

export class AirdropError extends Error {
  public readonly code: AirdropErrorCode;

  constructor(message: string, code: AirdropErrorCode) {
    super(message);
    this.name = "AirdropError";
    this.code = code;
  }
}
