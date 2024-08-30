#!/usr/bin/env node

import { Command } from "commander";
import { number, select, confirm, input } from "@inquirer/prompts";
import { getPackageInfo } from "./utils/get-package-info";
import chalk from "chalk";
import * as web3 from "@solana/web3.js";
import fs from "fs-extra";
import {
  logger,
  getTokensByOwner,
  exist,
  create,
  AirdropError,
  send,
  saga2PreOrderTokenMintAddress,
  getTokenAccounts,
  maxAddressesPerTransaction,
  computeUnitPrice,
  computeUnitLimit,
  isSolanaAddress,
  isNFTCollection,
  getCollectionHolders,
  isFungibleToken,
  normalizeTokenAmount,
} from "@repo/airdrop-sender";
import { resumeAirdrop } from "./resumeAirdrop";
import ora from "ora";
import { csv } from "./csv";
import Table from "cli-table3";

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

    // region Keypair
    // TODO: validate url is valid and has ZK Compression support
    let keypair: web3.Keypair;

    try {
      const keypairFile = fs.readFileSync(options.keypair, "utf8");
      const keypairData = JSON.parse(keypairFile);
      keypair = web3.Keypair.fromSecretKey(Uint8Array.from(keypairData));

      console.log(
        `🔑 Keypair loaded with public key: ${keypair.publicKey.toBase58()}`
      );
      logger.info(
        `🔑 Keypair loaded with public key: ${keypair.publicKey.toBase58()}`
      );
    } catch (error) {
      console.log(chalk.red("Invalid keypair file"));
      logger.error("Invalid keypair file");
      process.exit(0);
    }
    // endregion

    // region Start
    const answer = await select({
      message: "What would you like to do?",
      choices: [
        {
          name: "Create a new airdrop",
          value: "new",
        },
        {
          name: "Resume the last airdrop",
          value: "resume",
        },
        {
          name: "Exit",
          value: "exit",
        },
      ],
    });
    // endregion

    switch (answer) {
      case "new":
        // region Overwrite
        const exists = await exist();
        if (exists) {
          const overwrite = await confirm({
            message:
              "A previous airdrop already exists. Are you sure you want to overwrite it?",
            default: false,
          });
          if (!overwrite) {
            console.log(chalk.green("Exiting..."));
            process.exit(0);
          }
        }
        // endregion

        // region Tokens
        const spinner = ora("Loading tokens owned by the keypair").start();

        const tokens = await getTokensByOwner({
          ownerAddress: keypair.publicKey,
          url: options.url,
        });

        spinner.succeed("Loading tokens owned by the keypair");

        // Create the choices for the user to select the token to airdrop
        const tokenChoices: {
          name: string;
          value: string;
        }[] = tokens.map((token) => {
          let name;
          if (token.name && token.symbol) {
            name = `${token.name}: ${token.amount / 10 ** token.decimals} ${token.symbol}`;
          } else {
            name = `${token.mintAddress.toBase58()}: ${token.amount / 10 ** token.decimals}`;
          }

          return {
            name: name,
            value: token.mintAddress.toBase58(),
          };
        });

        if (tokenChoices.length === 0) {
          console.log(
            chalk.red(
              `No tokens found. Please transfer or mint tokens to ${keypair.publicKey.toBase58()}`
            )
          );
          process.exit(0);
        }

        tokenChoices.push({
          name: "Exit",
          value: "exit",
        });

        const mintAddress = await select({
          message: "Which token do you want to airdrop?",
          choices: tokenChoices,
        });

        if (mintAddress === "exit") {
          console.log(chalk.green("Exiting..."));
          process.exit(0);
        }
        // endregion

        // region Send to
        const importChoice = await select({
          message: "Who would you like the airdrop to be sent to?",
          choices: [
            {
              name: "Solana Mobile - Chapter 2 Preorder Token holders",
              value: "chapter-2",
            },
            {
              name: "NFT/cNFT collection holders",
              value: "nft",
            },
            {
              name: "SPL token holders",
              value: "spl-token",
            },
            {
              name: "Import from CSV",
              value: "csv",
            },
            {
              name: "Exit",
              value: "exit",
            },
          ],
        });

        if (importChoice === "exit") {
          console.log(chalk.green("Exiting..."));
          process.exit(0);
        }

        let addresses: web3.PublicKey[] = [];

        switch (importChoice) {
          case "chapter-2":
            try {
              const spinner = ora(
                "Fetching Chapter 2 Preorder Token holders"
              ).start();
              const tokenAccounts = await getTokenAccounts({
                url: options.url,
                tokenMintAddress: saga2PreOrderTokenMintAddress,
              });

              addresses = tokenAccounts.map((tokenAccount) => {
                return tokenAccount.owner;
              });

              // TODO save addresses to CSV using Papa.unparse for easy re-import

              spinner.succeed(
                `Fetched ${chalk.blue(addresses.length)} holders`
              );
            } catch (error) {
              spinner.fail(`Failed to fetch holders: ${error}`);
              logger.error(`Failed to fetch holders: ${error}`);
              process.exit(0);
            }
            break;
          case "nft":
            const collectionAddress = await input({
              message: "Enter a collection address",
              required: true,
              validate: async (value) => {
                if (!isSolanaAddress(value)) {
                  return "Please enter a valid address";
                }

                if (
                  !(await isNFTCollection({
                    url: options.url,
                    collectionAddress: new web3.PublicKey(value),
                  }))
                ) {
                  return "Collection not found please check the address";
                }

                return true;
              },
            });

            try {
              const spinner = ora("Fetching collection holders").start();

              const collectionHolders = await getCollectionHolders({
                url: options.url,
                collectionAddress: new web3.PublicKey(collectionAddress),
              });

              addresses = collectionHolders.map((collectionHolder) => {
                return collectionHolder.owner;
              });

              // TODO save addresses to CSV using Papa.unparse for easy re-import

              spinner.succeed(
                `Fetched ${chalk.blue(addresses.length)} holders`
              );
            } catch (error) {
              spinner.fail(`Failed to fetch holders: ${error}`);
              logger.error(`Failed to fetch holders: ${error}`);
              process.exit(0);
            }
            break;
          case "spl-token":
            const tokenAddress = await input({
              message: "Enter a token address",
              required: true,
              validate: async (value) => {
                if (!isSolanaAddress(value)) {
                  return "Please enter a valid address";
                }
                if (
                  !(await isFungibleToken({
                    url: options.url,
                    tokenAddress: new web3.PublicKey(value),
                  }))
                ) {
                  return "Token not found please check the address";
                }

                return true;
              },
            });

            try {
              const spinner = ora("Fetching token holders").start();
              const tokenAccounts = await getTokenAccounts({
                url: options.url,
                tokenMintAddress: new web3.PublicKey(tokenAddress),
              });

              addresses = tokenAccounts.map((tokenAccount) => {
                return tokenAccount.owner;
              });

              // TODO save addresses to CSV using Papa.unparse for easy re-import

              spinner.succeed(
                `Fetched ${chalk.blue(addresses.length)} holders`
              );
            } catch (error) {
              spinner.fail(`Failed to fetch holders: ${error}`);
              logger.error(`Failed to fetch holders: ${error}`);
              process.exit(0);
            }
            break;
          case "csv":
            addresses = await csv();
            break;
        }
        // endregion

        if (addresses.length === 0) {
          console.error(chalk.red("No addresses found"));
          logger.error("No addresses found");
          process.exit(0);
        }

        // region Amount
        const amountChoice = await select({
          message: "What amount would you like to airdrop?",
          choices: [
            {
              name: "Fixed token amount per address",
              value: "fixed",
            },
            {
              name: `% of total available tokens`,
              value: "percent",
            },
            {
              name: "Exit",
              value: "exit",
            },
          ],
        });

        let amount: bigint = BigInt(0);
        const token = tokens.find((token) => {
          return token.mintAddress.toBase58() === mintAddress;
        });

        switch (amountChoice) {
          case "fixed":
            const fixed = await number({
              message: "How much tokens would you like to airdrop per address?",
              required: true,
              step: 0.1,
              min: 0.1,
            });

            // Calculate the amount in lamports
            amount =
              BigInt(fixed! * 10) * BigInt(10) ** BigInt(token!.decimals - 1);
            break;
          case "percent":
            const percent = await number({
              message: "How much percent would you like to airdrop?",
              required: true,
              step: 1,
              min: 1,
              max: 100,
            });

            // Calculate the amount in lamports
            amount =
              (BigInt(token!.amount) * BigInt(percent!)) /
              BigInt(100) /
              BigInt(addresses.length);
            break;
          case "exit":
            console.log(chalk.green("Exiting..."));
            process.exit(0);
            break;
        }
        // endregion

        // region Confirm

        const numberOfTransactions = Math.ceil(
          addresses.length / maxAddressesPerTransaction
        );

        // Transaction fee is in lamports
        const baseFee = 5000;
        const transactionFee =
          baseFee + (computeUnitLimit * computeUnitPrice) / 1e9;

        // Compression fee is in lamports
        // https://www.zkcompression.com/learn/core-concepts/limitations#state-cost-per-transaction
        const compressionFee = 300;

        // By default, headers will be red, and borders will be grey
        let table = new Table({
          style: {
            compact: true,
            head: [],
            border: [],
          },
        });

        table.push(["Network", "Devnet"]);
        table.push(["Keypair address", keypair.publicKey.toBase58()]);
        table.push(["Token", mintAddress]);
        table.push(["Total addresses", addresses.length]);
        table.push([
          "Amount per address",
          normalizeTokenAmount(amount.toString(), token!.decimals),
        ]);
        table.push([
          "Total amount",
          normalizeTokenAmount(
            (amount * BigInt(addresses.length)).toString(),
            token!.decimals
          ),
        ]);
        table.push(["Number of transaction", numberOfTransactions]);
        table.push([
          "Approximate transaction fee",
          `${(numberOfTransactions * transactionFee) / 1e9} SOL`,
        ]);
        table.push([
          "Approximate compression fee",
          `${(addresses.length * compressionFee) / 1e9} SOL`,
        ]);

        console.log(table.toString());

        const confirm_airdrop = await confirm({
          message: `Are you sure you want to send the airdrop?`,
        });

        if (!confirm_airdrop) {
          console.log(chalk.green("Exiting..."));
          process.exit(0);
        }
        // endregion

        // region Create
        try {
          const spinner = ora("Creating transaction queue").start();

          await create({
            signer: keypair.publicKey,
            addresses: addresses,
            amount: amount,
            mintAddress: new web3.PublicKey(mintAddress),
          });

          spinner.succeed("Transaction queue created");
        } catch (error) {
          spinner.fail("Failed to create transaction queue");
          logger.error("Failed to create transaction queue", error);
          process.exit(0);
        }
        // endregion

        // region Send
        try {
          // Send the airdrop
          await send({
            keypair: keypair,
            url: options.url,
          });
        } catch (error) {
          if (error instanceof AirdropError) {
            console.error(chalk.red(error.message));
          } else {
            console.error(chalk.red("Sending airdrop failed", error));
          }
          process.exit(0);
        }
        // endregion

        break;
      case "resume":
        // region Resume
        await resumeAirdrop(keypair, options.url);
        break;
      // endregion
      case "exit":
        console.log(chalk.green("Exiting..."));
        process.exit(0);
    }
  });

  program.parse();
}

main();
