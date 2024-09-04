"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "#components/ui/button";
import { Input } from "#components/ui/input";
import { Textarea } from "#components/ui/textarea";
import { Label } from "#components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert";
import { AlertTriangle, HelpCircle } from "lucide-react";
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
import {
  getTokensByOwner,
  normalizeTokenAmount,
  Token,
} from "@repo/airdrop-sender";
import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

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
        // Handle error (e.g., show an error message to the user)
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

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      // TODO: Implement airdrop creation logic using the private key
      // For now, just log the data (remove this in production)
      console.log("Creating airdrop:", {
        privateKey: "***********",
        rpcUrl,
        selectedToken,
        recipients,
        amountType,
        amount,
      });
      router.push("/");
    } catch (error) {
      // Handle error (e.g., show an error message to the user)
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
          value={privateKey}
          onChange={handlePrivateKeyChange}
          placeholder="Paste your private key here"
          required
        />
        {privateKeyError && (
          <p className="text-red-500 text-sm">{privateKeyError}</p>
        )}
        <Alert variant="warning">
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
          value={rpcUrl}
          onChange={handleRpcUrlChange}
          placeholder="Enter RPC URL"
          required
        />
        {rpcUrlError && <p className="text-red-500 text-sm">{rpcUrlError}</p>}
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
          value={recipients}
          onChange={(e) => {
            setRecipients(e.target.value);
          }}
          placeholder="Enter recipient addresses (one per line)"
          required
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
          type="number"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
          }}
          placeholder={
            amountType === "fixed" ? "Enter token amount" : "Enter percentage"
          }
          required
        />
      </div>
    </>
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-6">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">Create New Airdrop</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          <div className="flex justify-between">
            {step > 1 && (
              <Button type="button" onClick={() => setStep(step - 1)}>
                Previous
              </Button>
            )}
            <Button type="button" onClick={() => router.push("/")}>
              Cancel
            </Button>
            <Button type="submit">
              {step < 3 ? "Next" : "Create Airdrop"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
