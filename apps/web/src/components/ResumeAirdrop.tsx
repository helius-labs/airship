import { useState, useEffect } from "react";
import * as airdropsender from "@repo/airdrop-sender";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import Step1 from "./airdrop-steps/Step1";
import Step5 from "./airdrop-steps/Step5";
import { AirdropSenderWorker } from "@/types/AirdropSenderWorker";
import { useForm } from "react-hook-form";
import { formSchema, FormValues } from "@/schemas/formSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";

interface ResumeAirdropProps {
  db: airdropsender.BrowserDatabase;
  airdropSenderWorker: AirdropSenderWorker;
  onBackToHome: () => void;
}

export function ResumeAirdrop({
  db,
  airdropSenderWorker,
  onBackToHome,
}: ResumeAirdropProps) {
  const [step, setStep] = useState(1);
  const [isAirdropInProgress, setIsAirdropInProgress] = useState(false);
  const [isAirdropComplete, setIsAirdropComplete] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [finalizeProgress, setFinalizeProgress] = useState(0);
  const [sentTransactions, setSentTransactions] = useState(0);
  const [finalizedTransactions, setFinalizedTransactions] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);

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

  useEffect(() => {
    async function loadAirdropStatus() {
      const status = await airdropsender.status({ db });
      setSendProgress((status.sent / status.total) * 100);
      setFinalizeProgress((status.finalized / status.total) * 100);
      setTotalTransactions(status.total);
      setSentTransactions(status.sent);
      setFinalizedTransactions(status.finalized);
    }
    void loadAirdropStatus();
  }, [db]);

  const onSubmit = async (values: FormValues) => {
    setIsAirdropInProgress(true);
    setStep(2);

    const { privateKey, rpcUrl } = values;

    try {
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
      console.error("Failed to resume airdrop:", error);
      alert("Failed to resume airdrop. Please try again.");
      setIsAirdropInProgress(false);
      setStep(1);
    }
  };

  return (
    <main className="flex flex-col items-center justify-top my-12 space-y-12">
      <img src="/airship-logo.svg" className="max-w-xl" />
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary">
            Resume Airdrop
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              {step === 1 && (
                <div className="flex justify-between items-center">
                  <Button
                    onClick={onBackToHome}
                    type="button"
                    variant="outline"
                  >
                    Previous
                  </Button>
                  <Button type="submit">Resume Airdrop</Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
      {!isAirdropInProgress && !isAirdropComplete && (
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
    </main>
  );
}
