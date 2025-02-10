'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Button } from './ui/button'
import { HelpCircle } from 'lucide-react'
import { normalizeTokenAmount } from 'helius-airship-core'
import { Token } from './DecompressPage'
import { Checkbox } from './ui/checkbox'

export const columns: ColumnDef<Token>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'token',
    header: 'Token',
    cell: ({ row }) => {
      const token = row.original
      return (
        <div className="flex items-center space-x-2">
          {token.image ? (
            <img
              crossOrigin=""
              src={token.image}
              alt={token.symbol || 'Token'}
              className="w-8 h-8 rounded-full"
              onError={(e) => {
                e.currentTarget.onerror = null
                e.currentTarget.src = '/not-found.svg'
              }}
            />
          ) : (
            <HelpCircle className="w-8 h-8 text-gray-400" strokeWidth={1} />
          )}
          <div>
            <span className="font-medium">{token.symbol || 'Unknown'}</span>
            <a
              className="block text-xs text-gray-400 hover:underline"
              href={`https://birdeye.so/token/${token.mint.toBase58()}?chain=solana`}
              target="_blank"
              rel="noopener noreferrer"
              title="View on Birdeye"
            >
              {token.mint.toBase58().slice(0, 4) + '...' + token.mint.toBase58().slice(-4)}
            </a>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'amount',
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => {
      const amount = normalizeTokenAmount(row.original.amount.toString(), row.original.decimals)
      return <div className="text-right font-medium">{amount}</div>
    },
  },
  {
    accessorKey: 'value',
    header: () => <div className="text-right">Value</div>,
    cell: ({ row }) => {
      const token = row.original
      const value =
        token.pricePerToken > 0
          ? `$${(normalizeTokenAmount(token.amount.toString(), token.decimals) * token.pricePerToken).toFixed(2)}`
          : 'N/A'
      return <div className="text-right font-medium">{value}</div>
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const token = row.original
      return (
        <div className="text-right">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log('decompressing', token.mint, token.amount, token.tokenProgramId)
            }}
          >
            Decompress
          </Button>
        </div>
      )
    },
  },
]
