"use client";

import { Gift, Menu } from "lucide-react";
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function NavMobile() {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0 md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col">
        <nav className="grid gap-2 text-lg font-medium">
          <Link
            href="#"
            className="flex items-center gap-2 text-lg font-semibold"
          >
            <Gift className="h-6 w-6" />
            <span className="">Helius Airdrop Tool</span>
          </Link>
          {navLinks.map((item, index) => (
            <Link
              key={`nav-mobile-${index}`}
              href={item.href}
              className={cn(
                "flex items-center gap-4 rounded-xl px-3 py-2 transition-all hover:text-foreground",
                item.href === pathname
                  ? "bg-muted text-primary"
                  : "text-muted-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="mt-auto">
          <Card>
            <CardHeader>
              <CardTitle>Upgrade to Pro</CardTitle>
              <CardDescription>
                Unlock all features and get unlimited access to our support
                team.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="sm" className="w-full">
                Upgrade
              </Button>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
