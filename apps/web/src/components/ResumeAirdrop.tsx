import { useState, useEffect } from "react";
import * as airdropsender from "@repo/airdrop-sender";
import { Button } from "./ui/button";
import Step1 from "./airdrop-steps/Step1";
import Step5 from "./airdrop-steps/Step5";
import { isValidPrivateKey, isValidRpcUrl } from "@/lib/utils.ts";

const airdropSenderWorker = new ComlinkWorker<
  typeof import("../lib/airdropSenderWorker.ts")
>(new URL("../lib/airdropSenderWorker.js", import.meta.url), {
  name: "airdropSenderWorker",
  type: "module",
});

interface ResumeAirdropProps {
  onBackToHome: () => void;
}

export function ResumeAirdrop({ onBackToHome }: ResumeAirdropProps) {
  const [step, setStep] = useState(1);
  const [privateKey, setPrivateKey] = useState("");
  const [rpcUrl, setRpcUrl] = useState("");
  const [privateKeyError, setPrivateKeyError] = useState<string | null>(null);
  const [rpcUrlError, setRpcUrlError] = useState<string | null>(null);
  const [isAirdropInProgress, setIsAirdropInProgress] = useState(false);
  const [isAirdropComplete, setIsAirdropComplete] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [finalizeProgress, setFinalizeProgress] = useState(0);
  const [sentTransactions, setSentTransactions] = useState(0);
  const [finalizedTransactions, setFinalizedTransactions] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);

  useEffect(() => {
    async function loadAirdropStatus() {
      const status = await airdropsender.status();
      setSendProgress((status.sent / status.total) * 100);
      setFinalizeProgress((status.finalized / status.total) * 100);
      setTotalTransactions(status.total);
      setSentTransactions(status.sent);
      setFinalizedTransactions(status.finalized);
    }
    void loadAirdropStatus();
  }, []);

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

  const handleResumeAirdrop = async () => {
    if (!isValidPrivateKey(privateKey) || !isValidRpcUrl(rpcUrl)) {
      if (!isValidPrivateKey(privateKey))
        setPrivateKeyError("Private key is required");
      if (!isValidRpcUrl(rpcUrl)) setRpcUrlError("Invalid RPC URL format");
      return;
    }

    setIsAirdropInProgress(true);
    setStep(2);

    try {
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
      console.error("Failed to resume airdrop:", error);
      alert("Failed to resume airdrop. Please try again.");
      setIsAirdropInProgress(false);
      setStep(1);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen">
      <div className="bg-background/95 backdrop-blur-sm rounded-lg p-8 w-full max-w-4xl">
        <div className="w-full">
          <h1 className="text-3xl font-bold mb-6 text-primary">
            Resume Airdrop
          </h1>
          {step === 1 && (
            <>
              <Step1
                privateKey={privateKey}
                rpcUrl={rpcUrl}
                privateKeyError={privateKeyError}
                rpcUrlError={rpcUrlError}
                handlePrivateKeyChange={handlePrivateKeyChange}
                handleRpcUrlChange={handleRpcUrlChange}
              />
              <div className="mt-6 flex justify-end">
                <Button onClick={handleResumeAirdrop}>Resume Airdrop</Button>
              </div>
            </>
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
        </div>
      </div>
      {!isAirdropInProgress && !isAirdropComplete && (
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
