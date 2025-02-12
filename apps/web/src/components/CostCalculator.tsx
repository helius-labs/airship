import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  baseFee,
  compressionFee,
  computeUnitLimit,
  computeUnitPrice,
  MICRO_LAMPORTS_PER_LAMPORT,
  maxAddressesPerTransaction,
  sampleTransaction,
} from 'helius-airship-core'
import { Header } from './Header'
import { Button } from './ui/button'
import { Globe2, Smartphone } from 'lucide-react'

export function CostCalculator() {
  const SEEKER_HOLDERS = 185_000
  const WORLD_POPULATION = 8_200_000_000

  const [recipientCount, setRecipientCount] = useState<number>(SEEKER_HOLDERS)
  const [priorityFeeEstimate, setPriorityFeeEstimate] = useState<number>(computeUnitPrice)

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove all non-numeric characters
    const rawValue = e.target.value.replace(/[^0-9]/g, '')
    setRecipientCount(Number(rawValue))
  }

  const getPriorityFeeEstimate = async () => {
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
        setPriorityFeeEstimate(data.result.priorityFeeEstimate)
      }
    }
  }

  const calculateCompressedFees = () => {
    const transactionCount = Math.ceil(recipientCount / maxAddressesPerTransaction)

    // Convert lamports to SOL
    const baseFeeSol = (transactionCount * baseFee) / 1e9
    const compressionFeeSol = (transactionCount * compressionFee) / 1e9
    const priorityFeeSol =
      (transactionCount * computeUnitLimit * priorityFeeEstimate) / (MICRO_LAMPORTS_PER_LAMPORT * 1e9)

    return {
      baseFee: baseFeeSol.toFixed(2),
      zkFee: compressionFeeSol.toFixed(2),
      priorityFee: priorityFeeSol.toFixed(2),
      total: (baseFeeSol + compressionFeeSol + priorityFeeSol).toFixed(2),
    }
  }

  const calculateNormalFees = () => {
    const transactionCount = Math.ceil(recipientCount / maxAddressesPerTransaction)

    // Convert lamports to SOL
    const baseFeeSol = (transactionCount * baseFee) / 1e9
    const priorityFeeSol =
      (transactionCount * computeUnitLimit * priorityFeeEstimate) / (MICRO_LAMPORTS_PER_LAMPORT * 1e9)
    const accountRent = 0.00203928 // solana rent 165
    return {
      baseFee: baseFeeSol.toFixed(2),
      accountRent: (recipientCount * accountRent).toFixed(2),
      priorityFee: priorityFeeSol.toFixed(2),
      total: (baseFeeSol + recipientCount * accountRent + priorityFeeSol).toFixed(2),
    }
  }

  useEffect(() => {
    getPriorityFeeEstimate()
  }, [])

  const normalFees = useMemo(() => {
    return calculateNormalFees()
  }, [recipientCount, priorityFeeEstimate])

  const compressedFees = useMemo(() => {
    return calculateCompressedFees()
  }, [recipientCount, priorityFeeEstimate])

  return (
    <main className="flex flex-col items-center justify-top my-12 space-y-12">
      <Header />
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary text-center">Airdrop Calculator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-4 justify-center items-center">
            <Label htmlFor="recipients">How many airdrops do you want to send?</Label>
            <div className="flex gap-2 mb-2 flex-wrap justify-center">
              <Button
                variant="outline"
                size="lg"
                className="flex items-center gap-2"
                onClick={() => setRecipientCount(185_000)}
              >
                <Smartphone className="h-4 w-4" />
                Seeker holders
              </Button>
              <Button variant="outline" size="lg" onClick={() => setRecipientCount(1_000_000)}>
                1 million
              </Button>
              <Button variant="outline" size="lg" onClick={() => setRecipientCount(10_000_000)}>
                10 million
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setRecipientCount(WORLD_POPULATION)}
                className="flex items-center gap-2"
              >
                <Globe2 className="h-4 w-4" />
                Everyone on Earth
              </Button>
            </div>
            <span className="text-xs text-muted-foreground">(or just type any number you want)</span>

            <Input
              id="recipients"
              min="0"
              value={recipientCount > 0 ? formatNumber(recipientCount) : ''}
              onChange={handleInputChange}
              className="w-48 text-xl text-center"
              placeholder="0"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ZK Compression Airdrop</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ZK Compression Fee:</span>
                    <span>{compressedFees.zkFee} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base Fee:</span>
                    <span>{compressedFees.baseFee} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Priority Fee:</span>
                    <span>~{compressedFees.priorityFee} SOL</span>
                  </div>
                  <div className="h-px bg-border my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>~{compressedFees.total} SOL</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="hidden md:flex items-center justify-center h-full">
              <div className="text-3xl font-bold text-muted-foreground rotate-0 md:rotate-0">VS</div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Normal Airdrop</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account Rent:</span>
                    <span>{normalFees.accountRent} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base Fee:</span>
                    <span>{normalFees.baseFee} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Priority Fee:</span>
                    <span>~{normalFees.priorityFee} SOL</span>
                  </div>
                  <div className="h-px bg-border my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>~{normalFees.total} SOL</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
      <Link to="/" className="text-primary text-white shadow-lg hover:underline">
        Back to Home
      </Link>
    </main>
  )
}
