import Papa from "papaparse";
import * as web3 from "@solana/web3.js";
import { logger } from "../services/logger";
import {
  AirdropError,
  AirdropErrorCode,
  AirdropErrorMessage,
} from "./airdropError";
import { isSolanaAddress } from "./common";

interface Row {
  address: string;
}

export function csvToPublicKeys(csvFile: string): web3.PublicKey[] {
  if (csvFile.length === 0) {
    logger.info(AirdropErrorMessage.airdropCSVEmpty);
    throw new AirdropError(
      AirdropErrorMessage.airdropCSVEmpty,
      AirdropErrorCode.airdropCSVEmpty
    );
  }

  const parsedData = Papa.parse<Row>(csvFile, {
    header: true,
    dynamicTyping: true,
    delimiter: ",",
  });

  // Validate the airdrop data
  if (parsedData.errors.length > 0) {
    logger.error(JSON.stringify(parsedData.errors, null, 2));
    throw new AirdropError(
      AirdropErrorMessage.aidrdopCSVInvalid,
      AirdropErrorCode.aidrdopCSVInvalid
    );
  }

  // Validate the addresses
  for (const [index, row] of parsedData.data.entries()) {
    if (!isSolanaAddress(row.address)) {
      logger.error(`Invalid address: ${row.address} on row ${index + 1}`);
      throw new AirdropError(
        `Invalid address: ${row.address} on row ${index + 1}`,
        AirdropErrorCode.airdopAddressInvalid
      );
    }
  }

  return parsedData.data.map((row) => new web3.PublicKey(row.address));
}
