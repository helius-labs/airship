import chalk from "chalk";
import ora from "ora";
import {
  getTokenAccounts,
  logger,
  saga2PreOrderTokenMintAddress,
} from "helius-airship-core";
import { PublicKey } from "@solana/web3.js";

export async function chapter2(url: string): Promise<PublicKey[]> {
  const spinner = ora("Fetching Chapter 2 Preorder Token holders");

  try {
    spinner.start();
    const tokenAccounts = await getTokenAccounts({
      url: url,
      tokenMintAddress: saga2PreOrderTokenMintAddress,
    });

    const addresses = tokenAccounts.map((tokenAccount) => {
      return tokenAccount.owner;
    });

    // TODO save addresses to CSV using Papa.unparse for easy re-import

    spinner.succeed(`Fetched ${chalk.blue(addresses.length)} holders`);

    return addresses;
  } catch (error) {
    spinner.fail(`Failed to fetch holders: ${error}`);
    logger.error(`Failed to fetch holders: ${error}`);
    process.exit(0);
  }
}
