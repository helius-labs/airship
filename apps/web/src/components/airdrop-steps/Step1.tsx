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
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Label htmlFor="privateKey">Private key</Label>
          <Popover>
            <PopoverTrigger>
              <HelpCircle className="h-4 w-4" />
            </PopoverTrigger>
            <PopoverContent className="space-y-2">
              <strong>To export your private key:</strong>
              <ol className="list-decimal list-inside">
                <li>Open your Solana wallet.</li>
                <li>Create a new wallet.</li>
                <li>Transfer SOL and tokens to the wallet.</li>
                <li>
                  Go to <strong>Settings</strong>.
                </li>
                <li>
                  Select <strong>Export Private Key</strong>.
                </li>
                <li>Follow the instructions provided.</li>
              </ol>
              <p>
                ⚠️ <strong>Important:</strong> Never share your private key with
                anyone!
              </p>
            </PopoverContent>
          </Popover>
        </div>
        <Input
          id="privateKey"
          onChange={handlePrivateKeyChange}
          placeholder="Paste your private key here"
          required
          value={privateKey}
          type="password"
          autoComplete="off"
        />
        {privateKeyError && (
          <p className="text-red-500 text-sm mt-1">{privateKeyError}</p>
        )}
        <Alert variant="destructive" className="mt-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            The private key is stored only in your browser's memory and will not
            persist after this session ends.
          </AlertDescription>
        </Alert>
      </div>
      <div className="space-y-3">
        <Label htmlFor="rpcUrl">RPC URL</Label>
        <Input
          id="rpcUrl"
          onChange={handleRpcUrlChange}
          placeholder="Enter RPC URL"
          required
          value={rpcUrl}
        />
        {rpcUrlError && (
          <p className="text-red-500 text-sm mt-1">{rpcUrlError}</p>
        )}
      </div>
    </div>
  );
}
