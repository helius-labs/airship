import chalk from "chalk";
import ora from "ora";
import {
  AirdropError,
  AirdropErrorCode,
  csvToPublicKeys,
  logger,
} from "helius-airship-core";
import fs from "fs-extra";
import fileSelector from "inquirer-file-selector";
import { PublicKey } from "@solana/web3.js";

export async function csv(): Promise<PublicKey[]> {
  const csvPath = await fileSelector({
    message: "Select CSV to import:",
    hideNonMatch: true,
    match: (file) => file.name.endsWith(".csv"),
    allowCancel: true,
  }).catch((error) => {
    if (error.name === "ExitPromptError") {
      console.log(chalk.green("Exiting..."));
      process.exit(0);
    }
  });

  // Get the airdrop CSV file
  const spinner = ora(`Importing ${csvPath}`);

  logger.info(`Importing ${csvPath}`);

  // Import the CSV file and create the airdrop queue
  try {
    spinner.start(); // Start the spinner
    const csvFile = fs.readFileSync(csvPath!, "utf8");
    const addresses = csvToPublicKeys(csvFile);
    spinner.succeed(`Imported ${addresses.length} addresses`);
    return addresses;
  } catch (error) {
    if (error instanceof AirdropError) {
      switch (error.code) {
        case AirdropErrorCode.airdropNoAddresses:
          spinner.fail(chalk.red(error.message));
          break;
        case AirdropErrorCode.airdopAddressInvalid:
          spinner.fail(chalk.red(error.message));
          if (error.message.endsWith("on row 1")) {
            console.log(
              chalk.yellow(
                "Please make sure the CSV file has a",
                chalk.underline.bold.yellow("address"),
                "header row."
              )
            );
          }
          break;
        default:
          spinner.fail(chalk.red(error.message));
          break;
      }
    }
    process.exit(0);
  }
}
