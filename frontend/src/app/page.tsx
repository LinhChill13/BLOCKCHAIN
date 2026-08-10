"use client";

import Link from "next/link";
import { CampaignCard } from "@/components/campaign-card";
import { SiteHeader } from "@/components/site-header";
import { isContractConfigured } from "@/lib/contract";
import { eth } from "@/lib/format";
import { useCampaigns } from "@/lib/use-campaigns";

export default function Home() {
  const { campaigns, count, isLoading, error } = useCampaigns();
  const totalRaised = campaigns.reduce((total, campaign) => total + campaign.totalRaised, BigInt(0));

  return (
    <main>
      <SiteHeader />
      <section className="hero shell">
        <div>
          <p className="eyebrow">CROWDFUNDING • SEPOLIA</p>
          <h1>Quyên góp minh bạch,<br /><em>mọi dòng tiền đều on-chain.</em></h1>
          <p className="hero-copy">Donor đóng góp ETH; beneficiary phải công bố bằng chứng, được verifier của campaign duyệt rồi mới có thể rút tiền.</p>
          <div className="hero-actions">
            <Link href="/create" className="button button-primary">Tạo chiến dịch</Link>
            <a href="#campaigns" className="button button-secondary">Khám phá chiến dịch</a>
          </div>
        </div>
        <div className="hero-panel">
          <span className="panel-label">TỔNG QUAN ON-CHAIN</span>
          <div className="hero-stat"><strong>{count}</strong><span>chiến dịch</span></div>
          <div className="hero-stat"><strong>{eth(totalRaised)}</strong><span>ETH đã quyên góp</span></div>
          <div className="network-line"><span className="status-dot" /> Ethereum Sepolia</div>
        </div>
      </section>

      <section className="shell content-section" id="campaigns">
        <div className="section-heading">
          <div><p className="eyebrow">DANH SÁCH</p><h2>Chiến dịch đang gây quỹ</h2></div>
          <Link className="text-link" href="/manage">Xem chiến dịch của tôi →</Link>
        </div>
        {!isContractConfigured && <div className="notice">Thêm <code>NEXT_PUBLIC_CROWDFUNDING_ADDRESS</code> vào <code>.env.local</code> để tải dữ liệu Sepolia.</div>}
        {isLoading && <p className="muted">Đang tải dữ liệu on-chain…</p>}
        {error && <div className="notice notice-error">Không thể đọc contract: {error.message}</div>}
        {!isLoading && isContractConfigured && campaigns.length === 0 && <div className="empty-state">Chưa có campaign nào. Hãy là người đầu tiên tạo chiến dịch.</div>}
        <div className="campaign-grid">{campaigns.map((campaign) => <CampaignCard key={campaign.id.toString()} campaign={campaign} />)}</div>
      </section>
    </main>
  );
}
