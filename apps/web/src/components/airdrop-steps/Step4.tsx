import { Table, TableBody, TableCell, TableRow } from "../ui/table";

interface AirdropOverview {
  keypairAddress: string;
  token: string;
  totalAddresses: number;
  amountPerAddress: string;
  totalAmount: string;
  numberOfTransactions: number;
  approximateTransactionFee: string;
  approximateCompressionFee: string;
  rpcUrl: string;
}

interface Step4Props {
  airdropOverview: AirdropOverview | null;
}

export default function Step4({ airdropOverview }: Step4Props) {
  return (
    <>
      {airdropOverview && (
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium w-1/3">RPC URL</TableCell>
              <TableCell>{airdropOverview.rpcUrl}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Keypair address</TableCell>
              <TableCell>{airdropOverview.keypairAddress}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Token</TableCell>
              <TableCell>{airdropOverview.token}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Total addresses</TableCell>
              <TableCell>{airdropOverview.totalAddresses}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Amount per address</TableCell>
              <TableCell>{airdropOverview.amountPerAddress}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Total amount</TableCell>
              <TableCell>{airdropOverview.totalAmount}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">
                Number of transactions
              </TableCell>
              <TableCell>{airdropOverview.numberOfTransactions}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">
                Approximate transaction fee
              </TableCell>
              <TableCell>{airdropOverview.approximateTransactionFee}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">
                Approximate compression fee
              </TableCell>
              <TableCell>{airdropOverview.approximateCompressionFee}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    </>
  );
}
