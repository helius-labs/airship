import * as airdropsender from "@repo/airdrop-sender";
import { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import Step1 from "./airdrop-steps/Step1";
import Step2 from "./airdrop-steps/Step2";
import Step3 from "./airdrop-steps/Step3";
import Step4 from "./airdrop-steps/Step4";
import Step5 from "./airdrop-steps/Step5";

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

      if (addresses.length === 0) {
        throw new Error(
          "No addresses found are you using devnet? Please check your input and try again. "
        );
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
            {step === 1 && (
              <Step1
                privateKey={privateKey}
                rpcUrl={rpcUrl}
                privateKeyError={privateKeyError}
                rpcUrlError={rpcUrlError}
                handlePrivateKeyChange={handlePrivateKeyChange}
                handleRpcUrlChange={handleRpcUrlChange}
              />
            )}
            {step === 2 && (
              <Step2
                tokens={tokens}
                selectedToken={selectedToken}
                setSelectedToken={setSelectedToken}
                noTokensMessage={noTokensMessage}
                recipientImportOption={recipientImportOption}
                setRecipientImportOption={setRecipientImportOption}
                collectionAddress={collectionAddress}
                setCollectionAddress={setCollectionAddress}
                mintAddress={mintAddress}
                setMintAddress={setMintAddress}
                csvFile={csvFile}
                setCsvFile={setCsvFile}
                recipients={recipients}
                setRecipients={setRecipients}
                handleImportAddresses={handleImportAddresses}
                isImporting={isImporting}
                importError={importError}
              />
            )}
            {step === 3 && (
              <Step3
                amountType={amountType}
                setAmountType={setAmountType}
                amount={amount}
                setAmount={setAmount}
              />
            )}
            {step === 4 && <Step4 airdropOverview={airdropOverview} />}
            {step === 5 && (
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
            )}
            {!isAirdropInProgress && !isAirdropComplete && step < 5 && (
              <div className="flex justify-between items-center">
                {step === 1 && (
                  <div>
                    <Button
                      onClick={onBackToHome}
                      type="button"
                      variant="outline"
                    >
                      Previous
                    </Button>
                  </div>
                )}
                {step > 1 && (
                  <div>
                    <Button
                      onClick={() => setStep(step - 1)}
                      type="button"
                      variant="outline"
                    >
                      Previous
                    </Button>
                  </div>
                )}
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
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Airdrop</DialogTitle>
            <DialogDescription>
              Are you sure you want to send this airdrop?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSendAirdrop}>Send Airdrop</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
