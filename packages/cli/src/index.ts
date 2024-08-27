#!/usr/bin/env node

import { Command } from "commander";
import { select } from "@inquirer/prompts";
import { getPackageInfo } from "./utils/get-package-info";
import { newAirdropFromCSV } from "./newAirdropFromCSV";
import chalk from "chalk";

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
    const options = await select({
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

    switch (options) {
      case "new_csv":
        await newAirdropFromCSV();
        break;
      case "resume":
        // TODO: resume airdrop
        // await resumeAirdrop();
        console.log(chalk.red("Resume Airdrop not yet implemented"));
        process.exit(0);
        break;
      case "exit":
        console.log(chalk.green("Exiting..."));
        process.exit(0);
    }
  });

  program.parse();
}

main();
