import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableRow } from "../ui/table";
import { UseFormReturn } from "react-hook-form";
import { FormValues } from "@/schemas/formSchema";
import {
  Token,
  normalizeTokenAmount,
  maxAddressesPerTransaction,
  computeUnitPrice,
  computeUnitLimit,
  baseFee,
  compressionFee,
} from "@repo/airdrop-sender";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { AlertTriangle } from "lucide-react";
import { Skeleton } from "../ui/skeleton"; // Import the Skeleton component
import { getKeypairFromPrivateKey } from "@/lib/utils";

interface AirdropOverviewInterface {
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
  form: UseFormReturn<FormValues>;
  tokens: Token[];
  recipientList: string[];
  amountValue: bigint;
}

export default function Step4({
  form,
  tokens,
  recipientList,
  amountValue,
}: Step4Props) {
  const [airdropOverview, setAirdropOverview] =
    useState<AirdropOverviewInterface | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(true);

  const { privateKey, selectedToken, rpcUrl } = form.getValues();

  useEffect(() => {
    const calculateAirdropOverview = async () => {
      setIsCalculating(true);
      setError(null);

      try {
        const keypair = getKeypairFromPrivateKey(privateKey);
        const selectedTokenInfo = tokens.find(
          (t) => t.mintAddress.toString() === selectedToken
        );

        if (!selectedTokenInfo) {
          throw new Error("Selected token not found");
        }

        const numberOfTransactions = BigInt(
          Math.ceil(recipientList.length / Number(maxAddressesPerTransaction))
        );
        const transactionFee =
          BigInt(baseFee) +
          (BigInt(computeUnitLimit) * BigInt(computeUnitPrice)) / BigInt(1e9);

        const totalAmount = amountValue * BigInt(recipientList.length);

        const overview = {
          keypairAddress: keypair.publicKey.toBase58(),
          token:
            selectedTokenInfo.name || selectedTokenInfo.mintAddress.toString(),
          totalAddresses: recipientList.length,
          amountPerAddress: normalizeTokenAmount(
            amountValue.toString(),
            selectedTokenInfo.decimals
          ).toLocaleString("en-US", {
            maximumFractionDigits: selectedTokenInfo.decimals,
          }),
          totalAmount: normalizeTokenAmount(
            totalAmount.toString(),
            selectedTokenInfo.decimals
          ).toLocaleString("en-US", {
            maximumFractionDigits: selectedTokenInfo.decimals,
          }),
          numberOfTransactions: Number(numberOfTransactions),
          approximateTransactionFee: `${Number(numberOfTransactions * transactionFee) / 1e9} SOL`,
          approximateCompressionFee: `${Number(BigInt(recipientList.length) * BigInt(compressionFee)) / 1e9} SOL`,
          rpcUrl: rpcUrl,
        };

        setAirdropOverview(overview);
      } catch (error) {
        if (error instanceof Error) {
          console.error("Failed to calculate airdrop overview:", error);
          setError(`Failed to calculate airdrop overview: ${error.message}`);
        }
        setAirdropOverview(null);
      } finally {
        setIsCalculating(false);
      }
    };

    calculateAirdropOverview();
  }, [amountValue, privateKey, recipientList, rpcUrl, selectedToken, tokens]);

  if (isCalculating) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

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
