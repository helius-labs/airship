"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, HelpCircle } from "lucide-react";
import type { Token } from "@repo/airdrop-sender";
import {
  getTokensByOwner,
  normalizeTokenAmount,
  create,
  maxAddressesPerTransaction,
  computeUnitPrice,
  computeUnitLimit,
  baseFee,
  compressionFee,
} from "@repo/airdrop-sender";
import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { Button } from "#components/ui/button";
import { Input } from "#components/ui/input";
import { Textarea } from "#components/ui/textarea";
import { Label } from "#components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "#components/ui/tooltip";
import { Table, TableBody, TableCell, TableRow } from "#components/ui/table";

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

export default function CreateAirdrop() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [privateKey, setPrivateKey] = useState("");
  const [rpcUrl, setRpcUrl] = useState("");
  const [tokens, setTokens] = useState<Token[]>([]);
  const [selectedToken, setSelectedToken] = useState<string>("");
  const [recipients, setRecipients] = useState("");
  const [amountType, setAmountType] = useState<"fixed" | "percent">("fixed");
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
  } | null>(null);

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
      } catch (error) {
        setNoTokensMessage("Error loading tokens. Please try again.");
      }
    }
    void loadTokens();
  }, [privateKey, rpcUrl]);

  const handlePrivateKeyChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const newPrivateKey = e.target.value;
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
    amountValue: bigint
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
      approximateTransactionFee: `${(Number(numberOfTransactions * transactionFee) / 1e9).toFixed(9)} SOL`,
      approximateCompressionFee: `${(Number(BigInt(recipientList.length) * BigInt(compressionFee)) / 1e9).toFixed(9)} SOL`,
    };
  };

  const handleSubmit = async (e: React.FormEvent): void => {
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

        let amountValue: bigint;
        if (amountType === "fixed") {
          const fixedAmount = parseFloat(amount);
          amountValue = BigInt(
            Math.floor(fixedAmount * 10 ** selectedTokenInfo.decimals)
          );
        } else {
          // Percent
          const percentAmount = parseFloat(amount);
          const totalAmount = BigInt(selectedTokenInfo.amount);
          const calculatedAmount =
            (totalAmount * BigInt(Math.floor(percentAmount * 100))) /
            BigInt(10000);
          amountValue = calculatedAmount / BigInt(recipientList.length);
        }

        const overview = calculateAirdropOverview(
          keypair,
          selectedTokenInfo,
          recipientList,
          amountValue
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
      try {
        const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
        const recipientList = recipients
          .split("\n")
          .map((address) => new PublicKey(address.trim()));

        await create({
          signer: keypair.publicKey,
          addresses: recipientList,
          amount: BigInt(amount),
          mintAddress: new PublicKey(selectedToken),
        });

        alert("Airdrop created successfully!");
        router.push("/");
      } catch (error) {
        console.error("Failed to create airdrop:", error);
        alert("Failed to create airdrop. Please try again.");
      }
    }
  };

  const renderStep1 = () => (
    <>
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Label htmlFor="privateKey">Import private key</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>
                <p>To export your private key:</p>
                <ol className="list-decimal list-inside">
                  <li>Open your Solana wallet</li>
                  <li>Go to Settings</li>
                  <li>Find &quot;Export Private Key&quot; option</li>
                  <li>Follow the wallet&apos;s instructions</li>
                </ol>
                <p>Never share your private key with others!</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Textarea
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
        <Label htmlFor="tokenSelect">Select Token to Airdrop</Label>
        {noTokensMessage ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No Tokens Found</AlertTitle>
            <AlertDescription>{noTokensMessage}</AlertDescription>
          </Alert>
        ) : (
          <Select
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
      <div>
        <Label htmlFor="recipients">Recipients</Label>
        <Textarea
          id="recipients"
          onChange={(e) => {
            setRecipients(e.target.value);
          }}
          placeholder="Enter recipient addresses (one per line)"
          required
          value={recipients}
        />
      </div>
    </>
  );

  const renderStep3 = () => (
    <>
      <div>
        <Label htmlFor="amountType">Amount Type</Label>
        <Select
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
      {airdropOverview ? (
        <Table>
          <TableBody>
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
      ) : null}
      <Alert className="mt-4" variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Confirmation</AlertTitle>
        <AlertDescription>
          Are you sure you want to create this airdrop? This action cannot be
          undone.
        </AlertDescription>
      </Alert>
    </>
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-6">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">Create New Airdrop</h1>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          <div className="flex justify-between">
            {step > 1 && (
              <Button
                onClick={() => {
                  setStep(step - 1);
                }}
                type="button"
              >
                Previous
              </Button>
            )}
            <Button
              onClick={() => {
                router.push("/");
              }}
              type="button"
            >
              Cancel
            </Button>
            <Button type="submit">
              {step < 4 ? "Next" : "Confirm and Create Airdrop"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
