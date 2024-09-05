import { PackagePlus, Wallet } from "lucide-react";
import type { NavLinks } from "#types/nav-links";

export const navLinks: NavLinks[] = [
  {
    id: 1,
    name: "Airdrop",
    href: "/",
    icon: PackagePlus,
  },
  {
    id: 2,
    name: "Wallet",
    href: "/wallet",
    icon: Wallet,
  },
];
