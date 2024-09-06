import { create, exist } from "@repo/airdrop-sender";
import { PublicKey } from "@solana/web3.js";

export function expensiveCalculation(a: number, b: number): number {
  // SUPER EXPENSIVE COMPUTATION CODE HERE...
  return a + b + 1 + a + b + b + a * 2;
}

export async function test() {
  const addresses = [
    "5vG9YKEveZDwBpP3RFRHEtyp6qDtCLK8whPyVKs29Xys",
    "D7eVaBTZr5mPRiXsNNiQvF7hzF79XvPQTaeuZqXNk6JT",
    "5N3DF3UGHoMFiL4jqMDW5fZr65n42yNazRbRYXC12rBn",
    "8R4mA4QtzmZHUAE6uWHndtmDy2uUHLjzKwMP1oHUWX2s",
    "2pH2kQ15L14qiT6CHBxKY9pDpnZyNtot5LPwK3jgV3Fk",
    "CNMKK1jL35Jdn8WGDEBztkrsfJfHgQLzK84SX5zYm5xq",
    "D7rYj5MjAfmRyrBcPoZaDzKYdrGTqQhkD5ZG1BjJLgsV",
    "76r1P1wXpsTsVofWJDsHxpbwsu6t5jyJuKtLrR21J191",
    "FXMWExAG74xyKmhqJ4JAdmMV5pHbNbiX86CecMRYWpaw",
    "3bezrGz4AJaey7tU5cAePDWaN2U7N8KCZRiUPgAF8yN4",
    "aXbfXL36maaoSdZLQoVMYx5WCUJEq9LuzN91DuzL56j",
    "CVswqWcfPGLBpw3ya8P5uRgU42wz3b2tGFo9DZaNELBq",
    "FnayH7jpcKJthuJ6HLL4CCtwMCai851wbiP8R7DV5U8T",
  ];

  await create({
    addresses: addresses.map((address) => new PublicKey(address)),
    amount: 1000000n,
    mintAddress: new PublicKey("5vG9YKEveZDwBpP3RFRHEtyp6qDtCLK8whPyVKs29Xys"),
    signer: new PublicKey("5vG9YKEveZDwBpP3RFRHEtyp6qDtCLK8whPyVKs29Xys"),
    worker: false,
  });

  if (await exist()) {
    return "yes!";
  } else {
    return "nah";
  }
}
