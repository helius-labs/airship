#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { select } from "@inquirer/prompts";
import ora from "ora";
import { getPackageInfo } from "./utils/get-package-info";

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

async function main() {
  const packageInfo = await getPackageInfo();

  const program = new Command()
    .name("airdrop")
    .description("Airdrop tokens using ZK Compression")
    .version(
      packageInfo.version || "1.0.0",
      "-v, --version",
      "display the version number"
    );

  program.action(async () => {
    const answer = await select({
      message: "To which network do you want to airdrop?",
      choices: [
        {
          name: "Mainnet-beta",
          value: "mainnet-beta",
        },
        {
          name: "Devnet",
          value: "devnet",
        },
      ],
    });

    const spinner = ora(`Connecting to ${answer}...`).start(); // Start the spinner

    setTimeout(() => {
      spinner.succeed(chalk.green("Done!"));
    }, 3000);
  });

  program.parse();
}

main();
