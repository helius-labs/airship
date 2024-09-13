# Helius AirShip

## Overview

**Helius AirShip** is an open-source tool that makes token airdrops simple, affordable, and accessible. Whether you're distributing to Saga Chapter 2 holders, NFT/cNFT holders, SPL token holders, or using a CSV file, Helius AirShip streamlines the process and cuts costs.

## Key Features

### **Simplified Airdrops**

Designed for projects of all sizes, Helius AirShip's interface allows anyone—technical or not—to execute token airdrops with ease.

### **Cost-Effective with ZK Compression**

Reduce the high costs of large-scale airdrops with ZK Compression technology, which minimizes data usage and lowers expenses. More about ZK Compression [here](https://www.zkcompression.com/).

### **Two Versions Available**

- **Web Version**: User-friendly for smaller airdrops, handling up to 200,000 recipients.
- **CLI Version**: A command-line interface for advanced users, offering the scalability needed for larger distributions.

## Web Version

### Requirements

- You will need an RPC that supports both ZK Compression and the DAS API. If you don't have one, you can get one for free at https://www.helius.dev

### Public Web Version

You can find public web version of Helius AirShip [here](https://airship.helius.xyz).

### Run locally from source

```bash
git clone https://github.com/helius-labs/airship.git
cd airship
pnpm install
cd apps/web
pnpm preview
```

Open http://localhost:4173/

## CLI Version

### Requirements

- Ensure you have Node >= v20.9.0 installed on your machine.
- You will need an RPC that supports both ZK Compression and the DAS API. If you don't have one, you can get one for free at https://www.helius.dev
- You will need a valid Solana filesystem wallet. If you don't have one yet, visit the [Solana documentation](https://docs.solanalabs.com/cli/wallets/file-system) for details. The CLI will use this wallet for signing transactions, covering transaction fees, and as the owner of the token you wish to distribute.

### Installation

#### Using npm

```bash
npm install -g helius-airship
```

#### Build from source using pnpm

```bash
git clone https://github.com/helius-labs/airship.git
cd airship
pnpm install && pnpm build
cd packages/cli
pnpm link --global
helius-airship --help
```

### Usage

```bash
helius-airship --keypair my_airdrop_wallet.json --url https://devnet.helius-rpc.com/?api-key=<YOUR_API_KEY>
```
