import Link from "next/link";
import { WalletButton } from "@/components/wallet-button";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <span className="brand-mark">C</span>
        <span>Crowdfund<span className="brand-accent">Chain</span></span>
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
