export interface ComlinkWorker {
  create: (
    keypairPublicKey: string,
    recipients: string[],
    amount: bigint,
    tokenAddress: string
  ) => Promise<void>;
}
