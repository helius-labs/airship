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
  send,
} from "@repo/airdrop-sender";
import * as web3 from "@solana/web3.js";
import fs from "fs-extra";
import fileSelector from "inquirer-file-selector";

export async function newAirdropFromCSV(
  keypair: web3.Keypair,
  url: string,
  mintAddress: web3.PublicKey
) {
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
  const spinner = ora(`Importing ${csvPath}`);

  logger.info(`Importing ${csvPath}`);

  // Import the CSV file and create the airdrop queue
  try {
    const csvFile = fs.readFileSync(csvPath, "utf8");
    const addresses = csvToPublicKeys(csvFile);

    spinner.start(); // Start the spinner

    // TODO: user should be able to select the amount
    await create({
      signer: keypair.publicKey,
      addresses: addresses,
      amount: BigInt(1e9),
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
    process.exit(0);
  }

  const spinner2 = ora(`Sending airdrop`);

  try {
    spinner2.start(); // Start the spinner

    // Send the airdrop
    await send({
      keypair,
      url,
      mintAddress,
    });
  } catch (error) {
    if (error instanceof AirdropError) {
      spinner2.fail(chalk.red(error.message));
    } else {
      spinner2.fail(chalk.red("Sending airdrop failed", error));
    }
    process.exit(0);
  }
}
