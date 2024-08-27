import chalk from "chalk";
import ora from "ora";
import { AirdropError, logger, send } from "@repo/airdrop-sender";
import * as web3 from "@solana/web3.js";

export async function resumeAirdrop(
  keypair: web3.Keypair,
  url: string,
  mintAddress: web3.PublicKey
) {
  try {
    console.log(chalk.green(`Resuming airdrop...`));
    logger.info(`Resuming airdrop...`);

    // Send the airdrop
    await send({
      keypair,
      url,
      mintAddress,
    });
  } catch (error) {
    if (error instanceof AirdropError) {
      console.error(chalk.red(error.message));
    } else {
      console.error(chalk.red("Sending airdrop failed", error));
    }
    process.exit(0);
  }
}
