import { useEffect, useState } from 'react'
import { Table, TableBody, TableCell, TableRow } from '../ui/table'
import { UseFormReturn } from 'react-hook-form'
import { FormValues } from '@/schemas/formSchema'
import {
  Token,
  normalizeTokenAmount,
  maxAddressesPerTransaction,
  computeUnitPrice,
  computeUnitLimit,
  baseFee,
  compressionFee,
  MICRO_LAMPORTS_PER_LAMPORT,
  sampleTransaction,
} from 'helius-airship-core'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { AlertTriangle } from 'lucide-react'
import { Skeleton } from '../ui/skeleton' // Import the Skeleton component
import { getKeypairFromPrivateKey } from '@/lib/utils'
import { DecompressionInfo } from '../DecompressionInfo'

interface AirdropOverviewInterface {
  keypairAddress: string
  token: string
  totalAddresses: number
  amountPerAddress: string
  totalAmount: string
  numberOfTransactions: number
  approximateTransactionFee: string
  approximateCompressionFee: string
  rpcUrl: string
}

interface Step4Props {
  form: UseFormReturn<FormValues>
  tokens: Token[]
  recipientList: string[]
  amountValue: bigint
}

export default function Step4({ form, tokens, recipientList, amountValue }: Step4Props) {
  const [airdropOverview, setAirdropOverview] = useState<AirdropOverviewInterface | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCalculating, setIsCalculating] = useState(true)

  const { privateKey, selectedToken, rpcUrl } = form.getValues()

  useEffect(() => {
    const calculateAirdropOverview = async () => {
      setIsCalculating(true)
      setError(null)

      try {
        const keypair = getKeypairFromPrivateKey(privateKey)
        const selectedTokenInfo = tokens.find((t) => t.mintAddress.toString() === selectedToken)

        if (!selectedTokenInfo) {
          throw new Error('Selected token not found')
        }

        const numberOfTransactions = BigInt(Math.ceil(recipientList.length / Number(maxAddressesPerTransaction)))

        let priorityFeeEstimate = computeUnitPrice

        const response = await fetch(import.meta.env.VITE_RPC_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'helius-airship',
            method: 'getPriorityFeeEstimate',
            params: [
              {
                transaction: sampleTransaction,
                options: {
                  priorityLevel: 'Low',
                  evaluateEmptySlotAsZero: true,
                  lookbackSlots: 150,
                },
              },
            ],
          }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.result && typeof data.result.priorityFeeEstimate === 'number') {
            priorityFeeEstimate = data.result.priorityFeeEstimate
          }
        }

        const transactionFee =
          BigInt(baseFee) +
          (BigInt(computeUnitLimit) * BigInt(priorityFeeEstimate)) / BigInt(MICRO_LAMPORTS_PER_LAMPORT)

        const totalAmount = amountValue * BigInt(recipientList.length)

        const overview = {
          keypairAddress: keypair.publicKey.toBase58(),
          token: selectedTokenInfo.name || selectedTokenInfo.mintAddress.toString(),
          totalAddresses: recipientList.length,
          amountPerAddress: normalizeTokenAmount(amountValue.toString(), selectedTokenInfo.decimals).toLocaleString(
            'en-US',
            {
              maximumFractionDigits: selectedTokenInfo.decimals,
            }
          ),
          totalAmount: normalizeTokenAmount(totalAmount.toString(), selectedTokenInfo.decimals).toLocaleString(
            'en-US',
            {
              maximumFractionDigits: selectedTokenInfo.decimals,
            }
          ),
          numberOfTransactions: Number(numberOfTransactions),
          approximateTransactionFee: `${(Number(numberOfTransactions * transactionFee) / 1e9).toFixed(9)} SOL`,
          approximateCompressionFee: `${(Number(numberOfTransactions * BigInt(compressionFee)) / 1e9).toFixed(9)} SOL`,
          rpcUrl: rpcUrl,
        }

        setAirdropOverview(overview)
      } catch (error) {
        if (error instanceof Error) {
          console.error('Failed to calculate airdrop overview:', error)
          setError(`Failed to calculate airdrop overview: ${error.message}`)
        }
        setAirdropOverview(null)
      } finally {
        setIsCalculating(false)
      }
    }

    calculateAirdropOverview()
  }, [amountValue, privateKey, recipientList, rpcUrl, selectedToken, tokens])

  if (isCalculating) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      {airdropOverview && (
        <>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium w-1/3">RPC URL</TableCell>
              <TableCell>{airdropOverview.rpcUrl}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Keypair address</TableCell>
              <TableCell>{airdropOverview.keypairAddress}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Token</TableCell>
              <TableCell>{airdropOverview.token}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Total addresses</TableCell>
              <TableCell>{airdropOverview.totalAddresses}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Amount per address</TableCell>
              <TableCell>{airdropOverview.amountPerAddress}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Total amount</TableCell>
              <TableCell>{airdropOverview.totalAmount}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Number of transactions</TableCell>
              <TableCell>{airdropOverview.numberOfTransactions}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Approximate transaction fee</TableCell>
              <TableCell>{airdropOverview.approximateTransactionFee}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Approximate compression fee</TableCell>
              <TableCell>{airdropOverview.approximateCompressionFee}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
          
          <div className="mt-6">
            <DecompressionInfo variant="warning" />
          </div>
        </>
      )}
    </>
  )
}
