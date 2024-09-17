import { useState, useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { CreateAirdrop } from "./components/CreateAirdrop";
import { ResumeAirdrop } from "./components/ResumeAirdrop";
import { AirdropSelection } from "./components/AirdropSelection";
import { WalletPage } from "./components/WalletPage";
import { init, exist, databaseFile } from "helius-airship-core";
import { SQLocalDrizzle } from "sqlocal/drizzle";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { sql } from "drizzle-orm";

// Load the airdrop sender worker
const airdropSenderWorker = new ComlinkWorker<
  typeof import("./lib/airdropSenderWorker.ts")
>(new URL("./lib/airdropSenderWorker.js", import.meta.url), {
  name: "airdropSenderWorker",
  type: "module",
});

function App() {
  const [existingAirdrop, setExistingAirdrop] = useState<boolean | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const { driver, batchDriver } = new SQLocalDrizzle({
    databasePath: databaseFile,
    verbose: false,
  });

  const db = drizzle(driver, batchDriver);

  useEffect(() => {
    async function initApp() {
      try {
        await db.run(sql`PRAGMA journal_mode = WAL;`);

        // Initialize the airdrop sender
        await init({ db });

        // Check if an airdrop already exists
        const exists = await exist({ db });
        setExistingAirdrop(exists);
      } catch (error) {
        console.error("Error checking for existing airdrop:", error);
        setExistingAirdrop(false);
      }
    }
    void initApp();
  }, [db]);

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
          <Routes>
            <Route path="/wallet" element={<WalletPage />} />
            <Route
              path="/"
              element={
                selectedAction === "create" ? (
                  <CreateAirdrop
                    db={db}
                    airdropSenderWorker={airdropSenderWorker}
                    onBackToHome={handleBackToHome}
                  />
                ) : selectedAction === "resume" ? (
                  <ResumeAirdrop
                    db={db}
                    airdropSenderWorker={airdropSenderWorker}
                    onBackToHome={handleBackToHome}
                  />
                ) : (
                  <AirdropSelection
                    existingAirdrop={existingAirdrop}
                    onCreateAirdrop={handleCreateAirdrop}
                    onResumeAirdrop={handleResumeAirdrop}
                  />
                )
              }
            />
          </Routes>
        </div>
      </div>
  );
}

export default App;
