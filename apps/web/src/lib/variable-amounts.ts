// File: src/lib/variable-amounts.ts
import { PublicKey } from '@solana/web3.js'

export interface RecipientAmount {
  address: PublicKey
  amount: bigint
}

export function parseVariableAmounts(
  variableAmountsText: string,
  decimals: number
): {
  recipients: RecipientAmount[]
  errors: string[]
} {
  const recipients: RecipientAmount[] = []
  const errors: string[] = []

  if (!variableAmountsText.trim()) {
    errors.push('Variable amounts cannot be empty')
    return { recipients, errors }
  }

  const lines = variableAmountsText.split('\n').filter((line) => line.trim())

  lines.forEach((line, index) => {
    const trimmedLine = line.trim()
    if (!trimmedLine) return

    const parts = trimmedLine.split(',')
    if (parts.length !== 2) {
      errors.push(`Line ${index + 1}: Invalid format. Expected "address,amount"`)
      return
    }

    const [addressStr, amountStr] = parts.map((p) => p.trim())

    // Validate address
    try {
      const address = new PublicKey(addressStr)

      // Validate amount
      const amountNum = parseFloat(amountStr)
      if (isNaN(amountNum) || amountNum <= 0) {
        errors.push(`Line ${index + 1}: Invalid amount "${amountStr}"`)
        return
      }

      const amount = BigInt(Math.floor(amountNum * Math.pow(10, decimals)))
      recipients.push({ address, amount })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      errors.push(`Line ${index + 1}: Invalid address "${addressStr}"`)
    }
  })

  // Check for duplicate addresses
  const addressSet = new Set()
  const duplicates: string[] = []

  recipients.forEach((recipient) => {
    const addressStr = recipient.address.toBase58()
    if (addressSet.has(addressStr)) {
      duplicates.push(`Duplicate address found: ${addressStr}`)
    } else {
      addressSet.add(addressStr)
    }
  })

  errors.push(...duplicates)

  return { recipients, errors }
}

export function validateVariableAmounts(
  variableAmountsText: string,
  recipientList: string[],
  decimals: number
): {
  isValid: boolean
  errors: string[]
  recipients: RecipientAmount[]
} {
  const { recipients, errors } = parseVariableAmounts(variableAmountsText, decimals)

  // Check if all original recipients are covered
  const recipientAddresses = recipients.map((r) => r.address.toBase58())
  const missingRecipients = recipientList.filter((addr) => !recipientAddresses.includes(addr))

  if (missingRecipients.length > 0) {
    errors.push(`Missing amounts for ${missingRecipients.length} recipients`)
  }

  // Check for extra recipients not in original list
  const extraRecipients = recipientAddresses.filter((addr) => !recipientList.includes(addr))

  if (extraRecipients.length > 0) {
    errors.push(`${extraRecipients.length} recipients not in original list`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    recipients,
  }
}
