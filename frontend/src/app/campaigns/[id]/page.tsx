"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useParams } from "next/navigation";
import { formatEther, parseEther } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { SiteHeader } from "@/components/site-header";
import {
  crowdfundingAbi, crowdfundingAddress, isContractConfigured, type Campaign, type DisbursementRequest
} from "@/lib/contract";
import { dateTime, eth, shortAddress } from "@/lib/format";

const requestStatus = ["Chờ verifier duyệt", "Đã được duyệt", "Đã bị từ chối", "Đã giải ngân", "Đã hủy"];

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const campaignId = BigInt(params.id);
  const { address } = useAccount();
  const [donation, setDonation] = useState("0.001");
  const [requestAmount, setRequestAmount] = useState("0.001");
  const [evidenceHash, setEvidenceHash] = useState("");
  const [requestError, setRequestError] = useState("");
  const { data, isLoading, error, refetch } = useReadContract({
    address: crowdfundingAddress, abi: crowdfundingAbi, functionName: "getCampaign", args: [campaignId],
    query: { enabled: isContractConfigured }
  });
  const { data: activeRequestIdData, refetch: refetchActiveRequest } = useReadContract({
    address: crowdfundingAddress, abi: crowdfundingAbi, functionName: "getActiveDisbursementRequestId", args: [campaignId],
    query: { enabled: isContractConfigured }
  });
  const activeRequestId = (activeRequestIdData ?? 0n) as bigint;
  const { data: requestData, refetch: refetchRequest } = useReadContract({
    address: crowdfundingAddress, abi: crowdfundingAbi, functionName: "getDisbursementRequest", args: [campaignId, activeRequestId],
    query: { enabled: isContractConfigured && activeRequestId > 0n }
  });
  const campaign = data as unknown as Campaign | undefined;
  const request = requestData as unknown as DisbursementRequest | undefined;
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  function donate(event: FormEvent) {
    event.preventDefault();
    writeContract({ address: crowdfundingAddress, abi: crowdfundingAbi, functionName: "donate", args: [campaignId], value: parseEther(donation) });
  }

  function closeCampaign() {
    writeContract({ address: crowdfundingAddress, abi: crowdfundingAbi, functionName: "closeCampaign", args: [campaignId] });
  }

  function createRequest(event: FormEvent) {
    event.preventDefault();
    setRequestError("");
    if (!/^0x[\da-fA-F]{64}$/.test(evidenceHash)) {
      setRequestError("Evidence hash phải là bytes32: 0x + 64 ký tự hex.");
      return;
    }
    try {
      writeContract({
        address: crowdfundingAddress, abi: crowdfundingAbi, functionName: "createDisbursementRequest",
        args: [campaignId, parseEther(requestAmount), evidenceHash as `0x${string}`]
      });
    } catch (cause) {
      setRequestError(cause instanceof Error ? cause.message : "Không thể tạo yêu cầu giải ngân.");
    }
  }

  function approveRequest() {
    writeContract({ address: crowdfundingAddress, abi: crowdfundingAbi, functionName: "approveDisbursement", args: [campaignId, activeRequestId] });
  }

  function rejectRequest() {
    writeContract({ address: crowdfundingAddress, abi: crowdfundingAbi, functionName: "rejectDisbursement", args: [campaignId, activeRequestId] });
  }

  function cancelRequest() {
    writeContract({ address: crowdfundingAddress, abi: crowdfundingAbi, functionName: "cancelDisbursement", args: [campaignId, activeRequestId] });
  }

  function withdraw() {
    writeContract({ address: crowdfundingAddress, abi: crowdfundingAbi, functionName: "withdraw", args: [campaignId, activeRequestId] });
  }

  function refresh() {
    void Promise.all([refetch(), refetchActiveRequest(), refetchRequest()]);
  }

  if (!isContractConfigured) return <main><SiteHeader /><section className="shell content-section"><div className="notice">Chưa cấu hình địa chỉ contract.</div></section></main>;
  if (isLoading) return <main><SiteHeader /><section className="shell content-section"><p className="muted">Đang tải campaign…</p></section></main>;
  if (error || !campaign) return <main><SiteHeader /><section className="shell content-section"><div className="notice notice-error">Không tìm thấy campaign #{params.id}.</div></section></main>;

  const isCreator = address?.toLowerCase() === campaign.creator.toLowerCase();
  const isBeneficiary = address?.toLowerCase() === campaign.beneficiary.toLowerCase();
  const isVerifier = address?.toLowerCase() === campaign.verifier.toLowerCase();
  const isActive = campaign.status === 0;
  const available = campaign.totalRaised - campaign.totalWithdrawn;
  const progress = campaign.targetAmount === 0n ? 0 : Math.min(100, Number((campaign.totalRaised * 100n) / campaign.targetAmount));
  const explorerUrl = `https://sepolia.etherscan.io/address/${crowdfundingAddress}`;

  return (
    <main><SiteHeader /><section className="shell detail-layout">
      <Link href="/" className="back-link">← Tất cả chiến dịch</Link>
      <div className="detail-header"><div><p className="eyebrow">CAMPAIGN #{campaign.id.toString()}</p><h1>{campaign.metadataId || "Chiến dịch chưa có tên"}</h1><p className="muted">Tổ chức {shortAddress(campaign.creator)} · Beneficiary {shortAddress(campaign.beneficiary)}</p></div><span className={`badge ${isActive ? "badge-active" : "badge-closed"}`}>{isActive ? "Đang hoạt động" : "Đã đóng"}</span></div>
      <div className="detail-grid">
        <article className="detail-card"><h2>Kiểm soát giải ngân</h2><dl className="detail-list"><div><dt>Ví tổ chức</dt><dd>{campaign.creator}</dd></div><div><dt>Ví beneficiary</dt><dd>{campaign.beneficiary}</dd></div><div><dt>Ví verifier</dt><dd>{campaign.verifier}</dd></div><div><dt>Đã giải ngân</dt><dd>{eth(campaign.totalWithdrawn)} ETH</dd></div><div><dt>Còn có thể yêu cầu</dt><dd>{eth(available)} ETH</dd></div></dl><a className="text-link" href={explorerUrl} target="_blank" rel="noreferrer">Xem event và giao dịch trên Etherscan ↗</a></article>
        <aside className="donation-card"><p className="eyebrow">TIẾN ĐỘ GÂY QUỸ</p><div className="large-amount">{eth(campaign.totalRaised)} <small>ETH</small></div><p className="muted">trên mục tiêu {eth(campaign.targetAmount)} ETH</p><div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div><div className="donation-meta"><span>{progress}%</span><span>Đến {dateTime(campaign.deadline)}</span></div>
          {isActive && <form onSubmit={donate} className="donation-form"><label>Quyên góp ETH<input type="number" min="0.000001" step="0.001" value={donation} onChange={(e) => setDonation(e.target.value)} /></label><button className="button button-primary button-full" disabled={isPending}>{isPending ? "Đang chờ ví…" : "Quyên góp"}</button></form>}
          {isCreator && isActive && <button className="button button-secondary button-full" onClick={closeCampaign} disabled={isPending}>Đóng campaign</button>}
        </aside>
      </div>
      <section className="transactions"><div className="section-heading"><div><p className="eyebrow">QUY TRÌNH MINH BẠCH</p><h2>Yêu cầu giải ngân</h2><p className="muted">Beneficiary công bố số tiền và hash bằng chứng; verifier của campaign duyệt on-chain; sau đó beneficiary mới rút được đúng số tiền đã duyệt.</p></div></div>
        {activeRequestId > 0n && request ? <article className="detail-card"><p className="eyebrow">REQUEST #{activeRequestId.toString()}</p><h3>{requestStatus[request.status] ?? "Không xác định"}</h3><dl className="detail-list"><div><dt>Số tiền</dt><dd>{formatEther(request.amount)} ETH</dd></div><div><dt>Evidence hash</dt><dd className="hash-value">{request.evidenceHash}</dd></div></dl>{isVerifier && request.status === 0 && <><button className="button button-primary" onClick={approveRequest} disabled={isPending}>Duyệt yêu cầu</button><button className="button button-secondary" onClick={rejectRequest} disabled={isPending}>Từ chối yêu cầu</button></>}{isBeneficiary && request.status === 0 && <button className="button button-secondary" onClick={cancelRequest} disabled={isPending}>Hủy yêu cầu</button>}{isBeneficiary && request.status === 1 && <button className="button button-primary" onClick={withdraw} disabled={isPending}>Rút {formatEther(request.amount)} ETH đã duyệt</button>}</article> : isBeneficiary && available > 0n ? <form className="form-card disbursement-form" onSubmit={createRequest}><label>Số ETH cần giải ngân<input type="number" min="0.000001" step="0.001" max={formatEther(available)} value={requestAmount} onChange={(e) => setRequestAmount(e.target.value)} required /></label><label>Evidence hash (bytes32)<input value={evidenceHash} onChange={(e) => setEvidenceHash(e.target.value)} placeholder="0x…" required /></label><p className="muted">Hash phải đại diện cho hồ sơ/bằng chứng đã công khai, ví dụ hash của CID IPFS.</p>{requestError && <p className="form-error">{requestError}</p>}<button className="button button-primary" disabled={isPending}>Tạo yêu cầu giải ngân</button></form> : <div className="empty-state">Chưa có yêu cầu đang xử lý. Chỉ beneficiary có thể tạo yêu cầu khi còn tiền khả dụng.</div>}
        {(writeError || receipt.isError) && <p className="form-error">{writeError?.message || "Transaction thất bại."}</p>}
        {receipt.isSuccess && <p className="form-success">Transaction đã xác nhận. <button className="inline-button" onClick={refresh}>Cập nhật dữ liệu</button></p>}
      </section>
    </section></main>
  );
}
