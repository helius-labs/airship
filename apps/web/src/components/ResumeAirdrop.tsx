import { useState, useEffect } from "react";
import * as airdropsender from "helius-airship-core";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import Step1 from "./airdrop-steps/Step1";
import Step5 from "./airdrop-steps/Step5";
import { useForm } from "react-hook-form";
import { FormValues, validationSchema } from "@/schemas/formSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { AlertCircle } from "lucide-react";

interface ResumeAirdropProps {
  db: airdropsender.BrowserDatabase;
  onBackToHome: () => void;
}

let sendWorker: Worker | undefined = undefined;
let pollWorker: Worker | undefined = undefined;

export function ResumeAirdrop({
  db,
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
  const [error, setError] = useState<string | null>(null);

  const currentValidationSchema = validationSchema[step - 1];

  const form = useForm<FormValues>({
    resolver: zodResolver(currentValidationSchema),
    defaultValues: {
      privateKey: "",
      rpcUrl: "",
    },
  });

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setIsAirdropInProgress(false);
    // Stop both workers
    sendWorker?.terminate();
    sendWorker = undefined;
    pollWorker?.terminate();
    pollWorker = undefined;
  };

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
    setError(null); // Clear any previous errors

    const { privateKey, rpcUrl } = values;

    try {

      if (typeof (sendWorker) === "undefined") {
        sendWorker = new Worker(new URL("../workers/send.ts", import.meta.url), {
          type: "module",
        });
      }

      sendWorker.onmessage = (event) => {
        if (event.data.error) {
          handleError(`Error sending transactions: ${event.data.error}`);
        }
      };
      sendWorker.postMessage({ privateKey, rpcUrl });

      if (typeof (pollWorker) === "undefined") {
        pollWorker = new Worker(new URL("../workers/poll.ts", import.meta.url), {
          type: "module",
        });
      }

      pollWorker.onmessage = (event) => {
        if (event.data.error) {
          handleError(`Error polling transactions: ${event.data.error}`);
        }
      };
      pollWorker.postMessage({ rpcUrl });

      const monitorInterval = setInterval(async () => {
        try {
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
        } catch (error) {
          clearInterval(monitorInterval);
          handleError(`Error monitoring airdrop status: ${error}`);
        }
      }, 1000);
    } catch (error) {
      handleError(`Failed to resume airdrop: ${error}`);
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
          {error ? (
            <>
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="flex justify-center">
                <Button onClick={onBackToHome} className="mt-1">
                  Back to Home
                </Button>
              </div>
            </>
          ) : (
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
          )}
        </CardContent>
      </Card>
      {!isAirdropInProgress && !isAirdropComplete && step < 2 && (
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
