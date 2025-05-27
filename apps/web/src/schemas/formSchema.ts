import { isValidPrivateKey } from '@/lib/utils'
import * as z from 'zod'

export const step1Schema = z.object({
  privateKey: z.custom<string>((val) => {
    return typeof val === 'string' ? isValidPrivateKey(val) : false
  }, 'Invalid private key'),
  rpcUrl: z.string().startsWith('https://').url('Invalid RPC URL format'),
  saveCredentials: z.boolean(),
  acknowledgedRisks: z.boolean().refine((val) => val === true, {
    message: 'Please read the risks and agree to use a temporary wallet',
  }),
})

export const step2Schema = z.object({
  selectedToken: z.string().min(1, 'Please select a token'),
  recipientImportOption: z.enum(['saga2', 'nft', 'spl', 'csv']).optional(),
  collectionAddress: z.string().optional(),
  mintAddress: z.string().optional(),
  recipients: z.string().min(1, 'Please import or enter recipients'),
  csvFile: z.string().optional(),
})

export const step3Schema = z
  .object({
    amountType: z.enum(['fixed', 'percent', 'variable']),
    amount: z.coerce
      .number({
        required_error: 'Amount is required',
        invalid_type_error: 'Amount must be a number',
      })
      .min(0.0000000001, 'Amount must be greater than 0')
      .optional()
      .or(z.literal(undefined)),
    variableAmounts: z.string().optional(), // CSV format: address,amount per line
  })
  .refine(
    (data) => {
      // If amountType is variable, variableAmounts is required
      if (data.amountType === 'variable') {
        return data.variableAmounts && data.variableAmounts.trim().length > 0
      }
      // If amountType is fixed or percent, amount is required
      if (data.amountType === 'fixed' || data.amountType === 'percent') {
        return data.amount !== undefined && data.amount > 0
      }
      return true
    },
    {
      message: 'Please specify the required amount information',
      path: ['amount'], // This will show the error on the amount field
    }
  )

export const step4Schema = z.object({})

export const validationSchema = [step1Schema, step2Schema, step3Schema, step4Schema]

export type FormValues = z.infer<typeof step1Schema> &
  z.infer<typeof step2Schema> &
  z.infer<typeof step3Schema> &
  z.infer<typeof step4Schema>
