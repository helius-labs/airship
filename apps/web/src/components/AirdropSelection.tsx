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
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { databaseFile } from "helius-airship-core";
import { SQLocalDrizzle } from "sqlocal/drizzle";
import { useNavigate } from "react-router-dom";
import { Footer } from "./Footer";
import { Header } from "./Header";

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
  const [showDownloadButton, setShowDownloadButton] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "0") {
        setShowDownloadButton((prev) => !prev); // Toggle the state
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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

  const downloadDB = async () => {
    const { getDatabaseFile } = new SQLocalDrizzle({
      databasePath: databaseFile,
    });

    const databaseUrl = await getDatabaseFile();
    const fileUrl = URL.createObjectURL(databaseUrl);

    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = `airship-${new Date().toJSON().slice(0, 10)}.db`;
    a.click();
    a.remove();

    URL.revokeObjectURL(fileUrl);
  };

  return (
    <main className="flex flex-col items-center justify-center h-screen">
      <Header />
      <Card className="w-full max-w-md mt-12 mb-8">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
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
                <Button onClick={() => navigate("/decompress")}>
                  View Your Compressed Tokens
                </Button>
                {showDownloadButton && (
                  <Button onClick={downloadDB}>Download Database</Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <Footer />

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
