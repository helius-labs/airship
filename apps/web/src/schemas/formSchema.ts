import { isValidPrivateKey } from "@/lib/utils";
import * as z from "zod";

export const step1Schema = z.object({
  privateKey: z.custom<string>((val) => {
    return typeof val === "string" ? isValidPrivateKey(val) : false;
  }, "Invalid private key"),
  rpcUrl: z.string().startsWith("https://").url("Invalid RPC URL format"),
});

export const step2Schema = z.object({
  selectedToken: z.string().min(1, "Please select a token"),
  recipientImportOption: z.enum(["saga2", "nft", "spl", "csv"]).optional(),
  collectionAddress: z.string().optional(),
  mintAddress: z.string().optional(),
  recipients: z.string().min(1, "Please import or enter recipients"),
  csvFile: z.string().optional(),
  saveCredentials: z.boolean(),
});

export const step3Schema = z.object({
  amountType: z.enum(["fixed", "percent"]),
  amount: z.coerce
    .number({
      required_error: "Amount is required",
      invalid_type_error: "Amount must be a number",
    })
    .min(0.0000000001, "Amount must be greater than 0"),
});

export const step4Schema = z.object({});

export const validationSchema = [
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
];

export type FormValues = z.infer<typeof step1Schema> &
  z.infer<typeof step2Schema> &
  z.infer<typeof step3Schema> &
  z.infer<typeof step4Schema>;
