import chalk from "chalk";
import ora from "ora";
import { AirdropError, send } from "@repo/airdrop-sender";
import * as web3 from "@solana/web3.js";

export async function resumeAirdrop(
  keypair: web3.Keypair,
  url: string,
  mintAddress: web3.PublicKey
) {
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
