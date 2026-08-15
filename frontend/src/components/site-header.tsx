import Image from "next/image";
import Link from "next/link";
import { WalletButton } from "@/components/wallet-button";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <span className="brand-mark" aria-hidden="true">
          <Image src="/uit-logo.svg" alt="" width={37} height={37} priority />
        </span>
        <span className="brand-copy">
          <strong>Crowdfund<span className="brand-accent">Chain</span></strong>
          <small>Minh bạch trên Ethereum Sepolia</small>
        </span>
      </Link>
      <nav className="nav-links" aria-label="Điều hướng chính">
        <Link href="/">Khám phá</Link>
        <Link href="/create">Tạo chiến dịch</Link>
        <Link href="/manage">Quản lý</Link>
      </nav>
      <WalletButton />
    </header>
  );
}
