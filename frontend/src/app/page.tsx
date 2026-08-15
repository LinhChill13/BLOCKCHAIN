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
        <div className="hero-copy-block">
          <p className="eyebrow">✦ CROWDFUNDING TỬ TẾ • SEPOLIA</p>
          <h1>Hành động tử tế,<br /><em>tác động minh bạch.</em></h1>
          <p className="hero-copy">Đồng hành cùng các chiến dịch có ý nghĩa. Mọi khoản ETH, chứng từ và bước giải ngân đều được ghi nhận on-chain.</p>
          <div className="hero-actions">
            <Link href="/create" className="button button-primary">Tạo chiến dịch</Link>
            <a href="#campaigns" className="button button-secondary">Khám phá chiến dịch</a>
          </div>
        </div>
        <div className="hero-panel">
          <div className="hero-illustration" aria-hidden="true"><span className="hero-heart">♥</span><span className="hero-star star-one">✦</span><span className="hero-star star-two">✦</span></div>
          <div className="hero-stats">
            <span className="panel-label">CỘNG ĐỒNG ĐANG TẠO TÁC ĐỘNG</span>
            <div className="hero-stat"><strong>{count}</strong><span>chiến dịch</span></div>
            <div className="hero-stat"><strong>{eth(totalRaised)}</strong><span>ETH đã quyên góp</span></div>
            <div className="network-line"><span className="status-dot" /> Ethereum Sepolia</div>
          </div>
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
