import { Progress } from "@/components/ui/progress";
import { Button } from "../ui/button";

interface Step5Props {
  isAirdropInProgress: boolean;
  isAirdropComplete: boolean;
  sendProgress: number;
  finalizeProgress: number;
  sentTransactions: number;
  finalizedTransactions: number;
  totalTransactions: number;
  onBackToHome: () => void;
}

export default function Step5({
  isAirdropInProgress,
  isAirdropComplete,
  sendProgress,
  finalizeProgress,
  sentTransactions,
  finalizedTransactions,
  totalTransactions,
  onBackToHome,
}: Step5Props) {
  return (
    <>
      {isAirdropInProgress && (
        <div className="my-6 space-y-8">
          <div>
            <p className="mb-2">
              Transactions sent: {Math.round(sendProgress)}% ({sentTransactions}
              /{totalTransactions})
            </p>
            <Progress value={sendProgress} className="w-full h-4" />
          </div>
          <div>
            <p className="mb-2">
              Transactions confirmed: {Math.round(finalizeProgress)}% (
              {finalizedTransactions}/{totalTransactions})
            </p>
            <Progress value={finalizeProgress} className="w-full h-4" />
          </div>
        </div>
      )}
      {isAirdropComplete && (
        <div className="my-8 text-center">
          <h3 className="text-3xl font-bold text-primary mb-2">
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
}
