import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { ThemeProvider } from "@/providers/ThemeProvider";
import { WalletAdapterProvider } from "@/providers/WalletAdapterProvider";

import { Header } from "@/components/Header";
import { NavMobile } from "@/components/NavMobile";
import { Sidebar } from "@/components/Sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "zk-compression Airdrop",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <WalletAdapterProvider>
            <TooltipProvider>
              <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
                <Sidebar />
                <div className="flex flex-col">
                  <Header />
                  {children}
                </div>
              </div>
            </TooltipProvider>
          </WalletAdapterProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
