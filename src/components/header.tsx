"use client";

import { usePathname } from "next/navigation";

import { NavMobile } from "@/components/nav-mobile";
import { WalletMultiButton } from "@/components/wallet-multi-button";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
      <NavMobile />
      <div className="w-full flex-1"></div>
      <WalletMultiButton />
    </header>
  );
}
