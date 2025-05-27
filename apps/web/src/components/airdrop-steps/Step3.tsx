import React from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormValues } from "@/schemas/formSchema";
import CodeMirror from '@uiw/react-codemirror';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

interface Step3Props {
  form: UseFormReturn<FormValues>;
  recipientList: string[];
}

export default function Step3({ form, recipientList }: Step3Props) {
  const amountType = form.watch("amountType");
  const variableAmounts = form.watch("variableAmounts");

  const generateVariableTemplate = () => {
    if (recipientList.length === 0) return "";

    return recipientList
      .map(address => `${address},0.1`)
      .join('\n');
  };

  const handleTemplateGenerate = () => {
    const template = generateVariableTemplate();
    form.setValue("variableAmounts", template);
    // Clear any existing validation errors
    form.clearErrors("variableAmounts");
  };

  React.useEffect(() => {
    if (amountType === "variable") {
      form.clearErrors("amount");
      form.setValue("amount", undefined);
    }
  }, [amountType, form]);

  React.useEffect(() => {
    if (amountType === "variable" && variableAmounts) {
      // This effect ensures the form re-renders when variableAmounts changes
      // and can be used for real-time validation feedback if needed
    }
  }, [amountType, variableAmounts]);

  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="amountType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>What amount would you like to airdrop?</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger ref={field.ref}>
                  <SelectValue placeholder="Select amount type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="fixed">
                  Fixed token amount per address
                </SelectItem>
                <SelectItem value="percent">
                  % of total available tokens
                </SelectItem>
                <SelectItem value="variable">
                  Variable amounts per address
                </SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {(amountType === "fixed" || amountType === "percent") && (
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={
                    amountType === "fixed"
                      ? "Enter token amount"
                      : "Enter percentage"
                  }
                  type="number"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {amountType === "variable" && (
        <div className="space-y-4">
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              Enter one address and amount per line in the format: address,amount
              <br />
              Example: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU,1.5
            </AlertDescription>
          </Alert>

          {recipientList.length > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {recipientList.length} recipients detected
              </span>
              <button
                type="button"
                onClick={handleTemplateGenerate}
                className="text-sm text-primary hover:underline"
              >
                Generate template with 0.1 for each address
              </button>
            </div>
          )}

          <FormField
            control={form.control}
            name="variableAmounts"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Variable Amounts</FormLabel>
                <FormControl>
                  <CodeMirror
                    value={field.value || ""}
                    onChange={(value) => field.onChange(value)}
                    placeholder="address,amount (one per line)"
                    theme="dark"
                    height="200px"
                  />
                </FormControl>
                <FormDescription>
                  Format: address,amount (one per line)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
}
