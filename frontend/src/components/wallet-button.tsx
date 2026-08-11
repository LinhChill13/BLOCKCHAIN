"use client";

import { sepolia } from "wagmi/chains";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { shortAddress } from "@/lib/format";

export function WalletButton() {
  const { address, chainId, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect, isPending: isDisconnecting } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  function connectAndRefresh() {
    const connector = connectors[0];
    if (!connector) return;

    connect(
      { connector },
      { onSuccess: () => window.location.reload() }
    );
  }

  function disconnectAndRefresh() {
    disconnect(
      undefined,
      { onSuccess: () => window.location.reload() }
    );
  }

  if (!isConnected) {
    return (
      <button className="button button-primary" onClick={connectAndRefresh} disabled={isPending || connectors.length === 0}>
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
    <div className="wallet-actions">
      <span className="wallet-chip" title="Ví đang kết nối">
        <span className="status-dot" />
        {shortAddress(address)}
      </span>
      <button className="button button-logout" onClick={disconnectAndRefresh} disabled={isDisconnecting}>
        {isDisconnecting ? "Đang đăng xuất…" : "Đăng xuất"}
      </button>
    </div>
  );
}
