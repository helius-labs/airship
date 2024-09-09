import React from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { HelpCircle, AlertTriangle } from "lucide-react";

interface Step1Props {
  privateKey: string;
  rpcUrl: string;
  privateKeyError: string | null;
  rpcUrlError: string | null;
  handlePrivateKeyChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRpcUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function Step1({
  privateKey,
  rpcUrl,
  privateKeyError,
  rpcUrlError,
  handlePrivateKeyChange,
  handleRpcUrlChange,
}: Step1Props) {
  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Label htmlFor="privateKey">Private key</Label>
          <Popover>
            <PopoverTrigger>
              <HelpCircle className="h-4 w-4" />
            </PopoverTrigger>
            <PopoverContent>
              <p>To export your private key:</p>
              <ol className="list-decimal list-inside">
                <li>Open your Solana wallet</li>
                <li>Go to Settings</li>
                <li>Find &quot;Export Private Key&quot; option</li>
                <li>Follow the wallet&apos;s instructions</li>
              </ol>
              <p>Never share your private key with others!</p>
            </PopoverContent>
          </Popover>
        </div>
        <Input
          id="privateKey"
          onChange={handlePrivateKeyChange}
          placeholder="Paste your private key here"
          required
          value={privateKey}
        />
        {privateKeyError ? (
          <p className="text-red-500 text-sm">{privateKeyError}</p>
        ) : null}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            This private key will be used to cover transaction costs and sign
            all airdrop transactions. It will be stored in memory only for this
            session. Please ensure you understand the associated risks.
          </AlertDescription>
        </Alert>
      </div>
      <div>
        <Label htmlFor="rpcUrl">RPC URL</Label>
        <Input
          id="rpcUrl"
          onChange={handleRpcUrlChange}
          placeholder="Enter RPC URL"
          required
          value={rpcUrl}
        />
        {rpcUrlError ? (
          <p className="text-red-500 text-sm">{rpcUrlError}</p>
        ) : null}
      </div>
    </>
  );
}
