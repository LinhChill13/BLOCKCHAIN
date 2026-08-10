"use client";

import { sepolia } from "wagmi/chains";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { shortAddress } from "@/lib/format";

export function WalletButton() {
  const { address, chainId, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  if (!isConnected) {
    return (
      <button className="button button-primary" onClick={() => connect({ connector: connectors[0] })} disabled={isPending}>
        {isPending ? "Đang kết nối…" : "Kết nối ví"}
      </button>
    );
  }

  if (chainId !== sepolia.id) {
    return (
      <button className="button button-warning" onClick={() => switchChain({ chainId: sepolia.id })} disabled={isSwitching}>
        {isSwitching ? "Đang chuyển…" : "Chuyển sang Sepolia"}
      </button>
    );
  }

  return (
    <button className="wallet-chip" onClick={() => disconnect()} title="Bấm để ngắt kết nối ví">
      <span className="status-dot" />
      {shortAddress(address)}
    </button>
  );
}
