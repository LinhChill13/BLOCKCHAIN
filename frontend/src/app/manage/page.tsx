"use client";

import Link from "next/link";
import { useAccount, useReadContracts } from "wagmi";
import { CampaignCard } from "@/components/campaign-card";
import { SiteHeader } from "@/components/site-header";
import { crowdfundingAbi, crowdfundingAddress, isContractConfigured } from "@/lib/contract";
import { useCampaigns } from "@/lib/use-campaigns";

export default function ManagePage() {
  const { address, isConnected } = useAccount();
  const { campaigns, count, isLoading } = useCampaigns();
  const donationCalls = campaigns.map((campaign) => ({
    address: crowdfundingAddress,
    abi: crowdfundingAbi,
    functionName: "getDonation" as const,
    args: [campaign.id, address ?? "0x0000000000000000000000000000000000000000"] as const
  }));
  const donations = useReadContracts({ contracts: donationCalls, query: { enabled: isContractConfigured && Boolean(address) && donationCalls.length > 0 } });
  const created = campaigns.filter((campaign) => campaign.creator.toLowerCase() === address?.toLowerCase());
  const donated = campaigns.filter((_, index) => {
    const result = donations.data?.[index];
    return result?.status === "success" && (result.result as bigint) > BigInt(0);
  });

  return (
    <main><SiteHeader /><section className="shell content-section">
      <p className="eyebrow">DASHBOARD VÍ</p><h1>Quản lý chiến dịch của bạn</h1>
      {!isConnected && <div className="notice">Kết nối ví Sepolia để xem campaign bạn tạo và đã quyên góp.</div>}
      {isLoading && <p className="muted">Đang đọc {count} campaign on-chain…</p>}
      {isConnected && <>
        <div className="section-heading compact"><div><h2>Chiến dịch đã tạo ({created.length})</h2></div><Link href="/create" className="text-link">Tạo campaign mới →</Link></div>
        <div className="campaign-grid">{created.map((campaign) => <CampaignCard key={campaign.id.toString()} campaign={campaign} />)}</div>
        {created.length === 0 && <div className="empty-state">Ví này chưa tạo campaign nào.</div>}
        <div className="section-heading compact"><div><h2>Chiến dịch đã quyên góp ({donated.length})</h2><p className="muted">Dựa trên số tiền donation của ví hiện tại trong từng campaign.</p></div></div>
        <div className="campaign-grid">{donated.map((campaign) => <CampaignCard key={campaign.id.toString()} campaign={campaign} />)}</div>
        {donated.length === 0 && <div className="empty-state">Ví này chưa donate cho campaign nào.</div>}
      </>}
    </section></main>
  );
}
