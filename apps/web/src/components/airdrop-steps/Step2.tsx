import { useCallback, useState, useEffect } from 'react'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import {
  AlertCircle,
  Upload,
  File,
  X,
  Loader2,
  Smartphone,
  Images,
  Coins,
  FileSpreadsheet,
  CircleCheck,
  CircleAlert,
  RefreshCw,
  HelpCircle,
} from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import CodeMirror from '@uiw/react-codemirror'
import { isFungibleToken, isNFTCollection, isSolanaAddress, normalizeTokenAmount, Token } from 'helius-airship-core'
import { useDropzone } from 'react-dropzone'
import { getCollectionHolders, getTokenAccounts, saga2PreOrderTokenMintAddress } from 'helius-airship-core'
import { PublicKey } from '@solana/web3.js'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form'
import { FormValues } from '@/schemas/formSchema'
import { UseFormReturn } from 'react-hook-form'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { AlertTriangle } from 'lucide-react'
import Papa from 'papaparse'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface Step2Props {
  form: UseFormReturn<FormValues>
  tokens: Token[]
  rpcUrl: string
  noTokensMessage: string | null
  onRefreshTokens: () => Promise<void>
  isRefreshingTokens: boolean
}

export default function Step2({
  form,
  tokens,
  rpcUrl,
  noTokensMessage,
  onRefreshTokens,
  isRefreshingTokens,
}: Step2Props) {
  const { control, watch, setValue } = form

  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [collectionAddressError, setCollectionAddressError] = useState<string | null>(null)
  const [mintAddressError, setMintAddressError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<{
    success: boolean
    count: number
    rejected: number
  } | null>(null)
  const [csvFileError, setCsvFileError] = useState<string | null>(null)
  const [csvFile, setCsvFile] = useState<File | null>(null)

  const recipientImportOption = watch('recipientImportOption')
  const collectionAddress = watch('collectionAddress')
  const mintAddress = watch('mintAddress')

  useEffect(() => {
    setImportError(null)
  }, [recipientImportOption])

  const validateInput = async (): Promise<string | null> => {
    switch (recipientImportOption) {
      case 'nft':
        if (collectionAddress && !isSolanaAddress(collectionAddress)) {
          setCollectionAddressError('Please enter a collection address')
          return 'Please enter a collection address'
        }
        if (
          collectionAddress &&
          !(await isNFTCollection({
            url: rpcUrl,
            collectionAddress: new PublicKey(collectionAddress),
          }))
        ) {
          setCollectionAddressError('Collection not found please check the address')
          return 'Collection not found please check the address'
        }
        setCollectionAddressError(null)
        break
      case 'spl':
        if (mintAddress && !isSolanaAddress(mintAddress)) {
          setMintAddressError('Please enter a mint address')
          return 'Please enter a mint address'
        }
        if (
          mintAddress &&
          !(await isFungibleToken({
            url: rpcUrl,
            tokenAddress: new PublicKey(mintAddress),
          }))
        ) {
          setMintAddressError('Token not found please check the address')
          return 'Token not found please check the address'
        }
        setMintAddressError(null)
        break
      case 'csv':
        if (!csvFile) {
          setCsvFileError('Please select a CSV file')
          return 'Please select a CSV file'
        }
        setCsvFileError(null)
        break
      // No validation needed for "saga2" option
    }
    return null
  }

  const handleImportClick = async () => {
    const validationError = await validateInput()
    if (!validationError) {
      setIsConfirmDialogOpen(true)
    }
  }

  const handleImportAddresses = async () => {
    setIsImporting(true)
    setImportError(null)
    setImportResult(null)
    setValue('recipients', '', { shouldValidate: true })
    let addresses: string[] = []
    let rejectedCount = 0

    try {
      switch (recipientImportOption) {
        case 'saga2': {
          const saga2Accounts = await getTokenAccounts({
            tokenMintAddress: saga2PreOrderTokenMintAddress,
            url: rpcUrl,
          })
          addresses = saga2Accounts.map((account) => account.owner.toBase58())
          break
        }
        case 'nft': {
          if (!collectionAddress) {
            throw new Error('Please enter a collection address')
          }
          const nftHolders = await getCollectionHolders({
            collectionAddress: new PublicKey(collectionAddress),
            url: rpcUrl,
          })
          addresses = nftHolders.map((holder) => holder.owner.toBase58())
          break
        }
        case 'spl': {
          if (!mintAddress) {
            throw new Error('Please enter a mint address')
          }
          const splAccounts = await getTokenAccounts({
            tokenMintAddress: new PublicKey(mintAddress),
            url: rpcUrl,
          })
          addresses = splAccounts.map((account) => account.owner.toBase58())
          break
        }
        case 'csv': {
          if (!csvFile) {
            throw new Error('Please import a CSV file')
          }
          const parseResult = await new Promise<Papa.ParseResult<string[]>>((resolve, reject) => {
            Papa.parse(csvFile, {
              complete: resolve,
              error: reject,
              skipEmptyLines: true,
            })
          })

          addresses = []
          rejectedCount = 0

          parseResult.data.forEach((row) => {
            if (row.length > 0) {
              const address = row[0].trim()
              try {
                new PublicKey(address)
                addresses.push(address)
              } catch {
                rejectedCount++
              }
            }
          })
          break
        }
      }

      if (addresses.length === 0) {
        throw new Error('No addresses found. Are you maybe connected to Devnet? Please check your input and try again.')
      } else {
        setValue('recipients', addresses.join('\n'), { shouldValidate: true })
        setImportResult({
          success: true,
          count: addresses.length,
          rejected: rejectedCount,
        })
      }
    } catch (error) {
      console.error('Failed to import addresses:', error)
      setImportError(error instanceof Error ? error.message : 'Failed to import addresses. Please try again.')
      setImportResult({ success: false, count: 0, rejected: rejectedCount })
    } finally {
      setIsImporting(false)
    }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      setCsvFile(file)
      setCsvFileError(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: false,
  })

  return (
    <div className="space-y-6">
      <FormField
        control={control}
        name="selectedToken"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center space-x-1">
              <span>Which Token do you want to airdrop?</span>
              <Popover>
                <PopoverTrigger>
                  <HelpCircle className="h-4 w-4" />
                </PopoverTrigger>
                <PopoverContent className="space-y-2">
                  ZK Compression supports both Token-2022 and SPL tokens. <br />
                  <br /> For Token-2022 tokens, the following extensions are supported:
                  <ul className="list-disc ml-4">
                    <li>MetadataPointer</li>
                    <li>TokenMetadata</li>
                    <li>InterestBearingConfig</li>
                    <li>GroupPointer</li>
                    <li>GroupMemberPointer</li>
                    <li>TokenGroup</li>
                    <li>TokenGroupMember</li>
                  </ul>
                </PopoverContent>
              </Popover>
            </FormLabel>
            <FormControl>
              <div className="flex items-center space-x-2">
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isRefreshingTokens}>
                  <SelectTrigger ref={field.ref}>
                    <SelectValue placeholder="Select a token" />
                  </SelectTrigger>
                  <SelectContent>
                    {tokens.map((token) => (
                      <SelectItem
                        key={token.mintAddress.toString()}
                        value={token.mintAddress.toString()}
                        disabled={!token.supported}
                      >
                        {token.name && token.symbol
                          ? `${token.name} (${token.tokenType}): ${normalizeTokenAmount(token.amount, token.decimals).toLocaleString('en-US', { maximumFractionDigits: token.decimals })} ${token.symbol}`
                          : `${token.mintAddress.toString()} (${token.tokenType}): ${normalizeTokenAmount(token.amount, token.decimals).toLocaleString('en-US', { maximumFractionDigits: token.decimals })}`}
                        {!token.supported &&
                          ': Token extensions used by this token are not yet supported by ZK Compression.'}
                      </SelectItem>
                    ))}
                    {noTokensMessage && (
                      <SelectItem value="error" disabled>
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Error</AlertTitle>
                          <AlertDescription>{noTokensMessage}</AlertDescription>
                        </Alert>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onRefreshTokens}
                  disabled={isRefreshingTokens}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshingTokens ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="recipientImportOption"
        render={({ field }) => (
          <FormItem>
            <FormLabel>How would you like to add addresses?</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {[
                  {
                    value: 'saga2',
                    icon: Smartphone,
                    title: 'Import Chapter 2 Preorder Token holders',
                    description:
                      'Import Solana Mobile Chapter 2 Preorder Token holders using the DAS API. This can take a few minutes.',
                  },
                  {
                    value: 'nft',
                    icon: Images,
                    title: 'Import NFT/cNFT Collection holders',
                    description: 'Import NFT/cNFT Collection holders using the DAS API. This can take a few minutes.',
                  },
                  {
                    value: 'spl',
                    icon: Coins,
                    title: 'Import SPL Token holders',
                    description: 'Import SPL Token holders using the DAS API. This can take a few minutes. ',
                  },
                  {
                    value: 'csv',
                    icon: FileSpreadsheet,
                    title: 'Upload a CSV file',
                    description: 'Import addresses from a CSV file. 1 address per line.',
                  },
                ].map((option) => (
                  <div key={option.value} className="relative">
                    <RadioGroupItem value={option.value} id={option.value} className="peer sr-only" />
                    <Label
                      htmlFor={option.value}
                      className="flex items-start rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-full"
                    >
                      <div className="flex h-full">
                        <option.icon className="h-6 w-6 mr-4 mt-1 flex-shrink-0" />
                        <div className="flex flex-col justify-start h-full">
                          <p className="text-sm font-medium leading-none">{option.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                        </div>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {recipientImportOption === 'nft' && (
        <FormField
          control={control}
          name="collectionAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Collection Address</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Enter the NFT collection address"
                  onChange={(e) => {
                    field.onChange(e)
                    setCollectionAddressError(null)
                  }}
                />
              </FormControl>
              {collectionAddressError && (
                <div className="flex items-center space-x-2 text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">{collectionAddressError}</p>
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {recipientImportOption === 'spl' && (
        <FormField
          control={control}
          name="mintAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SPL Token Mint Address</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Enter the SPL Token Mint Address"
                  onChange={(e) => {
                    field.onChange(e)
                    setMintAddressError(null)
                  }}
                />
              </FormControl>
              {mintAddressError && (
                <div className="flex items-center space-x-2 text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">{mintAddressError}</p>
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {recipientImportOption === 'csv' && (
        <div className="space-y-3">
          <Label htmlFor="recipients">CSV file</Label>
          <div
            {...getRootProps()}
            className={`border border-dashed rounded-md p-8 transition-colors duration-200 ease-in-out ${
              isDragActive
                ? 'border-primary bg-primary/10'
                : csvFileError
                  ? 'border-red-50'
                  : 'border-gray-300 hover:border-primary/50 hover:bg-primary/5'
            }`}
          >
            <input {...getInputProps()} />
            {csvFile ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <File className="h-8 w-8 text-white" />
                  <span className="text-sm font-medium">{csvFile.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setCsvFile(null)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  {isDragActive ? (
                    'Drop the CSV file here'
                  ) : (
                    <>
                      Drag and drop a CSV file here, or{' '}
                      <span className="text-primary font-medium">click to select a file</span>
                    </>
                  )}
                </p>
                <p className="mt-1 text-xs text-gray-500">File should contain one address per line</p>
              </div>
            )}
          </div>
          {csvFileError && (
            <div className="flex items-center space-x-2 text-red-500">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">{csvFileError}</p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        <Button onClick={handleImportClick} type="button" disabled={isImporting}>
          Import
        </Button>
        <Dialog
          open={isConfirmDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setImportResult(null)
              setImportError(null)
              setIsImporting(false)
            }
            setIsConfirmDialogOpen(open)
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isImporting ? 'Importing Addresses' : importResult ? 'Import Result' : 'Confirm Import'}
              </DialogTitle>
              <DialogDescription asChild>
                <div className="pt-4 space-y-2">
                  {isImporting ? (
                    <div className="flex space-x-2">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span>Importing addresses, please wait...</span>
                    </div>
                  ) : importResult ? (
                    importResult.success ? (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-green-500">
                          <CircleCheck className="h-4 w-4" />
                          <span className="text-sm">Successfully imported {importResult.count} addresses.</span>
                        </div>
                        {importResult.rejected > 0 && (
                          <div className="flex items-center space-x-2 text-yellow-500">
                            <CircleAlert className="h-4 w-4" />
                            <span className="text-sm">
                              {importResult.rejected} invalid address
                              {importResult.rejected > 1 ? 'es were' : ' was'} not imported.
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-red-500">
                        <CircleAlert className="h-4 w-4" />
                        <span className="text-sm">{importError}</span>
                      </div>
                    )
                  ) : (
                    'Are you sure you want to overwrite the current addresses?'
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>
            {!isImporting && !importResult && (
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" type="button">
                    Cancel
                  </Button>
                </DialogClose>

                <Button
                  onClick={() => {
                    handleImportAddresses()
                  }}
                >
                  Confirm Import
                </Button>
              </DialogFooter>
            )}
            {importResult && (
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button">Close</Button>
                </DialogClose>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <FormField
        control={control}
        name="recipients"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Imported Addresses</FormLabel>
            <FormControl>
              <CodeMirror
                value={field.value}
                onChange={(value) => field.onChange(value)}
                placeholder="One address per line"
                theme="dark"
                height="200px"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
