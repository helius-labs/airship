import * as web3 from "@solana/web3.js";
export const MICRO_LAMPORTS_PER_LAMPORT = 1_000_000;
export const maxAddressesPerTransaction = 15;
export const maxAddressesPerInstruction = 5;
export const baseFee = 5000;
// Compression fee per compress instruction is 1500 lamports
// In total we need 3 compress instructions per transaction to send 15 addresses
export const compressionFee = 1500 * 3;
export const computeUnitLimit = 550_000;
// Compute unit price is micro lamports
export const computeUnitPrice = 10_000;
export const lookupTableAddressDevnet = new web3.PublicKey(
  "qAJZMgnQJ8G6vA3WRcjD9Jan1wtKkaCFWLWskxJrR5V"
);
export const lookupTableAddressMainnet = new web3.PublicKey(
  "9NYFyEqPkyXUhkerbGHXUXkvb4qpzeEdHuGpgbgpH1NJ"
);
export const saga2PreOrderTokenMintAddress = new web3.PublicKey(
  "2DMMamkkxQ6zDMBtkFp8KH7FoWzBMBA1CGTYwom4QH6Z"
);

// https://docs.solanalabs.com/consensus/commitments
export enum CommitmentStatus {
  Undefined = 0,
  Processed = 1,
  Confirmed = 2,
  Finalized = 3,
}

// Constants
export const databaseFile = "airship.db";
export const TABLE_NAME = "transaction_queue";
export const SQLITE_MAX_VARIABLE_NUMBER = 999;

// ZK Compression Token 2022 supported extensions
export const supportedExtensions = {
  metadata_pointer: true,
  metadata: true,
  interest_bearing_config: true,
  group_pointer: true,
  group_member_pointer: true,
  token_group: true,
  token_group_member: true,
  transfer_hook: false,
  mint_close_authority: false,
  permanent_delegate: false,
  confidential_transfer_mint: false,
  confidential_transfer_account: false,
  confidential_transfer_fee_config: false,
  transfer_fee_config: false,
  default_account_state: false,
};

export const sampleTransaction = "U3kGVBYkdXgFn17Cc6gpCKTLYmoQvhDrXrTb32USShRLXmnwXCkK8sxcoLq62eDPZkBGXnJsXRUB3RcQTiyXMNLsZcbi8sid4bmGC1uDwhRe3xFB5vYDaFarnhsfhN2g4EfTE4stbEwfHd1p75VAgcNdaJQCvSHxMh3mWT1SrCXKpTbUEeJRmgnro4ia7YC7QzvXonMqYss1JT4oxQDwo67usFdnuQumUPMA6wTqkFuH5KBaKDs29YoMiaHHmQxp91yD7fggBW89MkdEm4D85udK6uamu5cPL324bKasURj3mMhJ5qgu6WmQAXGZPAAGBgVEwDWdNPGounRZSDTF5ZoXabKaDAWRmnEC689ajts5CrttTvWYBQKGVPStvEN9cqXndxQeTbxdsuq6Ss5vtULsMTckaHvxvmiVYf5Uvv6F9CXM2TMXaKxvptekLg75j77dFGAosVwYm9QiSj3wHmrsLSecw91FphvpbjdcLDRm6BFKAGjHjW8jCq31LGUHWskPjKgK9ZArG6NWkg4ZQmBXFQrWydcD9Q6mGDpaWb7RW9ZLHzTgyWpiZNazUmgyHhFcsZiMUMPNDTV2ADf7Jpau4sJsW7DYyRj4ZFDjR6DwvcKJfi97QpKa8gwJDXEEDDhJqNQ41aj7f8NaFUUGtFew1sZRM3v5NnJkPeoSDwyUcHHzYKPcawuiD65ksnA3NH5GUAHduiF9DyJ13nEkB8crdySXtdCmB9zzib6gsWfng25QbEDwZ4ezChGcsdWpHYpiTgBNBGst1b8kY1SKEWcyqTVrUo6eW9TBNqCogMeQ1zB5if7LaDQJ21zyMig8aChJ2uyzid6jnL2VP9NgMDR5A1jdmBe5sXY7cfT7HJuatwesao8LhbMCWwLRg8TuJWqM88pjbppaN72rztrDV3R1XkJoRCtup36CgUs9nCcjsHxVhn3tXVrBPupCEBpW8ehd4xa38c54jSyW93fhUtFUkJ27oDaJbVEaGgtG9Wrrx89GW1GCRKso51AVRtAZ5UCnvmhPVRd6T7gU6jLs5iML4X6YnUYWydQdFXmz34yzxvMRE2JGwmYsa4eZ5wEZbCmm1VidSnpsAr4roTLJd88QeZNTegVwcJ47kNHNRMkuUHzXgRp3Gv6A5V5nJdK9BRV5EABjvmJtQK6WnkHt4GKZrnypNuGqKSLmN9k7JkBD3H84hd8NebCKfbjjUB9c375mQuUdHeRCb2ei37FWp6UYppPb3sRTbxrsJbczKyMCNbSFyE41NCcEmZsgZzsPjJxTdY2v6vqM1fEwcKBUG2DthvaJUSSQ5FyCLoaNmceLVuuS3VFAkXapFhNn3rKkPEwMYzpWm8t51FKUg3U2hMVn9vYGTbFDqyxGhn2FQuVzBkWZsYFMFsPyjm1Ut8dHVREVWiAaQe6bAVSuVEZ9QfbRT5khccF31VfSdzH1zR2jcmZ1obKsEv37nGDZDBMDqT9mQv2WgrACjGdsHDjzyq9Uyk3kdxPzHBXukU4rMBzgPKM4vbeLAWjV5ZxcGyJv6EoEAJmBjA3V6SAVUbnWe1SuXFwPj1uUBMXDfRkHSu7DmqszUr2WZEMs9p95Tr56KmxsYDPatJnvC4bMDqwW42WkyQefXbF1ZPf3xYaWBLrcxibstfHtov"