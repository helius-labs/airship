import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "#providers/theme-provider";
import { WalletAdapterProvider } from "#providers/wallet-adapter-provider";
import { Header } from "#components/header";
import { Sidebar } from "#components/sidebar";
import { TooltipProvider } from "#components/ui/tooltip";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Helius Airship",
  description:
    "Helius Airship simplifies Solana token airdrops with a user-friendly interface, offering cost savings through ZK Compression, secure client-side processing, and reliability with its resume feature.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
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
