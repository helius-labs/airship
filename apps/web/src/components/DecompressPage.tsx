import { ReactNode, useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from './ui/wallet-multi-button';
import { bn, buildTx, createRpc, ParsedTokenAccount, Rpc, sendAndConfirmTx } from '@lightprotocol/stateless.js';
import { CompressedTokenProgram, selectMinCompressedTokenAccountsForTransfer } from '@lightprotocol/compressed-token';
import { Button } from './ui/button';
import { computeUnitLimit, computeUnitPrice, normalizeTokenAmount } from 'helius-airship-core';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import { ComputeBudgetProgram, TransactionInstruction } from '@solana/web3.js';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Link } from 'react-router-dom';
import { Header } from './Header';

// Add this enum at the top of your file, outside the component
enum DialogState {
  Idle,
  ConfirmingTransaction,
  Processing,
  Success,
  Error
}

const connection: Rpc = createRpc(import.meta.env.VITE_RPC_ENDPOINT, import.meta.env.VITE_RPC_ENDPOINT);

export function DecompressPage() {
  const { publicKey, connected, signTransaction } = useWallet();
  const [compressedTokenAccounts, setCompressedTokenAccounts] = useState<ParsedTokenAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false); // New state for loading
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [alertDialogContent, setAlertDialogContent] = useState<{ title: string; message: string | ReactNode }>({ title: '', message: '' });
  const [dialogState, setDialogState] = useState<DialogState>(DialogState.Idle);

  useEffect(() => {
    const fetchData = async () => {
      if (connected && publicKey) {
        setIsLoading(true); // Set loading to true when fetching starts
        try {
          const accounts = await connection.getCompressedTokenAccountsByOwner(publicKey);
          setCompressedTokenAccounts(accounts.items);
        } catch (error) {
          console.error("Error fetching compressed tokens:", error);
          // TODO: Add user-friendly error handling
        } finally {
          setIsLoading(false); // Set loading to false when fetching ends
        }
      }
    };

    fetchData();
  }, [connected, publicKey]);

  const handleDecompress = async (inputCompressedTokenAccount: ParsedTokenAccount) => {
    try {
      if (!publicKey || !signTransaction) throw new WalletNotConnectedError();

      const mint = inputCompressedTokenAccount.parsed.mint;
      const amount = inputCompressedTokenAccount.parsed.amount;

      setAlertDialogOpen(true);
      setDialogState(DialogState.ConfirmingTransaction);
      setAlertDialogContent({
        title: 'Confirm Transaction',
        message: 'Please confirm the transaction in your wallet...'
      });

      // Set the compute unit limit and add it to the transaction
      const unitLimitIX = ComputeBudgetProgram.setComputeUnitLimit({
        units: computeUnitLimit,
      });

      const instructions: TransactionInstruction[] = [unitLimitIX];

      // Set the compute unit limit and add it to the transaction
      const unitPriceIX = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: computeUnitPrice,
      });

      instructions.push(unitPriceIX);

      // Calculate ATA
      const ata = await getAssociatedTokenAddress(
        mint,
        publicKey,
      );

      // Check if the ATA exists
      const ataInfo = await connection.getAccountInfo(ata);
      const ataExists = ataInfo !== null;

      if (!ataExists) {
        // Create an associated token account if it doesn't exist
        const createAtaInstruction = await createAssociatedTokenAccountInstruction(
          publicKey,
          ata,
          publicKey,
          mint,
        );

        instructions.push(createAtaInstruction);
      }

      // Fetch the latest compressed token account state
      const compressedTokenAccounts =
        await connection.getCompressedTokenAccountsByOwner(publicKey, {
          mint,
        });

      // Select accounts to transfer from based on the transfer amount
      const [inputAccounts] = selectMinCompressedTokenAccountsForTransfer(
        compressedTokenAccounts.items,
        amount,
      );

      // Fetch recent validity proof
      const proof = await connection.getValidityProof(
        inputAccounts.map(account => bn(account.compressedAccount.hash)),
      );

      // Create the decompress instruction
      const decompressInstruction = await CompressedTokenProgram.decompress({
        payer: publicKey,
        inputCompressedTokenAccounts: inputAccounts,
        toAddress: ata,
        amount,
        recentInputStateRootIndices: proof.rootIndices,
        recentValidityProof: proof.compressedProof,
      });

      instructions.push(decompressInstruction);

      const {
        value: blockhashCtx,
      } = await connection.getLatestBlockhashAndContext();

      const tx = buildTx(
        instructions,
        publicKey,
        blockhashCtx.blockhash,
      );

      const signedTx = await signTransaction(tx);

      setDialogState(DialogState.Processing);
      setAlertDialogContent({
        title: 'Confirming Transaction',
        message: (
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Please wait while the transaction is being confirmed...</span>
          </div>
        )
      });

      const txId = await sendAndConfirmTx(connection, signedTx);

      // Refresh the list of compressed tokens
      const accounts = await connection.getCompressedTokenAccountsByOwner(publicKey);
      setCompressedTokenAccounts(accounts.items);

      setDialogState(DialogState.Success);
      setAlertDialogContent({
        title: 'Token decompressed successfully!',
        message: (
          <>
            <p>Signature:&nbsp;
              <a
                href={`https://xray.helius.xyz/tx/${txId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-semibold underline hover:underline"
              >
                {txId.slice(0, 4) + '...' + txId.slice(-4)}
              </a>
            </p>
          </>
        )
      });

    } catch (error) {
      console.error("Error decompressing token:", error);
      setDialogState(DialogState.Error);
      setAlertDialogContent({
        title: 'Decompress cancelled',
        message: `${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  return (
    <main className="flex flex-col items-center justify-top my-12 space-y-12">
      <Header />
      <Card className="w-full max-w-3xl">
        <CardHeader className="flex flex-row justify-between space-y-0">
          <CardTitle className="text-3xl font-bold text-primary">
            Token Portfolio
          </CardTitle>
          <WalletMultiButton />
        </CardHeader>
        <CardContent className="space-y-4">
          {connected && publicKey ? (
            <div>
              {isLoading ? (
                <div className="flex justify-center items-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading tokens...</span>
                </div>
              ) : compressedTokenAccounts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mint</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compressedTokenAccounts.map((account, index) => (
                      <TableRow key={index}>
                        <TableCell>{account.parsed.mint.toBase58().slice(0, 4) + '...' + account.parsed.mint.toBase58().slice(-4)}</TableCell>
                        <TableCell>{normalizeTokenAmount(account.parsed.amount.toString(), 9)}</TableCell>
                        <TableCell>
                          <Button onClick={() => handleDecompress(account)}>Decompress</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p>No compressed tokens found.</p>
              )}
            </div>
          ) : (
            <p>Connect your wallet to view your compressed tokens.</p>
          )}
        </CardContent>
      </Card>
      <Link
        to="/"
        className="text-primary text-white shadow-lg hover:underline"
      >
        Back to Home
      </Link>
      <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertDialogContent.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {alertDialogContent.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {(dialogState === DialogState.Success || dialogState === DialogState.Error) && (
            <AlertDialogFooter>
              <Button onClick={() => {
                setAlertDialogOpen(false);
                setDialogState(DialogState.Idle);
              }}>
                Close
              </Button>
            </AlertDialogFooter>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
