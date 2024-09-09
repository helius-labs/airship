import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

interface AirdropSelectionProps {
  existingAirdrop: boolean | null;
  onCreateAirdrop: () => void;
  onResumeAirdrop: () => void;
}

export function AirdropSelection({
  existingAirdrop,
  onCreateAirdrop,
  onResumeAirdrop,
}: AirdropSelectionProps) {
  const [showDialog, setShowDialog] = useState(false);

  const handleCreateAirdrop = () => {
    if (existingAirdrop) {
      setShowDialog(true);
    } else {
      onCreateAirdrop();
    }
  };

  const handleConfirmCreate = () => {
    setShowDialog(false);
    onCreateAirdrop();
  };

  return (
    <main className="flex flex-col items-center justify-center h-screen">
      <div className="bg-background/95 backdrop-blur-sm rounded-lg p-8 w-full max-w-md">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-primary">Helius Airship</h1>
          <div className="space-y-2">
            {existingAirdrop === null ? (
              <div className="flex justify-center items-center h-24">
                <Loader2 className="h-12 w-12 animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <Button onClick={handleCreateAirdrop}>
                  Create New Airdrop
                </Button>
                {existingAirdrop && (
                  <Button onClick={onResumeAirdrop}>
                    Resume Existing Airdrop
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Overwrite Existing Airdrop?</DialogTitle>
            <DialogDescription>
              An existing airdrop was detected. Are you sure you want to create
              a new airdrop? This action will overwrite the current airdrop.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmCreate}>
              Confirm and Create New Airdrop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
