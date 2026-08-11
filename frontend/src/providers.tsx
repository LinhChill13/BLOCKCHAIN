"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { WagmiProvider, createConfig, http, useAccount } from "wagmi";
import { injected } from "wagmi/connectors/injected";
import { sepolia } from "wagmi/chains";

const rpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  ssr: true,
  transports: {
    [sepolia.id]: http(rpcUrl)
  }
});

function WalletSessionBoundary({ children }: { children: React.ReactNode }) {
  const { address } = useAccount();
  const sessionKey = address?.toLowerCase() ?? "disconnected";

  return <Fragment key={sessionKey}>{children}</Fragment>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletSessionBoundary>{children}</WalletSessionBoundary>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
