"use client";

import { useState, useEffect } from "react";
import { exist } from "@repo/airdrop-sender";
import { Button } from "#components/ui/button";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#components/ui/dialog";

export default function AirdropPage(): JSX.Element {
  const [existingAirdrop, setExistingAirdrop] = useState<boolean | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function checkAirdrop() {
      try {
        const exists = await exist();
        setExistingAirdrop(exists);
      } catch (error) {
        console.error("Error checking for existing airdrop:", error);
        setExistingAirdrop(false);
      }
    }
    void checkAirdrop();
  }, []);

  const handleCreateAirdrop = () => {
    if (existingAirdrop) {
      setShowDialog(true);
    } else {
      router.push("/create-airdrop");
    }
  };

  const handleConfirmCreate = () => {
    setShowDialog(false);
    router.push("/create-airdrop");
  };

  const handleResumeAirdrop = () => {
    router.push("/resume-airdrop");
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Airdrop</h1>
      </div>
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
        {existingAirdrop === null ? (
          <Loader2 className="h-8 w-8 animate-spin" />
        ) : (
          <div className="flex flex-col gap-4">
            <Button onClick={handleCreateAirdrop}>Create New Airdrop</Button>
            {existingAirdrop && (
              <Button onClick={handleResumeAirdrop}>
                Resume Existing Airdrop
              </Button>
            )}
          </div>
        )}
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
