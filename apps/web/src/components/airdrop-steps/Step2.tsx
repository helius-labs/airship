import { useCallback, useState, useEffect } from "react";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import {
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Upload,
  File,
  X,
  Loader2,
  Smartphone,
  Images,
  Coins,
  FileSpreadsheet,
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import CodeMirror from "@uiw/react-codemirror";
import {
  isFungibleToken,
  isNFTCollection,
  isSolanaAddress,
  normalizeTokenAmount,
  Token,
} from "@repo/airdrop-sender";
import { useDropzone } from "react-dropzone";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  getCollectionHolders,
  getTokenAccounts,
  saga2PreOrderTokenMintAddress,
} from "@repo/airdrop-sender";
import { PublicKey } from "@solana/web3.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

interface Step2Props {
  tokens: Token[];
  selectedToken: string;
  setSelectedToken: (value: string) => void;
  noTokensMessage: string | null;
  recipientImportOption: string;
  setRecipientImportOption: (value: string) => void;
  collectionAddress: string;
  setCollectionAddress: (value: string) => void;
  mintAddress: string;
  setMintAddress: (value: string) => void;
  csvFile: File | null;
  setCsvFile: (file: File | null) => void;
  recipients: string;
  rpcUrl: string;
  setRecipients: (value: string) => void;
}

export default function Step2({
  tokens,
  selectedToken,
  setSelectedToken,
  noTokensMessage,
  recipientImportOption,
  setRecipientImportOption,
  collectionAddress,
  setCollectionAddress,
  mintAddress,
  setMintAddress,
  csvFile,
  setCsvFile,
  recipients,
  rpcUrl,
  setRecipients,
}: Step2Props) {
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [collectionAddressError, setCollectionAddressError] = useState<
    string | null
  >(null);
  const [mintAddressError, setMintAddressError] = useState<string | null>(null);

  useEffect(() => {
    setImportError(null);
  }, [recipientImportOption]);

  const validateInput = async (): Promise<string | null> => {
    switch (recipientImportOption) {
      case "nft":
        if (!isSolanaAddress(collectionAddress)) {
          setCollectionAddressError("Please enter a collection address");
          return "Please enter a collection address";
        }
        if (
          !(await isNFTCollection({
            url: rpcUrl,
            collectionAddress: new PublicKey(collectionAddress),
          }))
        ) {
          setCollectionAddressError(
            "Collection not found please check the address"
          );
          return "Collection not found please check the address";
        }
        setCollectionAddressError(null);
        break;
      case "spl":
        if (!isSolanaAddress(mintAddress)) {
          setMintAddressError("Please enter a mint address");
          return "Please enter a mint address";
        }
        if (
          !(await isFungibleToken({
            url: rpcUrl,
            tokenAddress: new PublicKey(mintAddress),
          }))
        ) {
          setMintAddressError("Token not found please check the address");
          return "Token not found please check the address";
        }
        setMintAddressError(null);
        break;
      case "csv":
        if (!csvFile) {
          return "Please import a CSV file";
        }
        break;
      // No validation needed for "saga2" option
    }
    return null;
  };

  const handleImportClick = async () => {
    const validationError = await validateInput();
    console.log(validationError);
    if (!validationError) {
      setIsConfirmDialogOpen(true);
    }
  };

  const handleImportAddresses = async () => {
    setIsImporting(true);
    setImportError(null);
    setRecipients("");
    let addresses: string[] = [];

    try {
      switch (recipientImportOption) {
        case "saga2": {
          const saga2Accounts = await getTokenAccounts({
            tokenMintAddress: saga2PreOrderTokenMintAddress,
            url: rpcUrl,
          });
          addresses = saga2Accounts.map((account) => account.owner.toBase58());
          break;
        }
        case "nft": {
          if (!collectionAddress) {
            throw new Error("Please enter a collection address");
          }
          const nftHolders = await getCollectionHolders({
            collectionAddress: new PublicKey(collectionAddress),
            url: rpcUrl,
          });
          addresses = nftHolders.map((holder) => holder.owner.toBase58());
          break;
        }
        case "spl": {
          if (!mintAddress) {
            throw new Error("Please enter a mint address");
          }
          const splAccounts = await getTokenAccounts({
            tokenMintAddress: new PublicKey(mintAddress),
            url: rpcUrl,
          });
          addresses = splAccounts.map((account) => account.owner.toBase58());
          break;
        }
        case "csv":
          if (!csvFile) {
            throw new Error("Please import a CSV file");
          }
          addresses = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const content = e.target?.result as string;
              const lines = content
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line);
              resolve(lines);
            };
            reader.onerror = (error) => reject(error);
            reader.readAsText(csvFile);
          });
          break;
      }

      if (addresses.length === 0) {
        throw new Error(
          "No addresses found. Are you maybe connected to Devnet? Please check your input and try again."
        );
      } else {
        setRecipients(addresses.join("\n"));
      }
    } catch (error) {
      console.error("Failed to import addresses:", error);
      setImportError(
        error instanceof Error
          ? error.message
          : "Failed to import addresses. Please try again."
      );
    } finally {
      setIsImporting(false);
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setCsvFile(file);
      }
    },
    [setCsvFile]
  );

  const recipientsOnChange = useCallback(
    (value: string) => {
      setRecipients(value);
    },
    [setRecipients]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    multiple: false,
  });

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label htmlFor="tokenSelect">Which token do you want to airdrop?</Label>
        {noTokensMessage ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No Tokens Found</AlertTitle>
            <AlertDescription>{noTokensMessage}</AlertDescription>
          </Alert>
        ) : (
          <Select
            value={selectedToken}
            onValueChange={(value) => {
              setSelectedToken(value);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a token" />
            </SelectTrigger>
            <SelectContent>
              {tokens.map((token) => (
                <SelectItem
                  key={token.mintAddress.toString()}
                  value={token.mintAddress.toString()}
                >
                  {token.name && token.symbol
                    ? `${token.name}: ${normalizeTokenAmount(token.amount, token.decimals).toLocaleString("en-US", { maximumFractionDigits: token.decimals })} ${token.symbol}`
                    : `${token.mintAddress.toString()}: ${normalizeTokenAmount(token.amount, token.decimals).toLocaleString("en-US", { maximumFractionDigits: token.decimals })}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="space-y-3">
        <Label>How would you like to add addresses?</Label>
        <RadioGroup
          value={recipientImportOption}
          onValueChange={setRecipientImportOption}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {[
            {
              value: "saga2",
              icon: Smartphone,
              title: "Import Chapter 2 Preorder Token holders",
              description:
                "Import Solana Mobile Chapter 2 Preorder Token holders using the DAS API. This can take a few minutes.",
            },
            {
              value: "nft",
              icon: Images,
              title: "Import NFT/cNFT Collection holders",
              description:
                "Import NFT/cNFT Collection holders using the DAS API. This can take a few minutes.",
            },
            {
              value: "spl",
              icon: Coins,
              title: "Import SPL Token holders",
              description:
                "Import SPL Token holders using the DAS API. This can take a few minutes. ",
            },
            {
              value: "csv",
              icon: FileSpreadsheet,
              title: "Upload a CSV file",
              description:
                "Import addresses from a CSV file. 1 address per line.",
            },
          ].map((option) => (
            <div key={option.value} className="relative">
              <RadioGroupItem
                value={option.value}
                id={option.value}
                className="peer sr-only"
              />
              <Label
                htmlFor={option.value}
                className="flex items-start rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-full"
              >
                <div className="flex h-full">
                  <option.icon className="h-6 w-6 mr-4 mt-1 flex-shrink-0" />
                  <div className="flex flex-col justify-start h-full">
                    <p className="text-sm font-medium leading-none">
                      {option.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
      {recipientImportOption === "nft" && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Label htmlFor="collectionAddress">Collection Address</Label>
            <Popover>
              <PopoverTrigger>
                <HelpCircle className="h-4 w-4" />
              </PopoverTrigger>
              <PopoverContent>
                <p>To find the collection address:</p>
                <ol className="list-decimal list-inside">
                  <li>
                    Go to a Solana explorer (e.g., Solana Explorer or Solscan)
                  </li>
                  <li>Search for an NFT from the collection</li>
                  <li>
                    Look for &quot;Collection&quot; or &quot;Collection
                    Address&quot;
                  </li>
                  <li>Copy the address associated with the collection</li>
                </ol>
              </PopoverContent>
            </Popover>
          </div>
          <Input
            id="collectionAddress"
            placeholder="Enter the NFT collection address"
            value={collectionAddress}
            onChange={(e) => {
              setCollectionAddress(e.target.value);
              setCollectionAddressError(null);
            }}
          />
          {collectionAddressError && (
            <p className="text-sm text-red-500">{collectionAddressError}</p>
          )}
        </div>
      )}
      {recipientImportOption === "spl" && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Label htmlFor="mintAddress">SPL Token Mint Address</Label>
            <Popover>
              <PopoverTrigger>
                <HelpCircle className="h-4 w-4" />
              </PopoverTrigger>
              <PopoverContent>
                <p>To find the SPL Token Mint Address:</p>
                <ol className="list-decimal list-inside">
                  <li>
                    Go to a Solana explorer (e.g., Solana Explorer or Solscan)
                  </li>
                  <li>Search for the token by its name or symbol</li>
                  <li>
                    Look for &quot;Mint Address&quot; or &quot;Token
                    Address&quot;
                  </li>
                  <li>Copy the address associated with the token</li>
                </ol>
                <p>
                  Note: This is different from your personal token account
                  address.
                </p>
              </PopoverContent>
            </Popover>
          </div>
          <Input
            id="mintAddress"
            placeholder="Enter the SPL Token Mint Address"
            value={mintAddress}
            onChange={(e) => {
              setMintAddress(e.target.value);
              setMintAddressError(null);
            }}
          />
          {mintAddressError && (
            <p className="text-sm text-red-500">{mintAddressError}</p>
          )}
        </div>
      )}

      {recipientImportOption === "csv" && (
        <div className="space-y-3">
          <Label htmlFor="recipients">CSV file</Label>
          <div
            {...getRootProps()}
            className={`border border-dashed rounded-md p-8 transition-colors duration-200 ease-in-out ${
              isDragActive
                ? "border-primary bg-primary/10"
                : "border-gray-300 hover:border-primary/50 hover:bg-primary/5"
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
                    e.stopPropagation();
                    setCsvFile(null);
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
                    "Drop the CSV file here"
                  ) : (
                    <>
                      Drag and drop a CSV file here, or{" "}
                      <span className="text-primary font-medium">
                        click to select a file
                      </span>
                    </>
                  )}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  File should contain one address per line
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Button
          onClick={handleImportClick}
          type="button"
          disabled={isImporting}
        >
          {isImporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importing...
            </>
          ) : (
            "Import"
          )}
        </Button>
        <Dialog
          open={isConfirmDialogOpen}
          onOpenChange={setIsConfirmDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Import</DialogTitle>
              <DialogDescription>
                Are you sure you want to overwrite the current addresses?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsConfirmDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setIsConfirmDialogOpen(false);
                  handleImportAddresses();
                }}
              >
                Confirm Import
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {importError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{importError}</AlertDescription>
          </Alert>
        )}
      </div>
      <div className="space-y-3">
        <Label htmlFor="recipients">Imported Addresses</Label>
        <CodeMirror
          id="recipients"
          value={recipients}
          onChange={recipientsOnChange}
          placeholder="One address per line"
          theme="dark"
          height="300px"
        />
      </div>
    </div>
  );
}
