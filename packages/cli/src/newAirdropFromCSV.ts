import chalk from "chalk";
import { confirm } from "@inquirer/prompts";
import ora from "ora";
import {
  AirdropError,
  AirdropErrorCode,
  create,
  csvToPublicKeys,
  exist,
  logger,
} from "@repo/airdrop-sender";
import * as web3 from "@solana/web3.js";
import bs58 from "bs58";
import fs from "fs-extra";
import fileSelector from "inquirer-file-selector";

export async function newAirdropFromCSV() {
  // Check if the airdrop already exists
  const exists = await exist();
  if (exists) {
    const overwrite = await confirm({
      message: "An airdrop already exists. Do you want to overwrite it?",
      default: false,
    });
    if (!overwrite) {
      console.log(chalk.green("Exiting..."));
      process.exit(0);
    }
  }

  const csvPath = await fileSelector({
    message: "Select CSV to import:",
    hideNonMatch: true,
    match: (file) => file.name.endsWith(".csv"),
    allowCancel: true,
  });

  // Get the airdrop CSV file
  const spinner = ora(`Importing ${csvPath}`); // Start the spinner

  logger.info(`Importing ${csvPath}`);

  try {
    const csvFile = fs.readFileSync(csvPath, "utf8");
    const addresses = csvToPublicKeys(csvFile);

    // Get the keypair
    const keypair = web3.Keypair.fromSecretKey(
      bs58.decode(
        "Liqy5qwycJmYChMr7BhGhxpyvJ1Zkyjjw3fqtkPdoqJ9ZmV7713Lau11rCuyFWFr3GQ3xeHrCk5Z6Ju2hpHZDLe"
      )
    );

    spinner.start(); // Start the spinner

    await create({
      signer: keypair.publicKey,
      addresses: addresses,
      amount: BigInt(1),
    });

    spinner.succeed(chalk.green("Import successful!"));
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
  }
}
