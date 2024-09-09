import { useCallback } from "react";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { AlertCircle, AlertTriangle, HelpCircle, Upload } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { normalizeTokenAmount, Token } from "@repo/airdrop-sender";
import { useDropzone } from "react-dropzone";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

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
  setRecipients: (value: string) => void;
  handleImportAddresses: () => Promise<void>;
  isImporting: boolean;
  importError: string | null;
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
  setRecipients,
  handleImportAddresses,
  isImporting,
  importError,
}: Step2Props) {
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
    <>
      <div>
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
      <div className="space-y-4">
        <Label>Who would you like the airdrop to be sent to?</Label>
        <RadioGroup
          value={recipientImportOption}
          onValueChange={setRecipientImportOption}
        >
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="saga2" id="saga2" />
              <Label htmlFor="saga2" className="font-normal cursor-pointer">
                Solana Mobile - Chapter 2 Preorder Token holders
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="nft" id="nft" />
              <Label htmlFor="nft" className="font-normal cursor-pointer">
                NFT/cNFT collection holders
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="spl" id="spl" />
              <Label htmlFor="spl" className="font-normal cursor-pointer">
                SPL token holders
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="csv" id="csv" />
              <Label htmlFor="csv" className="font-normal cursor-pointer">
                Import from CSV
              </Label>
            </div>
          </div>
        </RadioGroup>
      </div>
      {recipientImportOption === "nft" && (
        <div className="space-y-2">
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
            onChange={(e) => setCollectionAddress(e.target.value)}
          />
        </div>
      )}
      {recipientImportOption === "spl" && (
        <div className="space-y-2">
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
            onChange={(e) => setMintAddress(e.target.value)}
          />
        </div>
      )}
      {recipientImportOption === "csv" && (
        <div className="space-y-4">
          <Label htmlFor="recipients">CSV file</Label>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer ${
              isDragActive ? "border-primary" : "border-gray-300"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            {csvFile ? (
              <p className="mt-2">{csvFile.name}</p>
            ) : (
              <p className="mt-2">
                {isDragActive
                  ? "Drop the CSV file here"
                  : "Drag and drop a CSV file here, or click to select a file"}
              </p>
            )}
          </div>
        </div>
      )}
      <Button onClick={handleImportAddresses} disabled={isImporting}>
        {isImporting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Importing...
          </>
        ) : (
          "Import"
        )}
      </Button>
      {importError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{importError}</AlertDescription>
        </Alert>
      )}
      <div>
        <Label htmlFor="recipients">Addresses</Label>
        <CodeMirror
          id="recipients"
          value={recipients}
          onChange={recipientsOnChange}
          placeholder="One address per line"
          theme="dark"
          height="350px"
        />
      </div>
    </>
  );
}
