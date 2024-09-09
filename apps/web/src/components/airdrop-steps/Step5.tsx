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
}
