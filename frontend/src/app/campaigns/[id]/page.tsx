"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useParams } from "next/navigation";
import { formatEther, parseEther } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { SiteHeader } from "@/components/site-header";
import { crowdfundingAbi, crowdfundingAddress, isContractConfigured, type Campaign } from "@/lib/contract";
import { dateTime, eth, shortAddress } from "@/lib/format";

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const campaignId = BigInt(params.id);
  const { address } = useAccount();
  const [donation, setDonation] = useState("0.001");
  const { data, isLoading, error, refetch } = useReadContract({
    address: crowdfundingAddress,
    abi: crowdfundingAbi,
    functionName: "getCampaign",
    args: [campaignId],
    query: { enabled: isContractConfigured }
  });
  const campaign = data as unknown as Campaign | undefined;
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  function donate(event: FormEvent) {
    event.preventDefault();
    writeContract({ address: crowdfundingAddress, abi: crowdfundingAbi, functionName: "donate", args: [campaignId], value: parseEther(donation) });
  }

  function closeCampaign() {
    writeContract({ address: crowdfundingAddress, abi: crowdfundingAbi, functionName: "closeCampaign", args: [campaignId] });
  }

  function withdraw() {
    writeContract({ address: crowdfundingAddress, abi: crowdfundingAbi, functionName: "withdraw", args: [campaignId] });
  }

  if (!isContractConfigured) return <main><SiteHeader /><section className="shell content-section"><div className="notice">Chưa cấu hình địa chỉ contract.</div></section></main>;
  if (isLoading) return <main><SiteHeader /><section className="shell content-section"><p className="muted">Đang tải campaign…</p></section></main>;
  if (error || !campaign) return <main><SiteHeader /><section className="shell content-section"><div className="notice notice-error">Không tìm thấy campaign #{params.id}.</div></section></main>;

  const isCreator = address?.toLowerCase() === campaign.creator.toLowerCase();
  const isBeneficiary = address?.toLowerCase() === campaign.beneficiary.toLowerCase();
  const isActive = campaign.status === 0;
  const progress = campaign.targetAmount === BigInt(0) ? 0 : Math.min(100, Number((campaign.totalRaised * BigInt(100)) / campaign.targetAmount));
  const explorerUrl = `https://sepolia.etherscan.io/address/${crowdfundingAddress}`;

  return (
    <main><SiteHeader /><section className="shell detail-layout">
      <Link href="/" className="back-link">← Tất cả chiến dịch</Link>
      <div className="detail-header"><div><p className="eyebrow">CAMPAIGN #{campaign.id.toString()}</p><h1>{campaign.metadataId || "Chiến dịch chưa có tên"}</h1><p className="muted">Tạo bởi {shortAddress(campaign.creator)} · Beneficiary {shortAddress(campaign.beneficiary)}</p></div><span className={`badge ${isActive ? "badge-active" : "badge-closed"}`}>{isActive ? "Đang hoạt động" : "Đã đóng"}</span></div>
      <div className="detail-grid">
        <article className="detail-card"><h2>Thông tin chiến dịch</h2><dl className="detail-list"><div><dt>Ví người tạo</dt><dd>{campaign.creator}</dd></div><div><dt>Ví người thụ hưởng</dt><dd>{campaign.beneficiary}</dd></div><div><dt>Thời hạn</dt><dd>{dateTime(campaign.deadline)}</dd></div><div><dt>Trạng thái rút tiền</dt><dd>{campaign.withdrawn ? "Đã rút" : "Chưa rút"}</dd></div></dl><a className="text-link" href={explorerUrl} target="_blank" rel="noreferrer">Xem event và giao dịch trên Etherscan ↗</a></article>
        <aside className="donation-card"><p className="eyebrow">TIẾN ĐỘ GÂY QUỸ</p><div className="large-amount">{eth(campaign.totalRaised)} <small>ETH</small></div><p className="muted">trên mục tiêu {eth(campaign.targetAmount)} ETH</p><div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div><div className="donation-meta"><span>{progress}%</span><span>Đến {dateTime(campaign.deadline)}</span></div>
          {isActive && <form onSubmit={donate} className="donation-form"><label>Quyên góp ETH<input type="number" min="0.000001" step="0.001" value={donation} onChange={(e) => setDonation(e.target.value)} /></label><button className="button button-primary button-full" disabled={isPending}>{isPending ? "Đang chờ ví…" : "Quyên góp"}</button></form>}
          {isCreator && isActive && <button className="button button-secondary button-full" onClick={closeCampaign} disabled={isPending}>Đóng campaign</button>}
          {isBeneficiary && !campaign.withdrawn && <button className="button button-primary button-full" onClick={withdraw} disabled={isPending}>Rút {formatEther(campaign.totalRaised)} ETH</button>}
          {(writeError || receipt.isError) && <p className="form-error">{writeError?.message || "Transaction thất bại."}</p>}
          {receipt.isSuccess && <p className="form-success">Transaction đã xác nhận. <button className="inline-button" onClick={() => refetch()}>Cập nhật dữ liệu</button></p>}
        </aside>
      </div>
      <section className="transactions"><div className="section-heading"><div><p className="eyebrow">LỊCH SỬ</p><h2>Giao dịch on-chain</h2></div></div><div className="empty-state">Mọi donation, close và withdraw đều phát event. Mở Etherscan để xem toàn bộ transaction log công khai của contract.</div></section>
    </section></main>
  );
}
