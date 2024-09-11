export interface AirdropSenderWorker {
  create: (
    keypairPublicKey: string,
    recipients: string[],
    amount: bigint,
    tokenAddress: string
  ) => Promise<void>;
  send: (privateKey: string, rpcUrl: string) => void;
  poll: (rpcUrl: string) => void;
}
