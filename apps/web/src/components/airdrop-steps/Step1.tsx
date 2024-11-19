import { UseFormReturn } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { FormValues } from "@/schemas/formSchema";

interface Step1Props {
  form: UseFormReturn<FormValues>;
}

export default function Step1({ form }: Step1Props) {
  return (
    <div className="space-y-6">
      <Alert variant="default">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Important Security Information</AlertTitle>
        <AlertDescription>
          <p className="mb-2">
            AirShip requires a private key to sign transactions and pay for
            fees. This approach is currently necessary, as other methods aren't
            yet optimized to sign and send large volumes of transactions.
            However, it comes with security risks:
          </p>
          <ul className="list-disc list-inside mb-2">
            <li>Never use your main wallet's private key.</li>
            <li>
              Create a new, temporary wallet specifically for this purpose.
            </li>
            <li>
              Only transfer the necessary tokens and funds to this temporary
              wallet.
            </li>
          </ul>
          <p className="mb-2">
            For enhanced security, consider using our{" "}
            <a
              href="https://github.com/helius-labs/airship/tree/main/packages/cli"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline hover:text-primary/90"
            >
              CLI tool
            </a>{" "}
            instead.
          </p>
          <FormField
            control={form.control}
            name="acknowledgedRisks"
            render={({ field }) => (
              <FormItem className="flex flex-col items-start space-y-2 mt-4">
                <div className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-medium">
                    I understand the risks and agree to use a temporary wallet
                  </FormLabel>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </AlertDescription>
      </Alert>

      {form.watch("acknowledgedRisks") && (
        <>
          <FormField
            control={form.control}
            name="privateKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Private key</FormLabel>
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
          <FormField
            control={form.control}
            name="saveCredentials"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Store Private key and RPC URL in browser session
                  </FormLabel>
                  <FormDescription>
                    The Private key and RPC URL will be stored in your browser
                    session and will not persist after the session ends. The
                    session will terminate once the entire browser is closed.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </>
      )}
    </div>
  );
}
