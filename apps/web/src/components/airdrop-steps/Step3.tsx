import { UseFormReturn } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
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

interface Step3Props {
  form: UseFormReturn<FormValues>;
}

export default function Step3({ form }: Step3Props) {
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
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

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
                  form.watch("amountType") === "fixed"
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
    </div>
  );
}
