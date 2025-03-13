import { ReactNode, useEffect, useState, useMemo, useCallback, memo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from './ui/wallet-multi-button'
import { bn, buildTx, createRpc, pickRandomTreeAndQueue, Rpc, sendAndConfirmTx } from '@lightprotocol/stateless.js'
import { CompressedTokenProgram, selectMinCompressedTokenAccountsForTransfer } from '@lightprotocol/compressed-token'
import { Button } from './ui/button'
import { computeUnitPrice, getPriorityFeeEstimate } from 'helius-airship-core'
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
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { HelpCircle } from 'lucide-react'
import { normalizeTokenAmount } from 'helius-airship-core'
import { Checkbox } from './ui/checkbox'

enum DialogState {
  Idle,
  ConfirmingTransaction,
  Processing,
  Success,
  Error,
}

interface Token {
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

const TokenCell = memo(({ token }: { token: Token }) => {
  return (
    <div className="flex items-center space-x-2">
      {token.image ? (
        <img
          crossOrigin=""
          src={token.image}
          alt={token.symbol || 'Token'}
          className="w-8 h-8 rounded-full"
          onError={(e) => {
            if (e.currentTarget.src !== '/not-found.svg') {
              e.currentTarget.onerror = null
              e.currentTarget.src = '/not-found.svg'
            }
          }}
        />
      ) : (
        <HelpCircle className="w-8 h-8 text-gray-400" strokeWidth={1} />
      )}
      <div>
        <span className="font-medium">{token.symbol || 'Unknown'}</span>
        <a
          className="block text-xs text-gray-400 hover:underline"
          href={`https://birdeye.so/token/${token.mint.toBase58()}?chain=solana`}
          target="_blank"
          rel="noopener noreferrer"
          title="View on Birdeye"
        >
          {token.mint.toBase58().slice(0, 4) + '...' + token.mint.toBase58().slice(-4)}
        </a>
      </div>
    </div>
  )
})

const getColumns = (normalizeTokenAmount: Function, handleDecompress: Function): ColumnDef<Token>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'token',
    header: 'Token',
    cell: ({ row }) => <TokenCell token={row.original} />,
  },
  {
    accessorKey: 'amount',
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => {
      const amount = normalizeTokenAmount(row.original.amount.toString(), row.original.decimals)
      return <div className="text-right font-medium">{amount}</div>
    },
  },
  {
    accessorKey: 'value',
    header: () => <div className="text-right">Value</div>,
    cell: ({ row }) => {
      const token = row.original
      const value =
        token.pricePerToken > 0
          ? `$${(normalizeTokenAmount(token.amount.toString(), token.decimals) * token.pricePerToken).toFixed(2)}`
          : 'N/A'
      return <div className="text-right font-medium">{value}</div>
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const token = row.original
      return (
        <div className="text-right">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              handleDecompress(token.mint, token.amount, token.tokenProgramId)
            }}
          >
            Decompress
          </Button>
        </div>
      )
    },
  },
]

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const MAX_BATCH_SIZE = 5

export function DecompressPage() {
  const { publicKey, connected, signTransaction, signAllTransactions } = useWallet()
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

  const handleDecompress = useCallback(
    async (mint: PublicKey, amount: BN, tokenProgramId: PublicKey) => {
      try {
        if (!publicKey || !signTransaction) throw new WalletNotConnectedError()

        setAlertDialogOpen(true)
        setDialogState(DialogState.ConfirmingTransaction)
        setAlertDialogContent({
          title: 'Approve Transaction',
          message: 'Please approve the transaction in your wallet...',
        })

        // Set the compute unit limit and add it to the transaction
        const unitLimitIX = ComputeBudgetProgram.setComputeUnitLimit({
          units: 260_000,
        })

        const instructions: TransactionInstruction[] = [unitLimitIX]

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

        // Fetch compressed token accounts for this token
        const compressedTokenAccounts = await connection.getCompressedTokenAccountsByOwner(publicKey, {
          mint,
        })

        // Select accounts to transfer from based on the transfer amount
        const [inputAccounts] = selectMinCompressedTokenAccountsForTransfer(compressedTokenAccounts.items, amount)

        // Get a random tree and queue from the active state tree addresses.
        // Prevents write lock contention on state trees.
        const activeStateTrees = await connection.getCachedActiveStateTreeInfo()
        const { tree, queue } = pickRandomTreeAndQueue(activeStateTrees)

        // Fetch recent validity proof
        // The prover can only generate proofs for 5 compressed accounts at a time
        const proof = await connection.getValidityProofV0(
          inputAccounts.map((account) => ({
            hash: bn(account.compressedAccount.hash),
            tree: tree,
            queue: queue,
          }))
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
          outputStateTree: tree,
        })

        instructions.push(decompressInstruction)

        const { value: blockhashCtx } = await connection.getLatestBlockhashAndContext()

        const tempTx = buildTx(instructions, publicKey, blockhashCtx.blockhash)

        // Get the priority fee estimate
        const priorityFeeEstimate = await getPriorityFeeEstimate(import.meta.env.VITE_RPC_ENDPOINT, 'Medium', tempTx)

        // Set the compute unit limit and add it to the transaction
        const unitPriceIX = ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: priorityFeeEstimate ?? computeUnitPrice,
        })

        // Insert the unit price instruction at the second position in the instructions array
        instructions.splice(1, 0, unitPriceIX)

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
          title: 'Error decompressing',
          message: `${error instanceof Error ? (typeof error.message === 'string' ? error.message : JSON.stringify(error.message, null, 2)) : 'Unknown error'}`,
        })
      } finally {
        // Refresh the list of compressed tokens
        await fetchCompressedTokenAccounts()
      }
    },
    [
      publicKey,
      signTransaction,
      setAlertDialogOpen,
      setDialogState,
      setAlertDialogContent,
      fetchCompressedTokenAccounts,
    ]
  )

  // Update handleBatchDecompress to process tokens sequentially with delay
  const handleBatchDecompress = useCallback(
    async (tokens: Token[]) => {
      try {
        if (!publicKey || !signAllTransactions) throw new WalletNotConnectedError()

        setAlertDialogOpen(true)
        setDialogState(DialogState.Processing)
        setAlertDialogContent({
          title: 'Building Transactions',
          message: (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Building transactions... (0/{tokens.length})</span>
            </div>
          ),
        })

        // Process tokens sequentially instead of in parallel
        const transactions = []
        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i]

          // Update progress message
          setAlertDialogContent({
            title: 'Building Transactions',
            message: (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  Building transactions... ({i + 1}/{tokens.length})
                </span>
              </div>
            ),
          })

          const instructions: TransactionInstruction[] = []

          // Add compute budget instructions
          const unitLimitIX = ComputeBudgetProgram.setComputeUnitLimit({
            units: 260_000,
          })
          instructions.push(unitLimitIX)

          // Calculate ATA
          const ata = await getAssociatedTokenAddress(token.mint, publicKey, undefined, token.tokenProgramId)

          // Check if the ATA exists
          const ataInfo = await connection.getAccountInfo(ata)
          const ataExists = ataInfo !== null

          if (!ataExists) {
            const createAtaInstruction = await createAssociatedTokenAccountInstruction(
              publicKey,
              ata,
              publicKey,
              token.mint,
              token.tokenProgramId
            )
            instructions.push(createAtaInstruction)
          }

          // Fetch compressed token accounts for this token
          const compressedTokenAccounts = await connection.getCompressedTokenAccountsByOwner(publicKey, {
            mint: token.mint,
          })

          // Select accounts to transfer from based on the transfer amount
          const [inputAccounts] = selectMinCompressedTokenAccountsForTransfer(
            compressedTokenAccounts.items,
            token.amount
          )

          // Get a random tree and queue from the active state tree addresses.
          // Prevents write lock contention on state trees.
          const activeStateTrees = await connection.getCachedActiveStateTreeInfo()
          const { tree, queue } = pickRandomTreeAndQueue(activeStateTrees)

          // Fetch recent validity proof
          // The prover can only generate proofs for 5 compressed accounts at a time
          const proof = await connection.getValidityProofV0(
            inputAccounts.map((account) => ({
              hash: bn(account.compressedAccount.hash),
              tree: tree,
              queue: queue,
            }))
          )

          // Create decompress instruction
          const decompressInstruction = await CompressedTokenProgram.decompress({
            payer: publicKey,
            inputCompressedTokenAccounts: inputAccounts,
            toAddress: ata,
            amount: token.amount,
            recentInputStateRootIndices: proof.rootIndices,
            recentValidityProof: proof.compressedProof,
            tokenProgramId: token.tokenProgramId,
          })

          instructions.push(decompressInstruction)

          const { value: blockhashCtx } = await connection.getLatestBlockhashAndContext()
          const tempTx = buildTx(instructions, publicKey, blockhashCtx.blockhash)

          // Get the priority fee estimate
          const priorityFeeEstimate = await getPriorityFeeEstimate(import.meta.env.VITE_RPC_ENDPOINT, 'Medium', tempTx)

          // Set the compute unit limit and add it to the transaction
          const unitPriceIX = ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: priorityFeeEstimate ?? computeUnitPrice,
          })

          // Insert the unit price instruction at the second position in the instructions array
          instructions.splice(1, 0, unitPriceIX)

          // Build the final transaction
          transactions.push(buildTx(instructions, publicKey, blockhashCtx.blockhash))

          // Add delay between tokens
          await sleep(500)
        }

        setDialogState(DialogState.ConfirmingTransaction)
        setAlertDialogContent({
          title: 'Approve Transactions',
          message: 'Please approve the transactions in your wallet...',
        })

        const signedTxs = await signAllTransactions(transactions)

        setDialogState(DialogState.Processing)
        setAlertDialogContent({
          title: 'Sending Transactions',
          message: (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Sending and confirming transactions... (0/{transactions.length})</span>
            </div>
          ),
        })

        const txIds = []
        for (let i = 0; i < signedTxs.length; i++) {
          // Update progress message
          setAlertDialogContent({
            title: 'Sending Transactions',
            message: (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  Sending and confirming transactions... ({i + 1}/{transactions.length})
                </span>
              </div>
            ),
          })

          const txId = await sendAndConfirmTx(connection, signedTxs[i])
          txIds.push(txId)
        }

        // Refresh the list of compressed tokens
        await fetchCompressedTokenAccounts()

        setDialogState(DialogState.Success)
        setAlertDialogContent({
          title: 'Tokens decompressed successfully!',
          message: (
            <div className="space-y-2">
              <p>Transaction signatures:</p>
              <div className="space-y-1">
                {txIds.map((txId, index) => (
                  <p key={txId}>
                    {index + 1}.{' '}
                    <a
                      href={`https://photon.helius.dev/tx/${txId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-semibold underline hover:underline"
                    >
                      {txId.slice(0, 4) + '...' + txId.slice(-4)}
                    </a>
                  </p>
                ))}
              </div>
            </div>
          ),
        })
      } catch (error) {
        console.error('Error decompressing tokens:', error)
        setDialogState(DialogState.Error)
        setAlertDialogContent({
          title: 'Error decompressing',
          message: `${error instanceof Error ? (typeof error.message === 'string' ? error.message : JSON.stringify(error.message, null, 2)) : 'Unknown error'}`,
        })
      } finally {
        // Refresh the list of compressed tokens
        await fetchCompressedTokenAccounts()
      }
    },
    [
      publicKey,
      signAllTransactions,
      setAlertDialogOpen,
      setDialogState,
      setAlertDialogContent,
      fetchCompressedTokenAccounts,
    ]
  )

  const columns = useMemo(
    () => getColumns(normalizeTokenAmount, handleDecompress),
    [normalizeTokenAmount, handleDecompress]
  )

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
                    <div>
                      {table.getFilteredSelectedRowModel().rows.length > MAX_BATCH_SIZE && (
                        <span className="text-xs"> (Maximum {MAX_BATCH_SIZE} tokens can be decompressed at once)</span>
                      )}
                    </div>
                    <div className="space-x-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleBatchDecompress(selectedTokens.slice(0, MAX_BATCH_SIZE))}
                        disabled={selectedTokens.length === 0 || !signAllTransactions}
                        title={!signAllTransactions ? "Your wallet doesn't support batch transactions" : undefined}
                      >
                        {!signAllTransactions ? (
                          'Batch Decompress Not Supported'
                        ) : (
                          <>
                            Decompress {selectedTokens.length > MAX_BATCH_SIZE ? `First ${MAX_BATCH_SIZE}` : 'Selected'}
                          </>
                        )}
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
            <AlertDialogDescription className="break-all">{alertDialogContent.message}</AlertDialogDescription>
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
