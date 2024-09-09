import { useState, useEffect } from "react";
import { CreateAirdrop } from "./components/CreateAirdrop";
import { ResumeAirdrop } from "./components/ResumeAirdrop";
import { AirdropSelection } from "./components/AirdropSelection";
import { init, exist } from "@repo/airdrop-sender";

function App() {
  const [existingAirdrop, setExistingAirdrop] = useState<boolean | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  useEffect(() => {
    async function initApp() {
      try {
        // Initialize the airdrop sender
        await init();

        // Check if an airdrop already exists
        const exists = await exist();
        setExistingAirdrop(exists);
      } catch (error) {
        console.error("Error checking for existing airdrop:", error);
        setExistingAirdrop(false);
      }
    }
    void initApp();
  }, []);

  const handleCreateAirdrop = () => {
    setSelectedAction("create");
  };

  const handleResumeAirdrop = () => {
    setSelectedAction("resume");
  };

  const handleBackToHome = () => {
    setSelectedAction(null);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: "url('/background.jpg')" }}
    >
      <div className="w-full max-w-4xl rounded-lg shadow-xl">
        {selectedAction === "create" ? (
          <CreateAirdrop onBackToHome={handleBackToHome} />
        ) : selectedAction === "resume" ? (
          <ResumeAirdrop onBackToHome={handleBackToHome} />
        ) : (
          <AirdropSelection
            existingAirdrop={existingAirdrop}
            onCreateAirdrop={handleCreateAirdrop}
            onResumeAirdrop={handleResumeAirdrop}
          />
        )}
      </div>
    </div>
  );
}

export default App;
