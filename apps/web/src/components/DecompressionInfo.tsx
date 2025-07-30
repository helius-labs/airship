import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Info, Copy, Check } from 'lucide-react'
import { Button } from './ui/button'
import { useState } from 'react'

interface DecompressionInfoProps {
  showTitle?: boolean
}

export function DecompressionInfo({ 
  showTitle = true
}: DecompressionInfoProps) {
  return (
    <Alert variant="default" className="border-border bg-card">
      <Info className="h-4 w-4" />
      {showTitle && (
        <AlertTitle className="text-card-foreground">
          Important: Recipients Must Decompress Tokens
        </AlertTitle>
      )}
            <AlertDescription className="text-muted-foreground">
        <p>
          Recipients will receive <strong>compressed tokens</strong> that need to be decompressed at{' '}
          <a 
            href="https://airship.helius.dev/decompress" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary underline hover:no-underline font-medium"
          >
            airship.helius.dev
          </a>
          {' '}or using a compatible wallet.
        </p>
      </AlertDescription>
    </Alert>
  )
}

export function RecipientInstructions() {
  const [copied, setCopied] = useState(false)
  
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      
      // Reset the icon after 2 seconds
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const instructions = `You've received compressed tokens from an airdrop!

To access your tokens, you need to decompress them:

Option 1: Visit AirShip Website
• Go to https://airship.helius.dev
• Connect your wallet
• Click "View Your Compressed Tokens"
• Select and decompress your tokens

Option 2: Use a Compatible Wallet
• Use a wallet that supports ZK Compression for automatic handling`

  return (
    <Alert className="border-border bg-card">
      <Info className="h-4 w-4" />
      <AlertTitle className="text-card-foreground">
        Share These Instructions With Your Recipients
      </AlertTitle>
      <AlertDescription className="text-muted-foreground space-y-3">
        <p>Copy and share these instructions so your recipients know how to access their tokens:</p>
        <div className="relative bg-muted p-3 rounded border text-sm text-muted-foreground whitespace-pre-line">
          <Button
            onClick={() => copyToClipboard(instructions)}
            variant="ghost"
            size="icon"
            className={`absolute top-2 right-2 h-6 w-6 hover:bg-background/80 transition-colors ${copied ? 'text-green-500' : ''}`}
            title={copied ? "Copied!" : "Copy instructions"}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
          {instructions}
        </div>
      </AlertDescription>
    </Alert>
  )
} 