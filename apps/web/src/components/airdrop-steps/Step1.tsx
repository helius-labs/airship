import { UseFormReturn } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { HelpCircle, AlertTriangle } from "lucide-react";
import { FormValues } from "@/schemas/formSchema";

interface Step1Props {
  form: UseFormReturn<FormValues>;
}

export default function Step1({ form }: Step1Props) {
  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="privateKey"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center space-x-1">
              <span>Private key</span>
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
                    ⚠️ <strong>Important:</strong> Never share your private key
                    with anyone!
                  </p>
                </PopoverContent>
              </Popover>
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                type="password"
                placeholder="Paste your private key here"
                autoComplete="off"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="rpcUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>RPC URL</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Enter RPC URL" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Alert variant="destructive" className="mt-2">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          The Private key and RPC URL are stored in your browser session and will not persist after the session ends. The session will terminate once the entire browser is closed.
        </AlertDescription>
      </Alert>
    </div>
  );
}
