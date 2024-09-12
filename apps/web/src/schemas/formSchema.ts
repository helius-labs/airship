import * as z from "zod";

export const formSchema = z.object({
  privateKey: z.string().min(1, "Private key is required"),
  rpcUrl: z.string().url("Invalid RPC URL format"),
  selectedToken: z.string().optional(),
  recipients: z.string().optional(),
  amountType: z.enum(["fixed", "percent"]).optional(),
  amount: z.string().optional(),
});

export type FormValues = z.infer<typeof formSchema>;
