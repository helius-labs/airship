import chalk from "chalk";
import ora from "ora";
import {
  getTokenAccounts,
  isFungibleToken,
  isSolanaAddress,
  logger,
} from "helius-airship-core";
import { input } from "@inquirer/prompts";
import * as web3 from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";

export async function splToken(url: string): Promise<PublicKey[]> {
  const tokenAddress = await input({
    message: "Enter a token address",
    required: true,
    validate: async (value) => {
      if (!isSolanaAddress(value)) {
        return "Please enter a valid address";
      }
      if (
        !(await isFungibleToken({
          url: url,
          tokenAddress: new web3.PublicKey(value),
        }))
      ) {
        return "Token not found please check the address";
      }

      return true;
    },
  });

  const spinner = ora("Fetching token holders");

  try {
    spinner.start();

    const tokenAccounts = await getTokenAccounts({
      url: url,
      tokenMintAddress: new web3.PublicKey(tokenAddress),
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
