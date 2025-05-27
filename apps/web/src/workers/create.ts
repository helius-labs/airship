import * as airdropsender from 'helius-airship-core'
import * as web3 from '@solana/web3.js'
import { SQLocalDrizzle } from 'sqlocal/drizzle'
import { drizzle } from 'drizzle-orm/sqlite-proxy'
import { databaseFile } from 'helius-airship-core'
import { configureDatabase } from '@/lib/utils'

const { driver, batchDriver } = new SQLocalDrizzle({
  databasePath: databaseFile,
  verbose: false,
})

const db = drizzle(driver, batchDriver)

export async function create(signer: string, addresses: string[], amount: bigint, mintAddress: string) {
  await configureDatabase(db)

  await airdropsender.create({
    db,
    signer: new web3.PublicKey(signer),
    addresses: addresses.map((address) => new web3.PublicKey(address)),
    amount,
    mintAddress: new web3.PublicKey(mintAddress),
  })
}

// Function to handle variable amounts properly
export async function createVariableAmounts(
  signer: string,
  recipientAmounts: Array<{ address: string; amount: bigint }>,
  mintAddress: string
) {
  await configureDatabase(db)

  console.log(`Creating variable amount airdrop for ${recipientAmounts.length} recipients`)

  if (recipientAmounts.length === 0) {
    throw new Error('No recipients provided')
  }

  // First call uses create() which clears the database
  const firstRecipient = recipientAmounts[0]
  console.log(`Creating first entry: ${firstRecipient.address} -> ${firstRecipient.amount.toString()}`)

  await airdropsender.create({
    db,
    signer: new web3.PublicKey(signer),
    addresses: [new web3.PublicKey(firstRecipient.address)],
    amount: firstRecipient.amount,
    mintAddress: new web3.PublicKey(mintAddress),
  })

  // Subsequent calls use createAppend() which doesn't clear the database
  for (let i = 1; i < recipientAmounts.length; i++) {
    const recipient = recipientAmounts[i]
    console.log(
      `Appending entry ${i + 1}/${recipientAmounts.length}: ${recipient.address} -> ${recipient.amount.toString()}`
    )

    // Use createAppend for subsequent entries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (airdropsender as any).createAppend({
      db,
      signer: new web3.PublicKey(signer),
      addresses: [new web3.PublicKey(recipient.address)],
      amount: recipient.amount,
      mintAddress: new web3.PublicKey(mintAddress),
    })
  }

  console.log(`Successfully created ${recipientAmounts.length} variable amount entries`)
}
