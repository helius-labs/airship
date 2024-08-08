"use client";

import { Gift } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { navLinks } from "@/lib/data";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden border-r bg-muted/40 md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Gift className="h-6 w-6" />
            <span className="">Helius Airdrop Tool</span>
          </Link>
        </div>
        <div className="flex-1">
          <nav className="grid items-start gap-1 px-2 text-sm font-medium lg:px-4">
            {navLinks.map((item, index) => (
              <Link
                key={`sidebar-${index}`}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                  item.href === pathname
                    ? "bg-muted text-primary"
                    : "text-muted-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-4">
          <Card>
            <CardHeader className="p-2 pt-0 md:p-4">
              <CardTitle>Powered by Helius</CardTitle>
              <CardDescription>
                Get the most loved Solana RPC Nodes, APIs, Webhooks, and Support
                for your project today.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2 pt-0 md:p-4 md:pt-0">
              <Button size="sm" className="w-full" asChild>
                <Link href="https://helius.dev" target="_blank">
                  helius.dev
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
