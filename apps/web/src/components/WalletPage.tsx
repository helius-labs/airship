import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export function WalletPage() {
  const { publicKey, connected } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (connected && publicKey) {
      // Fetch balance logic here
      // For example:
      // const connection = new Connection('https://api.mainnet-beta.solana.com');
      // connection.getBalance(publicKey).then(bal => setBalance(bal / LAMPORTS_PER_SOL));
    }
  }, [connected, publicKey]);

  return (
    <main className="flex flex-col items-center justify-top my-12 space-y-12">
      <img src="/airship-logo.svg" className="max-w-xl" alt="Airship Logo" />
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary">
            Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <WalletMultiButton className="!bg-primary hover:!bg-primary/90" />
          {connected && publicKey && (
            <div>
              <p>Connected: {publicKey.toBase58()}</p>
              {balance !== null && <p>Balance: {balance} SOL</p>}
            </div>
          )}
        </CardContent>
      </Card>
      <Link
        to="/"
        className="text-primary text-white shadow-lg hover:underline"
      >
        Back to Home
      </Link>
    </main>
  );
}