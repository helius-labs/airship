import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Input } from "../ui/input";

interface Step3Props {
  amountType: string;
  setAmountType: (value: "fixed" | "percent") => void;
  amount: string;
  setAmount: (value: string) => void;
}

export default function Step3({
  amountType,
  setAmountType,
  amount,
  setAmount,
}: Step3Props) {
  return (
    <>
      <div>
        <Label htmlFor="amountType">
          What amount would you like to airdrop?
        </Label>
        <Select
          value={amountType}
          onValueChange={(value: "fixed" | "percent") => {
            setAmountType(value);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select amount type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">
              Fixed token amount per address
            </SelectItem>
            <SelectItem value="percent">% of total available tokens</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          onChange={(e) => {
            setAmount(e.target.value);
          }}
          placeholder={
            amountType === "fixed" ? "Enter token amount" : "Enter percentage"
          }
          required
          type="number"
          value={amount}
        />
      </div>
    </>
  );
}
