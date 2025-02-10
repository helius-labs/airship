import { ReactNode, useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from './ui/wallet-multi-button'
import { bn, buildTx, createRpc, Rpc, sendAndConfirmTx } from '@lightprotocol/stateless.js'
import { CompressedTokenProgram, selectMinCompressedTokenAccountsForTransfer } from '@lightprotocol/compressed-token'
import { Button } from './ui/button'
import { computeUnitPrice } from 'helius-airship-core'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { WalletNotConnectedError } from '@solana/wallet-adapter-base'
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { ComputeBudgetProgram, PublicKey, TransactionInstruction } from '@solana/web3.js'
import { Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog'
import { Link } from 'react-router-dom'
import { Header } from './Header'
import { BN } from '@coral-xyz/anchor'
import { ColumnDef, flexRender, getCoreRowModel, useReactTable, RowSelectionState } from '@tanstack/react-table'
import { columns } from './columns'

enum DialogState {
  Idle,
  ConfirmingTransaction,
  Processing,
  Success,
  Error,
}

export interface Token {
  mint: PublicKey
  amount: BN
  symbol: string
  decimals: number
  image: string
  pricePerToken: number
  tokenProgramId: PublicKey
  onDecompress?: (mint: PublicKey, amount: BN, tokenProgramId: PublicKey) => void
}

const connection: Rpc = createRpc(import.meta.env.VITE_RPC_ENDPOINT, import.meta.env.VITE_RPC_ENDPOINT)

export function DecompressPage() {
  const { publicKey, connected, signTransaction } = useWallet()
  const [compressedTokenAccounts, setCompressedTokenAccounts] = useState<Token[]>([])
  const [isLoading, setIsLoading] = useState(false) // New state for loading
  const [alertDialogOpen, setAlertDialogOpen] = useState(false)
  const [alertDialogContent, setAlertDialogContent] = useState<{
    title: string
    message: string | ReactNode
  }>({ title: '', message: '' })
  const [dialogState, setDialogState] = useState<DialogState>(DialogState.Idle)
  const [rowSelection, setRowSelection] = useState({})

  const fetchCompressedTokenAccounts = async () => {
    if (connected && publicKey) {
      setIsLoading(true)
      try {
        // Fetch compressed token accounts
        const accounts = await connection.getCompressedTokenAccountsByOwner(publicKey)

        // Disable deduplication to avoid issues with the inner instruction getting too large

        // Deduplicate tokens with the same mint address and add the amounts
        // const deduplicatedAccounts = accounts.items.reduce(
        //   (acc, current) => {
        //     const existingAccount = acc.find((item) =>
        //       item.parsed.mint.equals(current.parsed.mint)
        //     );
        //     if (existingAccount) {
        //       existingAccount.parsed.amount = existingAccount.parsed.amount.add(
        //         current.parsed.amount
        //       );
        //     } else {
        //       acc.push(current);
        //     }
        //     return acc;
        //   },
        //   [] as typeof accounts.items
        // );

        // Fetch asset data using Helius DAS API getAssetBatch method
        const url = `${import.meta.env.VITE_RPC_ENDPOINT}`

        // Get unique mint addresses by filtering out duplicates
        const assetIds = Array.from(new Set(accounts.items.map((account) => account.parsed.mint.toBase58())))

        const getAssetBatch = async (ids: string[]) => {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 'helius-airship',
              method: 'getAssetBatch',
              params: {
                ids: ids,
              },
            }),
          })
          const { result } = await response.json()
          return result
        }

        const assetData = await getAssetBatch(assetIds)

        // Merge asset data with account data
        let tokens = accounts.items.map((account) => {
          const asset = assetData.find((asset: { id: string }) => asset.id === account.parsed.mint.toBase58())
          return {
            mint: account.parsed.mint,
            amount: account.parsed.amount,
            symbol: asset.content?.metadata?.symbol || '',
            decimals: asset.token_info?.decimals || 0,
            image: asset.content?.links?.image || '',
            pricePerToken: asset.token_info?.price_info?.price_per_token || 0,
            tokenProgramId:
              asset.token_info?.token_program === TOKEN_PROGRAM_ID.toBase58()
                ? TOKEN_PROGRAM_ID
                : TOKEN_2022_PROGRAM_ID,
          }
        })

        // Sort tokens by value (price * amount)
        const sortedTokens = tokens.sort((a, b) => {
          const valueA = (a.pricePerToken * Number(a.amount)) / Math.pow(10, a.decimals)
          const valueB = (b.pricePerToken * Number(b.amount)) / Math.pow(10, b.decimals)
          return valueB - valueA // Sort in descending order
        })

        // Update tokens with sorted array
        tokens = sortedTokens

        setCompressedTokenAccounts(tokens)
      } catch (error) {
        console.error('Error fetching compressed tokens:', error)
        // TODO: Add user-friendly error handling
      } finally {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    fetchCompressedTokenAccounts()
  }, [connected, publicKey])

  const handleDecompress = async (mint: PublicKey, amount: BN, tokenProgramId: PublicKey) => {
    try {
      if (!publicKey || !signTransaction) throw new WalletNotConnectedError()

      setAlertDialogOpen(true)
      setDialogState(DialogState.ConfirmingTransaction)
      setAlertDialogContent({
        title: 'Confirm Transaction',
        message: 'Please confirm the transaction in your wallet...',
      })

      // Set the compute unit limit and add it to the transaction
      const unitLimitIX = ComputeBudgetProgram.setComputeUnitLimit({
        units: 300_000,
      })

      const instructions: TransactionInstruction[] = [unitLimitIX]

      // Set the compute unit limit and add it to the transaction
      const unitPriceIX = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: computeUnitPrice,
      })

      instructions.push(unitPriceIX)

      // Calculate ATA
      const ata = await getAssociatedTokenAddress(mint, publicKey, undefined, tokenProgramId)

      // Check if the ATA exists
      const ataInfo = await connection.getAccountInfo(ata)
      const ataExists = ataInfo !== null

      if (!ataExists) {
        // Create an associated token account if it doesn't exist
        const createAtaInstruction = await createAssociatedTokenAccountInstruction(
          publicKey,
          ata,
          publicKey,
          mint,
          tokenProgramId
        )

        instructions.push(createAtaInstruction)
      }

      // Fetch the latest compressed token account state
      const compressedTokenAccounts = await connection.getCompressedTokenAccountsByOwner(publicKey, {
        mint,
      })

      // Select accounts to transfer from based on the transfer amount
      const [inputAccounts] = selectMinCompressedTokenAccountsForTransfer(compressedTokenAccounts.items, amount)

      // Fetch recent validity proof
      // The prover can only generate proofs for 5 compressed accounts at a time
      const proof = await connection.getValidityProof(
        inputAccounts.map((account) => bn(account.compressedAccount.hash))
      )

      // Create the decompress instruction
      const decompressInstruction = await CompressedTokenProgram.decompress({
        payer: publicKey,
        inputCompressedTokenAccounts: inputAccounts,
        toAddress: ata,
        amount,
        recentInputStateRootIndices: proof.rootIndices,
        recentValidityProof: proof.compressedProof,
        tokenProgramId: tokenProgramId,
      })

      instructions.push(decompressInstruction)

      const { value: blockhashCtx } = await connection.getLatestBlockhashAndContext()

      const tx = buildTx(instructions, publicKey, blockhashCtx.blockhash)

      const signedTx = await signTransaction(tx)

      setDialogState(DialogState.Processing)
      setAlertDialogContent({
        title: 'Confirming Transaction',
        message: (
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Please wait while the transaction is being confirmed...</span>
          </div>
        ),
      })

      const txId = await sendAndConfirmTx(connection, signedTx)

      // Refresh the list of compressed tokens
      await fetchCompressedTokenAccounts()

      setDialogState(DialogState.Success)
      setAlertDialogContent({
        title: 'Token decompressed successfully!',
        message: (
          <>
            <p>
              Signature:&nbsp;
              <a
                href={`https://photon.helius.dev/tx/${txId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-semibold underline hover:underline"
              >
                {txId.slice(0, 4) + '...' + txId.slice(-4)}
              </a>
            </p>
          </>
        ),
      })
    } catch (error) {
      console.error('Error decompressing token:', error)
      setDialogState(DialogState.Error)
      setAlertDialogContent({
        title: 'Decompress cancelled',
        message: `${error instanceof Error ? (typeof error.message === 'string' ? error.message : JSON.stringify(error.message, null, 2)) : 'Unknown error'}`,
      })
    }
  }

  const table = useReactTable({
    data: compressedTokenAccounts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
  })

  const selectedTokens = table.getFilteredSelectedRowModel().rows.map((row) => row.original)

  return (
    <main className="flex flex-col items-center justify-top my-12 space-y-12">
      <Header />
      <Card className="w-full max-w-3xl">
        <CardHeader className="flex flex-row justify-between space-y-0">
          <CardTitle className="text-3xl font-bold text-primary">Token Portfolio</CardTitle>
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
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                          <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                              return (
                                <TableHead key={header.id}>
                                  {header.isPlaceholder
                                    ? null
                                    : flexRender(header.column.columnDef.header, header.getContext())}
                                </TableHead>
                              )
                            })}
                          </TableRow>
                        ))}
                      </TableHeader>
                      <TableBody>
                        {table.getRowModel().rows?.length ? (
                          table.getRowModel().rows.map((row) => (
                            <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                              {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id}>
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                              No results.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex items-center justify-end space-x-2 py-4">
                    <div className="flex-1 text-sm text-muted-foreground">
                      {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length}{' '}
                      row(s) selected.
                    </div>
                    <div className="space-x-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          selectedTokens.forEach((token) => {
                            handleDecompress(token.mint, token.amount, token.tokenProgramId)
                          })
                        }}
                      >
                        Decompress Selected
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <p>No compressed tokens found.</p>
              )}
            </div>
          ) : (
            <p>Connect your wallet to view your compressed tokens.</p>
          )}
        </CardContent>
      </Card>
      <Link to="/" className="text-primary text-white shadow-lg hover:underline">
        Back to Home
      </Link>
      <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertDialogContent.title}</AlertDialogTitle>
            <AlertDialogDescription>{alertDialogContent.message}</AlertDialogDescription>
          </AlertDialogHeader>
          {(dialogState === DialogState.Success || dialogState === DialogState.Error) && (
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setAlertDialogOpen(false)
                  setDialogState(DialogState.Idle)
                }}
              >
                Close
              </AlertDialogCancel>
            </AlertDialogFooter>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
