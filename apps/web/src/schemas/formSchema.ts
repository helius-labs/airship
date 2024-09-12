import * as z from "zod";

export const formSchema = z.object({
  privateKey: z.string().min(1, "Private key is required"),
  rpcUrl: z.string().url("Invalid RPC URL format"),
  selectedToken: z.string(),
  recipients: z.string(),
  amountType: z.enum(["fixed", "percent"]).optional(),
  amount: z.string().optional(),
  recipientImportOption: z.enum(["saga2", "nft", "spl", "csv"]).optional(),
  collectionAddress: z.string().optional(),
  mintAddress: z.string().optional(),
  csvFile: z.string().optional(),
});

export type FormValues = z.infer<typeof formSchema>;
