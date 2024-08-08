import { NavLinks } from "@/types/NavLinks";
import { PackageOpen, PackagePlus, Wallet } from "lucide-react";

export const navLinks: NavLinks[] = [
  {
    name: "Airdrop",
    href: "/",
    icon: PackagePlus,
  },
  {
    name: "Wallet",
    href: "/wallet",
    icon: Wallet,
  },
  {
    name: "Claim",
    href: "/claim",
    icon: PackageOpen,
  },
];
