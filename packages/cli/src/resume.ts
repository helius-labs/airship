import chalk from "chalk";
import { AirdropError, logger, send } from "@repo/airdrop-sender";
import * as web3 from "@solana/web3.js";

export async function resume(keypair: web3.Keypair, url: string) {
  try {
    console.log(chalk.green(`Resuming airdrop...`));
    logger.info(`Resuming airdrop...`);

    // Send the airdrop
    await send({
      keypair,
      url,
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
