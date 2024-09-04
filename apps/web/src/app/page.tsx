"use client";

import { useState, useEffect } from "react";
import { exist } from "@repo/airdrop-sender";
import { Button } from "#components/ui/button";

export default function AirdropPage(): JSX.Element {
  const [existingAirdrop, setExistingAirdrop] = useState<boolean>(false);

  useEffect(() => {
    async function checkAirdrop() {
      const exists = await exist();
      setExistingAirdrop(exists);
    }
    checkAirdrop();
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Airdrop</h1>
      </div>
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
        <Button
          onClick={() => {
            console.log("Create new airdrop");
          }}
        >
          Create New Airdrop
        </Button>
        {existingAirdrop ? (
          <Button
            onClick={() => {
              console.log("Resume existing airdrop");
            }}
          >
            Resume Existing Airdrop
          </Button>
        ) : null}
      </div>
    </main>
  );
}
