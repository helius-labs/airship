import * as airdropsender from "@repo/airdrop-sender";
import { useState, useEffect, useCallback } from "react";
import {
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Loader2,
  Upload,
} from "lucide-react";
import type { Token } from "@repo/airdrop-sender";
import {
  getTokensByOwner,
  normalizeTokenAmount,
  maxAddressesPerTransaction,
  computeUnitPrice,
  computeUnitLimit,
  baseFee,
  compressionFee,
  getCollectionHolders,
  getTokenAccounts,
  saga2PreOrderTokenMintAddress,
} from "@repo/airdrop-sender";
import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import CodeMirror from "@uiw/react-codemirror";
import { Label } from "../components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Table, TableBody, TableCell, TableRow } from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { useDropzone } from "react-dropzone";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";

const airdropSenderWorker = new ComlinkWorker<
  typeof import("../lib/airdropSenderWorker.ts")
>(new URL("../lib/airdropSenderWorker.js", import.meta.url), {
  name: "airdropSenderWorker",
  type: "module",
});

interface CreateAirdropProps {
  onBackToHome: () => void;
}

function isValidPrivateKey(key: string): boolean {
  try {
    Keypair.fromSecretKey(bs58.decode(key));
    return true;
  } catch {
    return false;
  }
}

function isValidRpcUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function CreateAirdrop({ onBackToHome }: CreateAirdropProps) {
  const [step, setStep] = useState(1);
  const [privateKey, setPrivateKey] = useState("");
  const [rpcUrl, setRpcUrl] = useState("");
  const [tokens, setTokens] = useState<Token[]>([]);
  const [selectedToken, setSelectedToken] = useState<string>("");
  const [recipients, setRecipients] = useState("");
  const [amountType, setAmountType] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [privateKeyError, setPrivateKeyError] = useState<string | null>(null);
  const [rpcUrlError, setRpcUrlError] = useState<string | null>(null);
  const [noTokensMessage, setNoTokensMessage] = useState<string | null>(null);
  const [airdropOverview, setAirdropOverview] = useState<{
    keypairAddress: string;
    token: string;
    totalAddresses: number;
    amountPerAddress: string;
    totalAmount: string;
    numberOfTransactions: number;
    approximateTransactionFee: string;
    approximateCompressionFee: string;
    rpcUrl: string;
  } | null>(null);
  const [amountValue, setAmountValue] = useState<bigint | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [finalizeProgress, setFinalizeProgress] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [sentTransactions, setSentTransactions] = useState(0);
  const [finalizedTransactions, setFinalizedTransactions] = useState(0);
  const [isAirdropInProgress, setIsAirdropInProgress] = useState(false);
  const [isAirdropComplete, setIsAirdropComplete] = useState(false);
  const [recipientImportOption, setRecipientImportOption] =
    useState<string>("saga2");
  const [collectionAddress, setCollectionAddress] = useState("");
  const [mintAddress, setMintAddress] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTokens() {
      if (!privateKey || !rpcUrl) return;
      try {
        const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
        const ownerAddress = keypair.publicKey;
        const loadedTokens = await getTokensByOwner({
          ownerAddress,
          url: rpcUrl,
        });
        setTokens(loadedTokens);
        if (loadedTokens.length === 0) {
          setNoTokensMessage(
            `No tokens found. Please transfer or mint tokens to ${keypair.publicKey.toBase58()}`
          );
        } else {
          setNoTokensMessage(null);
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        setNoTokensMessage("Error loading tokens. Please try again.");
      }
    }
    void loadTokens();
  }, [privateKey, rpcUrl]);

  const handlePrivateKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPrivateKey = e.target.value.trim();
    setPrivateKey(newPrivateKey);
    if (newPrivateKey) {
      if (isValidPrivateKey(newPrivateKey)) {
        setPrivateKeyError(null);
      } else {
        setPrivateKeyError("Invalid private key format");
      }
    } else {
      setPrivateKeyError(null);
    }
  };

  const handleRpcUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRpcUrl = e.target.value;
    setRpcUrl(newRpcUrl);
    if (newRpcUrl) {
      if (isValidRpcUrl(newRpcUrl)) {
        setRpcUrlError(null);
      } else {
        setRpcUrlError("Invalid RPC URL format");
      }
    } else {
      setRpcUrlError(null);
    }
  };

  const calculateAirdropOverview = (
    keypair: Keypair,
    selectedTokenInfo: Token,
    recipientList: PublicKey[],
    amountValue: bigint,
    rpcUrl: string
  ) => {
    const numberOfTransactions = BigInt(
      Math.ceil(recipientList.length / Number(maxAddressesPerTransaction))
    );
    const transactionFee =
      BigInt(baseFee) +
      (BigInt(computeUnitLimit) * BigInt(computeUnitPrice)) / BigInt(1e9);

    const totalAmount = amountValue * BigInt(recipientList.length);

    return {
      keypairAddress: keypair.publicKey.toBase58(),
      token: selectedTokenInfo.name || selectedTokenInfo.mintAddress.toString(),
      totalAddresses: recipientList.length,
      amountPerAddress: normalizeTokenAmount(
        amountValue.toString(),
        selectedTokenInfo.decimals
      ).toLocaleString("en-US", {
        maximumFractionDigits: selectedTokenInfo.decimals,
      }),
      totalAmount: normalizeTokenAmount(
        totalAmount.toString(),
        selectedTokenInfo.decimals
      ).toLocaleString("en-US", {
        maximumFractionDigits: selectedTokenInfo.decimals,
      }),
      numberOfTransactions: Number(numberOfTransactions),
      approximateTransactionFee: `${Number(numberOfTransactions * transactionFee) / 1e9} SOL`,
      approximateCompressionFee: `${Number(BigInt(recipientList.length) * BigInt(compressionFee)) / 1e9} SOL`,
      rpcUrl: rpcUrl,
    };
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (step < 3) {
      if (
        step === 1 &&
        (!isValidPrivateKey(privateKey) || !isValidRpcUrl(rpcUrl))
      ) {
        if (!isValidPrivateKey(privateKey))
          setPrivateKeyError("Private key is required");
        if (!isValidRpcUrl(rpcUrl)) setRpcUrlError("Invalid RPC URL format");
        return;
      }
      setStep(step + 1);
      return;
    }

    if (step === 3) {
      try {
        const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
        const recipientList = recipients
          .split("\n")
          .map((address) => new PublicKey(address.trim()));

        const selectedTokenInfo = tokens.find(
          (t) => t.mintAddress.toString() === selectedToken
        );

        if (!selectedTokenInfo) {
          throw new Error("Selected token not found");
        }

        let calculatedAmountValue: bigint;
        if (amountType === "fixed") {
          const fixedAmount = parseFloat(amount);
          calculatedAmountValue = BigInt(
            Math.floor(fixedAmount * 10 ** selectedTokenInfo.decimals)
          );
        } else {
          // Percent
          const percentAmount = parseFloat(amount);
          const totalAmount = BigInt(selectedTokenInfo.amount);
          const calculatedAmount =
            (totalAmount * BigInt(Math.floor(percentAmount * 100))) /
            BigInt(10000);
          calculatedAmountValue =
            calculatedAmount / BigInt(recipientList.length);
        }

        setAmountValue(calculatedAmountValue);

        const overview = calculateAirdropOverview(
          keypair,
          selectedTokenInfo,
          recipientList,
          calculatedAmountValue,
          rpcUrl
        );
        setAirdropOverview(overview);
        setStep(4);
      } catch (error) {
        console.error("Failed to calculate airdrop overview:", error);
        alert("Failed to calculate airdrop overview. Please try again.");
      }
      return;
    }

    if (step === 4) {
      setShowConfirmDialog(true);
    }
  };

  const handleSendAirdrop = async () => {
    setShowConfirmDialog(false);
    setIsAirdropInProgress(true);
    setStep(5); // Move to step 5 when airdrop starts

    try {
      if (!amountValue) {
        throw new Error("Amount value is not set");
      }

      const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
      const recipientList = recipients
        .split("\n")
        .map((address) => new PublicKey(address.trim()));

      await airdropSenderWorker.create(
        keypair.publicKey.toBase58(),
        recipientList.map((r) => r.toBase58()),
        amountValue,
        selectedToken
      );

      airdropSenderWorker.send(privateKey, rpcUrl);
      airdropSenderWorker.poll(rpcUrl);

      const monitorInterval = setInterval(async () => {
        const currentStatus = await airdropsender.status();
        setSendProgress((currentStatus.sent / currentStatus.total) * 100);
        setFinalizeProgress(
          (currentStatus.finalized / currentStatus.total) * 100
        );
        setTotalTransactions(currentStatus.total);
        setSentTransactions(currentStatus.sent);
        setFinalizedTransactions(currentStatus.finalized);

        if (currentStatus.finalized === currentStatus.total) {
          clearInterval(monitorInterval);
          setIsAirdropInProgress(false);
          setIsAirdropComplete(true);
        }
      }, 1000);
    } catch (error) {
      console.error("Failed to create airdrop:", error);
      alert("Failed to create airdrop. Please try again.");
      setIsAirdropInProgress(false);
      setStep(4); // Go back to step 4 if there's an error
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setCsvFile(file);
    }
  }, []);

  const recipientsOnChange = useCallback((value, viewUpdate) => {
    setRecipients(value);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    multiple: false,
  });

  const handleImportAddresses = async () => {
    setIsImporting(true);
    setImportError(null);
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

      setRecipients(addresses.join("\n"));
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

  const renderStep1 = () => (
    <>
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Label htmlFor="privateKey">Private key</Label>
          <Popover>
            <PopoverTrigger>
              <HelpCircle className="h-4 w-4" />
            </PopoverTrigger>
            <PopoverContent>
              <p>To export your private key:</p>
              <ol className="list-decimal list-inside">
                <li>Open your Solana wallet</li>
                <li>Go to Settings</li>
                <li>Find &quot;Export Private Key&quot; option</li>
                <li>Follow the wallet&apos;s instructions</li>
              </ol>
              <p>Never share your private key with others!</p>
            </PopoverContent>
          </Popover>
        </div>
        <Input
          id="privateKey"
          onChange={handlePrivateKeyChange}
          placeholder="Paste your private key here"
          required
          value={privateKey}
        />
        {privateKeyError ? (
          <p className="text-red-500 text-sm">{privateKeyError}</p>
        ) : null}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            This private key will be used to cover transaction costs and sign
            all airdrop transactions. It will be stored in memory only for this
            session. Please ensure you understand the associated risks.
          </AlertDescription>
        </Alert>
      </div>
      <div>
        <Label htmlFor="rpcUrl">RPC URL</Label>
        <Input
          id="rpcUrl"
          onChange={handleRpcUrlChange}
          placeholder="Enter RPC URL"
          required
          value={rpcUrl}
        />
        {rpcUrlError ? (
          <p className="text-red-500 text-sm">{rpcUrlError}</p>
        ) : null}
      </div>
    </>
  );

  const renderStep2 = () => (
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

  const renderStep3 = () => (
    <>
      <div>
        <Label htmlFor="amountType">
          What amount would you like to airdrop?
        </Label>
        <Select
          value={amountType}
          onValueChange={(value: "fixed" | "percent") => {
            setAmountType(value);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select amount type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">
              Fixed token amount per address
            </SelectItem>
            <SelectItem value="percent">% of total available tokens</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          onChange={(e) => {
            setAmount(e.target.value);
          }}
          placeholder={
            amountType === "fixed" ? "Enter token amount" : "Enter percentage"
          }
          required
          type="number"
          value={amount}
        />
      </div>
    </>
  );

  const renderStep4 = () => (
    <>
      <h2 className="text-2xl font-semibold mb-4">Airdrop Overview</h2>
      {airdropOverview && (
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
              <TableCell className="font-medium">
                Number of transactions
              </TableCell>
              <TableCell>{airdropOverview.numberOfTransactions}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">
                Approximate transaction fee
              </TableCell>
              <TableCell>{airdropOverview.approximateTransactionFee}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">
                Approximate compression fee
              </TableCell>
              <TableCell>{airdropOverview.approximateCompressionFee}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    </>
  );

  const renderStep5 = () => (
    <>
      {isAirdropInProgress && (
        <>
          <h2 className="text-2xl font-semibold mb-4">Airdrop Progress</h2>
          <div className="mt-4">
            <p>
              Transactions sent: {Math.round(sendProgress)}% ({sentTransactions}
              /{totalTransactions})
            </p>
            <Progress value={sendProgress} className="w-full" />
          </div>
          <div className="mt-4">
            <p>
              Transactions finalized: {Math.round(finalizeProgress)}% (
              {finalizedTransactions}/{totalTransactions})
            </p>
            <Progress value={finalizeProgress} className="w-full" />
          </div>
        </>
      )}
      {isAirdropComplete && (
        <div className="my-8 text-center">
          <h3 className="text-3xl font-bold text-green-500 mb-2">
            🎉 Airdrop Complete! 🎉
          </h3>
          <p className="text-xl">
            Congratulations! Your tokens have been successfully airdropped.
          </p>
          <Button onClick={onBackToHome} className="mt-4">
            Back to Home
          </Button>
        </div>
      )}
    </>
  );

  return (
    <main className="flex flex-col items-center justify-center min-h-screen">
      <div className="bg-background/95 backdrop-blur-sm rounded-lg p-8 w-full max-w-4xl">
        <div className="w-full">
          {!isAirdropComplete && (
            <h1 className="text-3xl font-bold mb-6 text-primary">
              {isAirdropInProgress ? "Sending Airdrop" : "Create New Airdrop"}
            </h1>
          )}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            {step === 5 && renderStep5()}
            {!isAirdropInProgress && !isAirdropComplete && step < 5 && (
              <div className="flex justify-between items-center">
                <div>
                  {step > 1 && (
                    <Button
                      onClick={() => setStep(step - 1)}
                      type="button"
                      variant="outline"
                    >
                      Previous
                    </Button>
                  )}
                </div>
                <div>
                  {step < 4 ? (
                    <Button type="submit">Next</Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => setShowConfirmDialog(true)}
                    >
                      Send
                    </Button>
                  )}
                </div>
              </div>
            )}
          </form>

          <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Airdrop</DialogTitle>
                <DialogDescription>
                  Are you sure you want to send the airdrop?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSendAirdrop}>
                  Confirm and Send Airdrop
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {!isAirdropInProgress && !isAirdropComplete && step < 5 && (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onBackToHome();
          }}
          className="mt-4 text-primary text-white font-semibold shadow-lg hover:underline"
        >
          Back to Home
        </a>
      )}
    </main>
  );
}
