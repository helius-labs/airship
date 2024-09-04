"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { navLinks } from "#lib/data";
import { cn } from "#lib/utils";
import { Button } from "#components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "#components/ui/sheet";

export function NavMobile(): JSX.Element {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button className="shrink-0 md:hidden" size="icon" variant="outline">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col" side="left">
        <nav className="grid gap-2 text-lg font-medium">
          <Link
            className="flex items-center gap-2 text-lg font-semibold"
            href="#"
          >
            <Image
              alt="Picture of the author"
              className="mr-1"
              height={30}
              src="/logo.svg"
              width={30}
            />
            <span className="">Helius Airship</span>
          </Link>
          {navLinks.map((item) => (
            <Link
              className={cn(
                "flex items-center gap-4 rounded-xl px-3 py-2 transition-all hover:text-foreground",
                item.href === pathname
                  ? "bg-muted text-primary"
                  : "text-muted-foreground"
              )}
              href={item.href}
              key={item.id}
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
              <Button className="w-full" size="sm">
                Upgrade
              </Button>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
