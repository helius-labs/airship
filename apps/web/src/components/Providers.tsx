import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from "@/providers/ThemeProvider";
import { PHProvider } from '@/providers/PostHog';
import { Toaster } from "@/components/ui/toaster"

interface ProvidersProps {
    children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    // You can choose the network here
    const network = WalletAdapterNetwork.Mainnet;

    // You can also provide a custom RPC endpoint
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    const wallets = useMemo(
        () => [
            /**
             * Wallets that implement either of these standards will be available automatically.
             *
             *   - Solana Mobile Stack Mobile Wallet Adapter Protocol
             *     (https://github.com/solana-mobile/mobile-wallet-adapter)
             *   - Solana Wallet Standard
             *     (https://github.com/anza-xyz/wallet-standard)
             *
             * If you wish to support a wallet that supports neither of those standards,
             * instantiate its legacy wallet adapter here. Common legacy adapters can be found
             * in the npm package `@solana/wallet-adapter-wallets`.
             */
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [network]
    );

    return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <PHProvider>
                <ConnectionProvider endpoint={endpoint}>
                    <WalletProvider wallets={wallets} autoConnect>
                        <WalletModalProvider>
                            <Router>
                                {children}
                                <Toaster />
                            </Router>
                        </WalletModalProvider>
                    </WalletProvider>
                </ConnectionProvider>
            </PHProvider>
        </ThemeProvider>
    );
}