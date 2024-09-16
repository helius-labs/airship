import chalk from "chalk";
import ora from "ora";
import {
  getCollectionHolders,
  isNFTCollection,
  isSolanaAddress,
  logger,
} from "helius-airship-core";
import { PublicKey } from "@solana/web3.js";
import { input } from "@inquirer/prompts";
import * as web3 from "@solana/web3.js";

export async function nft(url: string): Promise<PublicKey[]> {
  const collectionAddress = await input({
    message: "Enter a collection address",
    required: true,
    validate: async (value) => {
      if (!isSolanaAddress(value)) {
        return "Please enter a valid address";
      }

      if (
        !(await isNFTCollection({
          url: url,
          collectionAddress: new web3.PublicKey(value),
        }))
      ) {
        return "Collection not found please check the address";
      }

      return true;
    },
  });

  const spinner = ora("Fetching collection holders").start();

  try {
    spinner.start();

    const collectionHolders = await getCollectionHolders({
      url: url,
      collectionAddress: new web3.PublicKey(collectionAddress),
    });

    const addresses = collectionHolders.map((collectionHolder) => {
      return collectionHolder.owner;
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
