#!/usr/bin/env node --disable-warning=DeprecationWarning
import { Command } from "commander";
import { number, select, confirm, input } from "@inquirer/prompts";
import * as cliProgress from "cli-progress";
import chalk from "chalk";
import * as web3 from "@solana/web3.js";
import fs from "fs-extra";
import Table from "cli-table3";
import {
  status,
  logger,
  getTokensByOwner,
  exist,
  AirdropError,
  sleep,
  baseFee,
  compressionFee,
  maxAddressesPerTransaction,
  computeUnitPrice,
  computeUnitLimit,
  normalizeTokenAmount,
  Token,
  init,
  databaseFile,
  MICRO_LAMPORTS_PER_LAMPORT,
} from "helius-airship-core";
import ora, { Ora } from "ora";
import { csv } from "./imports/csv";
import { chapter2 } from "./imports/chapter-2";
import { nft } from "./imports/nft";
import { splToken } from "./imports/spl-token";
import Tinypool from "tinypool";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { MessageChannel } from 'node:worker_threads'
import { version } from "../package.json"; // Import version from package.json

process.on("SIGINT", exitProgram);
process.on("SIGTERM", exitProgram);

const pool = new Tinypool({
  filename: new URL("./worker.js", import.meta.url).href,
});

// Load the database
const sqlite = new Database(databaseFile);
sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA synchronous = normal;");

const db = drizzle(sqlite);

async function main() {
  const program = createCommandProgram();

  program.action(async () => {
    const options = program.opts();
    validateOptions(options);

    const keypair = loadKeypair(options.keypair);

    // Initialize the database
    await init({ db });

    const action = await selectAction();

    switch (action) {
      case "new":
        await handleNewAirdrop(keypair, options);
        break;
      case "resume":
        await resumeAirdrop(keypair, options.url);
        break;
      case "exit":
        exitProgram();
    }
  });

  program.parse();
}

function createCommandProgram() {
  return new Command()
    .name("airdrop")
    .description("Airdrop tokens using ZK Compression")
    .option("-k, --keypair <KEYPAIR>", "Keypair to use for the airdrop")
    .option(
      "-u, --url <URL>",
      "URL for Solana's JSON RPC with ZK Compression support"
    )
    .version(
      version, // Use the imported version
      "-v, --version",
      "display the version number"
    );
}

function validateOptions(options: any) {
  if (!options.keypair) {
    console.log(
      chalk.red("Please provide a keypair using the --keypair option")
    );
    process.exit(0);
  }
  if (!options.url) {
    console.log(chalk.red("Please provide a RPC url using the --url option"));
    process.exit(0);
  }
}

function loadKeypair(keypairPath: string): web3.Keypair {
  try {
    const keypairFile = fs.readFileSync(keypairPath, "utf8");
    const keypairData = JSON.parse(keypairFile);
    const keypair = web3.Keypair.fromSecretKey(Uint8Array.from(keypairData));
    console.log(
      `🔑 Keypair loaded with public key: ${keypair.publicKey.toBase58()}`
    );
    logger.info(
      `🔑 Keypair loaded with public key: ${keypair.publicKey.toBase58()}`
    );
    return keypair;
  } catch (error) {
    console.log(chalk.red("Invalid keypair file"));
    logger.error("Invalid keypair file");
    process.exit(0);
  }
}

async function selectAction() {
  const airdropExists = await exist({ db });
  const choices = [
    { name: "Create a new airdrop", value: "new" },
    { name: "Exit", value: "exit" },
  ];

  if (airdropExists) {
    choices.splice(1, 0, { name: "Resume the last airdrop", value: "resume" });
  }

  return await select({
    message: "What would you like to do?",
    choices: choices,
  }).catch(handleExitError);
}

async function handleNewAirdrop(keypair: web3.Keypair, options: any) {
  await checkAndConfirmOverwrite();
  const tokens = await loadTokens(keypair, options.url);
  const mintAddress = await selectToken(keypair, tokens);
  const addresses = await selectRecipients(options.url);
  const amount = await selectAmount(tokens, mintAddress, addresses.length);
  await confirmAirdrop(
    options.url,
    keypair,
    mintAddress,
    addresses,
    amount,
    tokens
  );
  await createAirdropQueue(keypair, mintAddress, addresses, amount);
  await startAndMonitorAirdrop(keypair, options.url);
}

async function checkAndConfirmOverwrite() {
  const exists = await exist({ db });
  if (exists) {
    const overwrite = await confirm({
      message:
        "A previous airdrop already exists. Are you sure you want to overwrite it?",
      default: false,
    }).catch(handleExitError);
    if (!overwrite) {
      exitProgram();
    }
  }
}

async function loadTokens(keypair: web3.Keypair, url: string) {
  const tokensSpinner = ora("Loading tokens owned by the keypair").start();
  const tokens = await getTokensByOwner({
    ownerAddress: keypair.publicKey,
    url: url,
  });
  tokensSpinner.succeed("Loading tokens owned by the keypair");
  return tokens;
}

async function selectToken(keypair: web3.Keypair, tokens: any[]) {
  const tokenChoices = tokens.map((token) => ({
    name:
      token.name && token.symbol
        ? `${token.name} (${token.tokenType}):  ${normalizeTokenAmount(token.amount, token.decimals).toLocaleString("en-US", { maximumFractionDigits: token.decimals })} ${token.symbol}`
        : `${token.mintAddress.toBase58()} (${token.tokenType}): ${normalizeTokenAmount(token.amount, token.decimals).toLocaleString("en-US", { maximumFractionDigits: token.decimals })}`,
    value: token.mintAddress.toBase58(),
  }));

  if (tokenChoices.length === 0) {
    console.log(
      chalk.red(
        `No Tokens found. Please transfer or mint Tokens to ${keypair.publicKey.toBase58()}`
      )
    );
    process.exit(0);
  }

  tokenChoices.push({ name: "Exit", value: "exit" });

  const mintAddress = await select({
    message: "Which token do you want to airdrop?",
    choices: tokenChoices,
  }).catch(handleExitError);

  if (mintAddress === "exit") {
    exitProgram();
  }

  return mintAddress;
}

async function selectRecipients(url: string) {
  const importChoice = await select({
    message: "Who would you like the airdrop to be sent to?",
    choices: [
      {
        name: "Solana Mobile - Chapter 2 Preorder Token holders",
        value: "chapter-2",
      },
      { name: "NFT/cNFT collection holders", value: "nft" },
      { name: "SPL token holders", value: "spl-token" },
      { name: "Import from CSV", value: "csv" },
      { name: "Exit", value: "exit" },
    ],
  }).catch(handleExitError);

  if (importChoice === "exit") {
    exitProgram();
  }

  let addresses: web3.PublicKey[] = [];
  switch (importChoice) {
    case "chapter-2":
      addresses = await chapter2(url);
      break;
    case "nft":
      addresses = await nft(url);
      break;
    case "spl-token":
      addresses = await splToken(url);
      break;
    case "csv":
      addresses = await csv();
      break;
  }

  if (addresses.length === 0) {
    console.error(chalk.red("No addresses found"));
    logger.error("No addresses found");
    process.exit(0);
  }

  return addresses;
}

async function selectAmount(
  tokens: any[],
  mintAddress: string,
  totalAddresses: number
) {
  const amountChoice = await select({
    message: "What amount would you like to airdrop?",
    choices: [
      { name: "Fixed token amount per address", value: "fixed" },
      { name: "% of total available tokens", value: "percent" },
      { name: "Exit", value: "exit" },
    ],
  }).catch(handleExitError);

  if (amountChoice === "exit") {
    exitProgram();
  }

  const token = tokens.find((t) => t.mintAddress.toBase58() === mintAddress);

  let amount: bigint = BigInt(0);
  switch (amountChoice) {
    case "fixed":
      amount = await getFixedAmount(token);
      break;
    case "percent":
      amount = await getPercentAmount(token, totalAddresses);
      break;
    default:
      exitProgram();
  }

  return amount;
}

async function getFixedAmount(token: any) {
  const fixed = await input({
    message: "How much tokens would you like to airdrop per address?",
    required: true,
    validate: (value) => validateFixedAmount(value, token),
  }).catch(handleExitError);

  return BigInt(Number.parseFloat(fixed!) * 10 ** token.decimals);
}

function validateFixedAmount(value: string, token: any) {
  if (
    Number.isNaN(Number.parseFloat(value)) ||
    !Number.isFinite(Number.parseFloat(value))
  ) {
    return "Please enter a valid amount";
  }

  if (Number.parseFloat(value) < normalizeTokenAmount(1, token.decimals)) {
    return `Amount must be greater than ${normalizeTokenAmount(1, token.decimals)}`;
  }

  return true;
}

async function getPercentAmount(token: any, totalAddresses: number) {
  const percent = await number({
    message: "How much percent would you like to airdrop?",
    required: true,
    step: 1,
    min: 1,
    max: 100,
  }).catch(handleExitError);

  return (
    (BigInt(token.amount) * BigInt(percent!)) /
    BigInt(100) /
    BigInt(totalAddresses)
  );
}

async function confirmAirdrop(
  url: string,
  keypair: web3.Keypair,
  mintAddress: string,
  addresses: web3.PublicKey[],
  amount: bigint,
  tokens: Token[]
) {
  const numberOfTransactions = BigInt(
    Math.ceil(addresses.length / Number(maxAddressesPerTransaction))
  );

  const transactionFee =
    BigInt(baseFee) +
    ((BigInt(computeUnitLimit) * BigInt(computeUnitPrice)) / BigInt(MICRO_LAMPORTS_PER_LAMPORT));

  const token = tokens.find((token) => {
    return token.mintAddress.toBase58() === mintAddress;
  });

  const table = new Table({
    style: { compact: true, head: [], border: [] },
  });

  table.push(
    ["RPC URL", url],
    ["Keypair address", keypair.publicKey.toBase58()],
    ["Token", mintAddress],
    ["Total addresses", addresses.length],
    [
      "Amount per address",
      normalizeTokenAmount(amount.toString(), token!.decimals).toLocaleString(
        "en-US",
        { maximumFractionDigits: token!.decimals }
      ),
    ],
    [
      "Total amount",
      normalizeTokenAmount(
        (amount * BigInt(addresses.length)).toString(),
        token!.decimals
      ).toLocaleString("en-US", { maximumFractionDigits: token!.decimals }),
    ],
    ["Number of transactions", numberOfTransactions],
    [
      "Approximate transaction fee",
      `${(Number(numberOfTransactions * transactionFee) / 1e9).toFixed(9)} SOL`,
    ],
    [
      "Approximate compression fee",
      `${(Number(numberOfTransactions * BigInt(compressionFee)) / 1e9).toFixed(9)} SOL`,
    ]
  );

  console.log(table.toString());

  const confirmAirdrop = await confirm({
    message: `Are you sure you want to send the airdrop?`,
  }).catch(handleExitError);

  if (!confirmAirdrop) {
    exitProgram();
  }
}

async function createAirdropQueue(
  keypair: web3.Keypair,
  mintAddress: string,
  addresses: web3.PublicKey[],
  amount: bigint
) {
  const createSpinner = ora("Creating transaction queue").start();
  try {
    await pool.run(
      {
        signer: keypair.publicKey.toBase58(),
        addresses: addresses.map((address) => address.toBase58()),
        amount: amount,
        mintAddress: mintAddress,
      },
      { name: "create" }
    );
    createSpinner.succeed("Transaction queue created");
  } catch (error) {
    createSpinner.fail("Failed to create transaction queue");
    logger.error("Failed to create transaction queue", error);
    process.exit(0);
  }
}

async function resumeAirdrop(keypair: web3.Keypair, url: string) {
  console.log(chalk.green(`Resuming airdrop...`));
  await startAndMonitorAirdrop(keypair, url);
}

async function startAndMonitorAirdrop(keypair: web3.Keypair, url: string) {
  const startSpinner = ora("Starting airdrop");
  try {
    startSpinner.start();

    // Worker to send transactions
    const mcSend = new MessageChannel();

    pool.run({ secretKey: keypair.secretKey, url: url, port: mcSend.port1 }, {
      name: "send",
      transferList: [mcSend.port1],
    });

    mcSend.port2.on('message', (message: any) => {
      if (message.error) {
        handleAirdropError(startSpinner, new Error(message.error));
      }
    });

    // Worker to poll for transaction confirmations
    const mcPoll = new MessageChannel();

    pool.run({ url, port: mcPoll.port1 }, {
      name: "poll",
      transferList: [mcPoll.port1],
    });

    mcPoll.port2.on('message', (message: any) => {
      if (message.error) {
        handleAirdropError(startSpinner, new Error(message.error));
      }
    });

    startSpinner.succeed("Airdrop started");
  } catch (error) {
    handleAirdropError(startSpinner, error);
  }

  const multibar = createProgressBars();
  await monitorAirdropProgress(multibar);
}

function createProgressBars() {
  return new cliProgress.MultiBar(
    {
      clearOnComplete: false,
      hideCursor: true,
      autopadding: true,
      format: "{type} | {bar} {percentage}% | {value}/{total}",
    },
    cliProgress.Presets.shades_classic
  );
}

async function monitorAirdropProgress(multibar: cliProgress.MultiBar) {
  const airdropStatus = await status({ db });
  const b1 = multibar.create(airdropStatus.total, airdropStatus.sent, {
    type: "Transactions sent     ",
  });
  const b2 = multibar.create(airdropStatus.total, airdropStatus.finalized, {
    type: "Transactions confirmed",
  });

  while (true) {
    const currentStatus = await status({ db });
    b1.update(currentStatus.sent);
    b2.update(currentStatus.finalized);

    if (currentStatus.finalized === currentStatus.total) {
      multibar.stop();
      console.log(chalk.green("🥳 Airdrop completed!"));
      logger.info("🥳 Airdrop completed!");
      process.exit(0);
    }

    await sleep(1000);
  }
}

function handleAirdropError(spinner: Ora, error: any) {
  spinner.fail("Failed to start airdrop");
  if (error instanceof AirdropError) {
    console.error(chalk.red(error.message));
  } else {
    console.error(chalk.red(error));
  }
  process.exit(0);
}

function handleExitError(error: any) {
  if (error.name === "ExitPromptError") {
    exitProgram();
  }
}

function exitProgram() {
  console.log(chalk.green("\nExiting..."));
  process.exit(0);
}

main();
