import Link from "next/link";
import { type Campaign } from "@/lib/contract";
import { dateTime, eth, shortAddress } from "@/lib/format";

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const percentage = campaign.targetAmount === BigInt(0)
    ? 0
    : Math.min(100, Number((campaign.totalRaised * BigInt(100)) / campaign.targetAmount));
  const isClosed = campaign.status === 1;

  return (
    <article className="campaign-card">
      <div className="card-topline">
        <span>Campaign #{campaign.id.toString()}</span>
        <span className={`badge ${isClosed ? "badge-closed" : "badge-active"}`}>
          {isClosed ? "Đã đóng" : "Đang hoạt động"}
        </span>
      </div>
      <h2>{campaign.metadataId || `Chiến dịch #${campaign.id.toString()}`}</h2>
      <p className="muted">Tạo bởi {shortAddress(campaign.creator)}</p>
      <div className="progress-track"><div className="progress-fill" style={{ width: `${percentage}%` }} /></div>
      <div className="campaign-amounts">
        <strong>{eth(campaign.totalRaised)} ETH</strong>
        <span>Mục tiêu {eth(campaign.targetAmount)} ETH</span>
      </div>
      <div className="card-footer">
        <span>Hết hạn {dateTime(campaign.deadline)}</span>
        <Link href={`/campaigns/${campaign.id.toString()}`} className="text-link">Xem chi tiết →</Link>
      </div>
    </article>
  );
}
