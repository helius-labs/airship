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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Step1 from "./airdrop-steps/Step1";
import Step2 from "./airdrop-steps/Step2";
import Step3 from "./airdrop-steps/Step3";
import Step4 from "./airdrop-steps/Step4";
import Step5 from "./airdrop-steps/Step5";
import { Loader2 } from "lucide-react";
import { AirdropSenderWorker } from "@/types/AirdropSenderWorker";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { formSchema, FormValues } from "@/schemas/formSchema";

interface CreateAirdropProps {
  db: airdropsender.BrowserDatabase;
  airdropSenderWorker: AirdropSenderWorker;
  onBackToHome: () => void;
}

export function CreateAirdrop({
  db,
  airdropSenderWorker,
  onBackToHome,
}: CreateAirdropProps) {
  const [step, setStep] = useState(1);
  const [tokens, setTokens] = useState<Token[]>([]);
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
  const [isCreatingAirdrop, setIsCreatingAirdrop] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      privateKey: "",
      rpcUrl: "",
      selectedToken: "",
      recipients: "",
      amountType: "fixed",
      amount: "",
    },
  });

  const { watch } = form;
  const privateKey = watch("privateKey");
  const rpcUrl = watch("rpcUrl");
  const selectedToken = watch("selectedToken");
  const recipients = watch("recipients");

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

  const handleSendAirdrop = async () => {
    setShowConfirmDialog(false);
    setIsCreatingAirdrop(true);

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

      setIsCreatingAirdrop(false);
      setIsAirdropInProgress(true);
      setStep(5); // Move to step 5 when airdrop starts

      airdropSenderWorker.send(privateKey, rpcUrl);
      airdropSenderWorker.poll(rpcUrl);

      const monitorInterval = setInterval(async () => {
        const currentStatus = await airdropsender.status({ db });
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
      setIsCreatingAirdrop(false);
      setIsAirdropInProgress(false);
      setStep(4); // Go back to step 4 if there's an error
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    if (step === 3) {
      console.log(values);
      try {
        const keypair = Keypair.fromSecretKey(bs58.decode(values.privateKey));
        const recipientList =
          values.recipients
            ?.split("\n")
            .map((address) => new PublicKey(address.trim())) || [];

        const selectedTokenInfo = tokens.find(
          (t) => t.mintAddress.toString() === values.selectedToken
        );

        if (!selectedTokenInfo) {
          throw new Error("Selected token not found");
        }

        let calculatedAmountValue: bigint;
        if (values.amountType === "fixed") {
          const fixedAmount = parseFloat(values.amount || "0");
          calculatedAmountValue = BigInt(
            Math.floor(fixedAmount * 10 ** selectedTokenInfo.decimals)
          );
        } else {
          // Percent
          const percentAmount = parseFloat(values.amount || "0");
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
          values.rpcUrl
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

  return (
    <main className="flex flex-col items-center justify-top my-12 space-y-12">
      <img src="/airship-logo.svg" className="max-w-xl" alt="Airship Logo" />
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary">
            {isCreatingAirdrop
              ? "Creating Airdrop"
              : isAirdropInProgress
                ? "Sending Airdrop"
                : "Create New Airdrop"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isCreatingAirdrop ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin" />
              <p>Creating airdrop... Please wait.</p>
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {step === 1 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Step 1: Setup Your Wallet</CardTitle>
                      <CardDescription>
                        To handle transaction fees and automatically sign
                        transactions, you'll need to provide a private key. For
                        security, we recommend creating a new wallet just for
                        this purpose and transferring the necessary tokens and
                        funds to it.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Step1 form={form} />
                    </CardContent>
                  </Card>
                )}
                {step === 2 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        Step 2: Choose Token & Import Addresses
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Step2 form={form} tokens={tokens} rpcUrl={rpcUrl} />
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
                      <Step4 airdropOverview={airdropOverview} />
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
                    </CardContent>
                  </Card>
                )}
                {!isAirdropInProgress && !isAirdropComplete && step < 5 && (
                  <div className="flex justify-between items-center">
                    {step === 1 ? (
                      <Button
                        onClick={onBackToHome}
                        type="button"
                        variant="outline"
                      >
                        Previous
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setStep(step - 1)}
                        type="button"
                        variant="outline"
                      >
                        Previous
                      </Button>
                    )}
                    <Button type="submit">{step < 4 ? "Next" : "Send"}</Button>
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
            e.preventDefault();
            onBackToHome();
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
