#!/usr/bin/env node

import { Command } from "commander";
import { select } from "@inquirer/prompts";
import { getPackageInfo } from "./utils/get-package-info";
import { newAirdropFromCSV } from "./newAirdropFromCSV";
import chalk from "chalk";
import * as web3 from "@solana/web3.js";
import fs from "fs-extra";
import { logger } from "@repo/airdrop-sender";
import { resumeAirdrop } from "./resumeAirdrop";

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

async function main() {
  const packageInfo = await getPackageInfo();

  const program = new Command()
    .name("airdrop")
    .description("Airdrop tokens using ZK Compression")
    .option("-k, --keypair <KEYPAIR>", "Keypair to use for the airdrop")
    .option(
      "-u, --url <URL>",
      "URL for Solana's JSON RPC with ZK Compression support"
    )
    .version(
      packageInfo.version || "1.0.0",
      "-v, --version",
      "display the version number"
    );

  program.action(async () => {
    const options = program.opts();

    if (options.keypair === undefined) {
      console.log(
        chalk.red("Please provide a keypair using the --keypair option")
      );
      process.exit(0);
    }

    if (options.url === undefined) {
      console.log(chalk.red("Please provide a RPC url using the --url option"));
      process.exit(0);
    }

    // TODO validate url is valid and has ZK Compression support

    let keypair: web3.Keypair;

    try {
      const keypairFile = fs.readFileSync(options.keypair, "utf8");
      const keypairData = JSON.parse(keypairFile);
      keypair = web3.Keypair.fromSecretKey(Uint8Array.from(keypairData));

      console.log(
        chalk.green(
          `Keypair loaded with public key: ${keypair.publicKey.toBase58()}`
        )
      );
      logger.info(
        `Keypair loaded with public key: ${keypair.publicKey.toBase58()}`
      );
    } catch (error) {
      console.log(chalk.red("Invalid keypair file"));
      logger.error("Invalid keypair file");
      process.exit(0);
    }

    const answer = await select({
      message: "What do you want to do?",
      choices: [
        {
          name: "New Airdrop",
          value: "new_csv",
        },
        {
          name: "Resume Airdrop",
          value: "resume",
        },
        {
          name: "Exit",
          value: "exit",
        },
      ],
    });

    // TODO user should be able to select the mint address
    // And should be stored in case the user wants to resume the airdrop
    const mintAddress = new web3.PublicKey(
      "6wykp9AB9PHz6Y6iC7RgtU8zpQBqnaAN6m6maX9QrrvF"
    );

    switch (answer) {
      case "new_csv":
        await newAirdropFromCSV(keypair, options.url, mintAddress);
        break;
      case "resume":
        // TODO: resume airdrop
        await resumeAirdrop(keypair, options.url, mintAddress);
        break;
      case "exit":
        console.log(chalk.green("Exiting..."));
        process.exit(0);
    }
  });

  program.parse();
}

main();
