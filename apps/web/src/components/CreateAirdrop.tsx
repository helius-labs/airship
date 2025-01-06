import * as airdropsender from 'helius-airship-core'
import { useState, useEffect, useCallback } from 'react'
import type { Token } from 'helius-airship-core'
import { getTokensByOwner } from 'helius-airship-core'
import { PublicKey } from '@solana/web3.js'
import { Button } from '../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Step1 from './airdrop-steps/Step1'
import Step2 from './airdrop-steps/Step2'
import Step3 from './airdrop-steps/Step3'
import Step4 from './airdrop-steps/Step4'
import Step5 from './airdrop-steps/Step5'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@/components/ui/form'
import { FormValues, validationSchema } from '@/schemas/formSchema'
import { getKeypairFromPrivateKey } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Header } from './Header.tsx'

interface CreateAirdropProps {
  db: airdropsender.BrowserDatabase
  onBackToHome: () => void
}

// Load the airdrop sender worker
const createWorker = new ComlinkWorker<typeof import('../workers/create.ts')>(
  new URL('../workers/create.ts', import.meta.url),
  {
    name: 'createWorker',
    type: 'module',
  }
)

let sendWorker: Worker | undefined = undefined
let pollWorker: Worker | undefined = undefined
let monitorInterval: NodeJS.Timeout | undefined = undefined

export function CreateAirdrop({ db, onBackToHome }: CreateAirdropProps) {
  const [step, setStep] = useState(1)
  const [tokens, setTokens] = useState<Token[]>([])
  const [noTokensMessage, setNoTokensMessage] = useState<string | null>(null)
  const [amountValue, setAmountValue] = useState<bigint | null>(null)
  const [recipientList, setRecipientList] = useState<string[]>([])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [sendProgress, setSendProgress] = useState(0)
  const [finalizeProgress, setFinalizeProgress] = useState(0)
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [sentTransactions, setSentTransactions] = useState(0)
  const [finalizedTransactions, setFinalizedTransactions] = useState(0)
  const [isAirdropInProgress, setIsAirdropInProgress] = useState(false)
  const [isAirdropComplete, setIsAirdropComplete] = useState(false)
  const [isCreatingAirdrop, setIsCreatingAirdrop] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAirdropCanceled, setIsAirdropCanceled] = useState(false)
  const [isRefreshingTokens, setIsRefreshingTokens] = useState(false)
  const { toast } = useToast()

  const currentValidationSchema = validationSchema[step - 1]

  const form = useForm<FormValues>({
    resolver: zodResolver(currentValidationSchema),
    defaultValues: {
      privateKey: window.sessionStorage.getItem('privateKey') || '',
      rpcUrl: window.sessionStorage.getItem('rpcUrl') || '',
      saveCredentials: window.sessionStorage.getItem('saveCredentials') === 'true',
      acknowledgedRisks: window.sessionStorage.getItem('acknowledgedRisks') === 'true',
      selectedToken: '',
      recipients: '',
      amountType: 'fixed',
      amount: 0,
      recipientImportOption: 'saga2',
      collectionAddress: '',
      mintAddress: '',
      csvFile: '',
    },
  })

  const { watch } = form
  const { privateKey, rpcUrl, selectedToken, recipients, amount, amountType, saveCredentials, acknowledgedRisks } =
    watch()

  const calculateAmountValue = useCallback(() => {
    const selectedTokenInfo = tokens.find((t) => t.mintAddress.toString() === selectedToken)

    if (!selectedTokenInfo || !amount) {
      return null
    }

    if (recipientList.length === 0) {
      return null
    }

    if (amountType === 'fixed') {
      return BigInt(Math.floor(amount * 10 ** selectedTokenInfo.decimals))
    } else {
      // Percent
      const totalAmount = BigInt(selectedTokenInfo.amount)
      const calculatedAmount = (totalAmount * BigInt(Math.floor(amount * 100))) / BigInt(10000)
      return calculatedAmount / BigInt(recipientList.length)
    }
  }, [tokens, selectedToken, amount, amountType, recipientList])

  useEffect(() => {
    setAmountValue(calculateAmountValue())
  }, [calculateAmountValue])

  useEffect(() => {
    window.sessionStorage.setItem('saveCredentials', saveCredentials.toString())
    window.sessionStorage.setItem('acknowledgedRisks', acknowledgedRisks.toString())
    if (saveCredentials) {
      window.sessionStorage.setItem('privateKey', privateKey)
      window.sessionStorage.setItem('rpcUrl', rpcUrl)
    } else {
      window.sessionStorage.removeItem('privateKey')
      window.sessionStorage.removeItem('rpcUrl')
    }
  }, [privateKey, rpcUrl, saveCredentials, acknowledgedRisks])

  const loadTokens = useCallback(
    async (showToast: boolean = false) => {
      if (!privateKey || !rpcUrl) {
        setNoTokensMessage('Private key or RPC URL is missing')
        return
      }
      setIsRefreshingTokens(true)
      try {
        const keypair = getKeypairFromPrivateKey(privateKey)
        const ownerAddress = keypair.publicKey
        const loadedTokens = await getTokensByOwner({
          ownerAddress,
          url: rpcUrl,
        })
        setTokens(loadedTokens)
        if (loadedTokens.length === 0) {
          setNoTokensMessage(`No Tokens found. Please transfer or mint tokens to ${keypair.publicKey.toBase58()}`)
          if (showToast) {
            toast({
              title: 'No Tokens found',
              description: `Please transfer or mint Tokens to ${keypair.publicKey.toBase58()}`,
              variant: 'destructive',
            })
          }
        } else {
          setNoTokensMessage(null)
          if (showToast) {
            toast({
              title: 'Tokens refreshed',
              description: `${loadedTokens.length} token${loadedTokens.length !== 1 ? 's' : ''} found`,
            })
          }
        }
      } catch (error) {
        console.error('Error loading tokens:', error)
        setNoTokensMessage('Error loading tokens. Please try again.')
        if (showToast) {
          toast({
            title: 'Error refreshing tokens',
            description: 'Please try again',
            variant: 'destructive',
          })
        }
      } finally {
        setIsRefreshingTokens(false)
      }
    },
    [privateKey, rpcUrl, toast]
  )

  useEffect(() => {
    void loadTokens(false) // Don't show toast on initial load
  }, [loadTokens])

  const onRefreshTokens = useCallback(async () => {
    await loadTokens(true) // Show toast when manually refreshing
  }, [loadTokens])

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
    setIsAirdropInProgress(false)
    setIsCreatingAirdrop(false)
    // Stop both workers
    sendWorker?.terminate()
    sendWorker = undefined
    pollWorker?.terminate()
    pollWorker = undefined
    // Clear the monitorInterval
    if (monitorInterval) {
      clearInterval(monitorInterval)
      monitorInterval = undefined
    }
  }

  const handleCancel = () => {
    // Clear the monitorInterval
    if (monitorInterval) {
      clearInterval(monitorInterval)
      monitorInterval = undefined
    }

    setIsAirdropInProgress(false)
    setIsAirdropComplete(false)
    setIsCreatingAirdrop(false)
    setSendProgress(0)
    setFinalizeProgress(0)
    setSentTransactions(0)
    setFinalizedTransactions(0)
    setTotalTransactions(0)
    setError(null)
    setIsAirdropCanceled(true)

    // Terminate both workers
    sendWorker?.terminate()
    sendWorker = undefined
    pollWorker?.terminate()
    pollWorker = undefined
  }

  const handleSendAirdrop = async () => {
    setShowConfirmDialog(false)
    setIsCreatingAirdrop(true)
    setError(null) // Clear any previous errors
    setIsAirdropCanceled(false)

    try {
      if (!amountValue) {
        throw new Error('Amount value is not set')
      }

      const keypair = getKeypairFromPrivateKey(privateKey)

      await createWorker.create(keypair.publicKey.toBase58(), recipientList, amountValue, selectedToken)

      setIsCreatingAirdrop(false)
      setIsAirdropInProgress(true)
      setStep(5) // Move to step 5 when airdrop starts

      if (typeof sendWorker === 'undefined') {
        sendWorker = new Worker(new URL('../workers/send.ts', import.meta.url), {
          type: 'module',
        })
      }

      sendWorker.onmessage = (event) => {
        if (event.data.error) {
          handleError(`Error sending transactions: ${event.data.error}`)
        }
      }
      sendWorker.postMessage({ privateKey, rpcUrl })

      if (typeof pollWorker === 'undefined') {
        pollWorker = new Worker(new URL('../workers/poll.ts', import.meta.url), {
          type: 'module',
        })
      }

      pollWorker.onmessage = (event) => {
        if (event.data.error) {
          handleError(`Error polling transactions: ${event.data.error}`)
        }
      }
      pollWorker.postMessage({ rpcUrl })

      monitorInterval = setInterval(async () => {
        try {
          const currentStatus = await airdropsender.status({ db })
          setSendProgress((currentStatus.sent / currentStatus.total) * 100)
          setFinalizeProgress((currentStatus.finalized / currentStatus.total) * 100)
          setTotalTransactions(currentStatus.total)
          setSentTransactions(currentStatus.sent)
          setFinalizedTransactions(currentStatus.finalized)

          if (currentStatus.finalized === currentStatus.total) {
            if (monitorInterval) {
              clearInterval(monitorInterval)
              monitorInterval = undefined
            }
            setIsAirdropInProgress(false)
            setIsAirdropComplete(true)
          }
        } catch (error) {
          if (monitorInterval) {
            clearInterval(monitorInterval)
            monitorInterval = undefined
          }
          handleError(`Error monitoring airdrop status: ${error}`)
        }
      }, 1000)
    } catch (error) {
      handleError(`Failed to create airdrop: ${error}`)
    }
  }

  const onSubmit = async () => {
    if (step === 2) {
      const lines = recipients.split('\n').filter(Boolean)
      const validatedRecipients: string[] = []
      let errorMessage: string | null = null

      for (let i = 0; i < lines.length; i++) {
        const trimmedAddress = lines[i].trim()
        try {
          const publicKey = new PublicKey(trimmedAddress)
          validatedRecipients.push(publicKey.toBase58())
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          errorMessage = `Invalid address on line ${i + 1}: ${trimmedAddress}`
          break
        }
      }

      if (errorMessage) {
        form.setError('recipients', { type: 'manual', message: errorMessage })
        return
      } else {
        setRecipientList(validatedRecipients)
        form.clearErrors('recipients')
      }
    }

    if (step < 4) {
      setStep(step + 1)
      return
    }

    if (step === 4) {
      setShowConfirmDialog(true)
    }
  }

  return (
    <main className="flex flex-col items-center justify-top my-12 space-y-12">
      <Header />
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary">
            {isCreatingAirdrop
              ? 'Creating Airdrop'
              : isAirdropInProgress || isAirdropComplete
                ? 'Sending Airdrop'
                : 'Create New Airdrop'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <>
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="flex justify-center">
                <Button onClick={onBackToHome} className="mt-1">
                  Back to Home
                </Button>
              </div>
            </>
          ) : isAirdropCanceled ? (
            <>
              <Alert variant="default" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Airdrop Canceled</AlertTitle>
                <AlertDescription>The airdrop has been canceled.</AlertDescription>
              </Alert>
              <div className="flex justify-center">
                <Button onClick={onBackToHome} className="mt-1">
                  Back to Home
                </Button>
              </div>
            </>
          ) : isCreatingAirdrop ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin" />
              <p>Creating airdrop... Please wait.</p>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {step === 1 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Step 1: Setup Your Wallet</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Step1 form={form} />
                    </CardContent>
                  </Card>
                )}
                {step === 2 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Step 2: Choose Token & Import Addresses</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Step2
                        form={form}
                        tokens={tokens}
                        rpcUrl={rpcUrl}
                        noTokensMessage={noTokensMessage}
                        onRefreshTokens={onRefreshTokens}
                        isRefreshingTokens={isRefreshingTokens}
                      />
                    </CardContent>
                  </Card>
                )}
                {step === 3 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Step 3: Set Airdrop Amount</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Step3 form={form} />
                    </CardContent>
                  </Card>
                )}
                {step === 4 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Step 4: Review Your Airdrop</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Step4
                        form={form}
                        tokens={tokens}
                        recipientList={recipientList}
                        amountValue={amountValue ?? BigInt(0)}
                      />
                    </CardContent>
                  </Card>
                )}
                {step === 5 && (
                  <Card>
                    <CardContent className="pt-6">
                      <Step5
                        isAirdropInProgress={isAirdropInProgress}
                        isAirdropComplete={isAirdropComplete}
                        sendProgress={sendProgress}
                        finalizeProgress={finalizeProgress}
                        sentTransactions={sentTransactions}
                        finalizedTransactions={finalizedTransactions}
                        totalTransactions={totalTransactions}
                        onBackToHome={onBackToHome}
                      />
                      {!isAirdropComplete && (
                        <div className="flex justify-center mt-4">
                          <Button onClick={handleCancel} variant="outline">
                            Cancel Airdrop
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
                {!isAirdropInProgress && !isAirdropComplete && step < 5 && (
                  <div className="flex justify-between items-center">
                    {step === 1 ? (
                      <Button onClick={onBackToHome} type="button" variant="outline">
                        Previous
                      </Button>
                    ) : (
                      <Button onClick={() => setStep(step - 1)} type="button" variant="outline">
                        Previous
                      </Button>
                    )}
                    <Button type="submit">{step < 4 ? 'Next' : 'Send'}</Button>
                  </div>
                )}
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
      {!isAirdropInProgress && !isAirdropComplete && step < 5 && (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            onBackToHome()
          }}
          className="text-primary text-white shadow-lg hover:underline"
        >
          Back to Home
        </a>
      )}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Airdrop</DialogTitle>
            <DialogDescription>Are you sure you want to send this airdrop?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendAirdrop}>Send Airdrop</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
