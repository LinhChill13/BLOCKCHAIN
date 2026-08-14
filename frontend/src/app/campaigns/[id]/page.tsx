"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useParams } from "next/navigation";
import { encodeFunctionData, formatEther, parseEther } from "viem";
import { useAccount, usePublicClient, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { SiteHeader } from "@/components/site-header";
import {
  crowdfundingAbi, crowdfundingAddress, isContractConfigured, type Campaign, type DisbursementRequest
} from "@/lib/contract";
import { dateTime, eth, shortAddress } from "@/lib/format";
import { evidenceGatewayUrl, evidenceHashForCid, isAcceptedEvidenceFile, uploadEvidenceFile } from "@/lib/ipfs";

const requestStatus = ["Chờ verifier duyệt", "Đã được duyệt", "Đã bị từ chối", "Đã giải ngân", "Đã hủy"];

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const campaignId = BigInt(params.id);
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [donation, setDonation] = useState("0.001");
  const [isCheckingDonation, setIsCheckingDonation] = useState(false);
  const [donationError, setDonationError] = useState("");
  const [requestAmount, setRequestAmount] = useState("0.001");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [uploadedEvidence, setUploadedEvidence] = useState<{ cid: string; evidenceHash: `0x${string}` } | null>(null);
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

  async function donate(event: FormEvent) {
    event.preventDefault();
    setDonationError("");
    if (!address) {
      setDonationError("Hãy kết nối ví trước khi quyên góp.");
      return;
    }

    let donationAmount: bigint;
    try {
      donationAmount = parseEther(donation);
    } catch {
      setDonationError("Số ETH quyên góp không hợp lệ.");
      return;
    }
    if (donationAmount <= 0n) {
      setDonationError("Số ETH quyên góp phải lớn hơn 0.");
      return;
    }
    if (!publicClient) {
      setDonationError("Không thể kết nối RPC để ước tính phí gas.");
      return;
    }

    try {
      setIsCheckingDonation(true);
      const data = encodeFunctionData({ abi: crowdfundingAbi, functionName: "donate", args: [campaignId] });
      const [balance, gasLimit, gasPrice] = await Promise.all([
        publicClient.getBalance({ address }),
        publicClient.estimateGas({ account: address, to: crowdfundingAddress, data, value: donationAmount }),
        publicClient.getGasPrice()
      ]);
      const requiredBalance = donationAmount + gasLimit * gasPrice;
      if (balance < requiredBalance) {
        setDonationError(`Số dư ví không đủ. Cần tối thiểu ${formatEther(requiredBalance)} ETH (gồm ${formatEther(donationAmount)} ETH quyên góp và khoảng ${formatEther(gasLimit * gasPrice)} ETH gas).`);
        return;
      }
      writeContract({ address: crowdfundingAddress, abi: crowdfundingAbi, functionName: "donate", args: [campaignId], value: donationAmount });
    } catch (cause) {
      setDonationError(cause instanceof Error ? cause.message : "Không thể ước tính phí gas cho giao dịch quyên góp.");
    } finally {
      setIsCheckingDonation(false);
    }
  }

  function closeCampaign() {
    writeContract({ address: crowdfundingAddress, abi: crowdfundingAbi, functionName: "closeCampaign", args: [campaignId] });
  }

  async function createRequest(event: FormEvent) {
    event.preventDefault();
    setRequestError("");
    if (!isBeneficiary || activeRequestId > 0n || available <= 0n) {
      setRequestError("Campaign không còn tiền khả dụng để tạo yêu cầu giải ngân.");
      return;
    }

    let amount: bigint;
    try {
      amount = parseEther(requestAmount);
    } catch {
      setRequestError("Số tiền giải ngân không hợp lệ.");
      return;
    }
    if (amount <= 0n || amount > available) {
      setRequestError(`Số tiền giải ngân phải lớn hơn 0 và không vượt quá ${formatEther(available)} ETH.`);
      return;
    }
    if (!evidenceFile) {
      setRequestError("Hãy chọn chứng từ PDF, PNG hoặc JPG trước khi gửi yêu cầu.");
      return;
    }
    if (!isAcceptedEvidenceFile(evidenceFile)) {
      setRequestError("Chỉ chấp nhận PDF, PNG, JPG/JPEG và dung lượng tối đa 10 MB.");
      return;
    }

    try {
      setIsUploadingEvidence(true);
      const uploaded = await uploadEvidenceFile(evidenceFile);
      setUploadedEvidence(uploaded);
      writeContract({
        address: crowdfundingAddress, abi: crowdfundingAbi, functionName: "createDisbursementRequest",
        args: [campaignId, amount, uploaded.cid, uploaded.evidenceHash]
      });
    } catch (cause) {
      setRequestError(cause instanceof Error ? cause.message : "Không thể tạo yêu cầu giải ngân.");
    } finally {
      setIsUploadingEvidence(false);
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
  const canCreateRequest = isBeneficiary && available > 0n;
  const availableLabel = formatEther(available);
  const progress = campaign.targetAmount === 0n ? 0 : Math.min(100, Number((campaign.totalRaised * 100n) / campaign.targetAmount));
  const explorerUrl = `https://sepolia.etherscan.io/address/${crowdfundingAddress}`;
  const isEvidenceHashValid = request ? evidenceHashForCid(request.evidenceCid).toLowerCase() === request.evidenceHash.toLowerCase() : false;

  return (
    <main><SiteHeader /><section className="shell detail-layout">
      <Link href="/" className="back-link">← Tất cả chiến dịch</Link>
      <div className="detail-header"><div><p className="eyebrow">CAMPAIGN #{campaign.id.toString()}</p><h1>{campaign.metadataId || "Chiến dịch chưa có tên"}</h1><p className="muted">Tổ chức {shortAddress(campaign.creator)} · Beneficiary {shortAddress(campaign.beneficiary)}</p></div><span className={`badge ${isActive ? "badge-active" : "badge-closed"}`}>{isActive ? "Đang hoạt động" : "Đã đóng"}</span></div>
      <div className="detail-grid">
        <article className="detail-card"><h2>Kiểm soát giải ngân</h2><dl className="detail-list"><div><dt>Ví tổ chức</dt><dd>{campaign.creator}</dd></div><div><dt>Ví beneficiary</dt><dd>{campaign.beneficiary}</dd></div><div><dt>Ví verifier</dt><dd>{campaign.verifier}</dd></div><div><dt>Đã giải ngân</dt><dd>{eth(campaign.totalWithdrawn)} ETH</dd></div><div><dt>Còn có thể yêu cầu</dt><dd>{availableLabel} ETH</dd></div></dl><a className="text-link" href={explorerUrl} target="_blank" rel="noreferrer">Xem event và giao dịch trên Etherscan ↗</a></article>
        <aside className="donation-card"><p className="eyebrow">TIẾN ĐỘ GÂY QUỸ</p><div className="large-amount">{eth(campaign.totalRaised)} <small>ETH</small></div><p className="muted">trên mục tiêu {eth(campaign.targetAmount)} ETH</p><div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div><div className="donation-meta"><span>{progress}%</span><span>Đến {dateTime(campaign.deadline)}</span></div>
          {isActive && <form onSubmit={donate} className="donation-form"><label>Quyên góp ETH<input type="number" min="0.000000000000000001" step="any" value={donation} onChange={(e) => { setDonation(e.target.value); setDonationError(""); }} required /></label>{donationError && <p className="form-error">{donationError}</p>}<button className="button button-primary button-full" disabled={isPending || isCheckingDonation}>{isCheckingDonation ? "Đang kiểm tra số dư và gas…" : isPending ? "Đang chờ ví…" : "Quyên góp"}</button></form>}
          {isCreator && isActive && <button className="button button-secondary button-full" onClick={closeCampaign} disabled={isPending}>Đóng campaign</button>}
        </aside>
      </div>
      <section className="transactions"><div className="section-heading"><div><p className="eyebrow">QUY TRÌNH MINH BẠCH</p><h2>Yêu cầu giải ngân</h2><p className="muted">Beneficiary công bố số tiền và hash bằng chứng; verifier của campaign duyệt on-chain; sau đó beneficiary mới rút được đúng số tiền đã duyệt.</p></div></div>
        {activeRequestId > 0n && request ? <article className="detail-card"><p className="eyebrow">REQUEST #{activeRequestId.toString()}</p><h3>{requestStatus[request.status] ?? "Không xác định"}</h3><dl className="detail-list"><div><dt>Số tiền</dt><dd>{formatEther(request.amount)} ETH</dd></div><div><dt>Evidence CID</dt><dd className="hash-value">{request.evidenceCid}</dd></div><div><dt>Chứng từ</dt><dd><a className="text-link" href={evidenceGatewayUrl(request.evidenceCid)} target="_blank" rel="noreferrer">Mở chứng từ IPFS ↗</a></dd></div><div><dt>Evidence hash</dt><dd className="hash-value">{request.evidenceHash}</dd></div><div><dt>Đối chiếu CID</dt><dd className={isEvidenceHashValid ? "hash-match" : "hash-mismatch"}>{isEvidenceHashValid ? "CID khớp hash on-chain" : "CID không khớp hash on-chain"}</dd></div></dl>{request.status === 0 && !isVerifier && <p className="notice">Chỉ ví verifier <code>{campaign.verifier}</code> mới có thể duyệt hoặc từ chối request này. Ví hiện tại: <code>{address ?? "chưa kết nối"}</code>.</p>}{isVerifier && request.status === 0 && <><button className="button button-primary" onClick={approveRequest} disabled={isPending}>Duyệt yêu cầu</button><button className="button button-secondary" onClick={rejectRequest} disabled={isPending}>Từ chối yêu cầu</button></>}{isBeneficiary && request.status === 0 && <button className="button button-secondary" onClick={cancelRequest} disabled={isPending}>Hủy yêu cầu</button>}{isBeneficiary && request.status === 1 && <button className="button button-primary" onClick={withdraw} disabled={isPending}>Rút {formatEther(request.amount)} ETH đã duyệt</button>}</article> : canCreateRequest ? <form className="form-card disbursement-form" onSubmit={createRequest}><label>Số ETH cần giải ngân<input type="number" min="0.000000000000000001" step="any" max={formatEther(available)} value={requestAmount} onChange={(e) => setRequestAmount(e.target.value)} required /></label><label>Chứng từ (PDF, PNG, JPG; tối đa 10 MB)<input type="file" accept="application/pdf,image/png,image/jpeg" onChange={(e) => { setEvidenceFile(e.target.files?.[0] ?? null); setUploadedEvidence(null); setRequestError(""); }} required /></label><p className="muted">Chứng từ sẽ được tải lên IPFS public. Chỉ dùng file demo hoặc đã ẩn dữ liệu cá nhân.</p>{uploadedEvidence && <p className="form-success">Đã upload IPFS: <span className="hash-value">{uploadedEvidence.cid}</span></p>}{requestError && <p className="form-error">{requestError}</p>}<button className="button button-primary" disabled={isUploadingEvidence || isPending || receipt.isLoading}>{isUploadingEvidence ? "Đang upload chứng từ…" : isPending || receipt.isLoading ? "Đang chờ ví…" : "Tạo yêu cầu giải ngân"}</button></form> : <div className="empty-state">{isBeneficiary ? "Campaign không còn tiền khả dụng để tạo yêu cầu giải ngân." : "Chưa có yêu cầu đang xử lý. Chỉ beneficiary có thể tạo yêu cầu khi còn tiền khả dụng."}</div>}
        {(writeError || receipt.isError) && <p className="form-error">{writeError?.message || "Transaction thất bại."}</p>}
        {receipt.isSuccess && <p className="form-success">Transaction đã xác nhận. <button className="inline-button" onClick={refresh}>Cập nhật dữ liệu</button></p>}
      </section>
    </section></main>
  );
}
