"use client";

import { FormEvent, useState } from "react";
import { isAddress, parseEther } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { SiteHeader } from "@/components/site-header";
import { crowdfundingAbi, crowdfundingAddress, isContractConfigured } from "@/lib/contract";

export default function CreateCampaignPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [verifier, setVerifier] = useState("");
  const [target, setTarget] = useState("0.1");
  const [deadline, setDeadline] = useState("");
  const [formError, setFormError] = useState("");
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (!isContractConfigured) return setFormError("Thiếu địa chỉ contract Sepolia trong .env.local.");
    if (!isAddress(beneficiary)) return setFormError("Địa chỉ ví thụ hưởng chưa hợp lệ.");
    if (!isAddress(verifier)) return setFormError("Địa chỉ ví verifier chưa hợp lệ.");
    if (verifier.toLowerCase() === beneficiary.toLowerCase()) return setFormError("Verifier phải là ví độc lập với beneficiary.");
    const deadlineTimestamp = Math.floor(new Date(deadline).getTime() / 1000);
    if (!deadlineTimestamp || deadlineTimestamp <= Math.floor(Date.now() / 1000)) return setFormError("Ngày kết thúc phải ở tương lai.");
    try {
      writeContract({
        address: crowdfundingAddress,
        abi: crowdfundingAbi,
        functionName: "createCampaign",
        args: [beneficiary, verifier, parseEther(target), BigInt(deadlineTimestamp), name || "campaign-untitled"]
      });
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Không thể tạo transaction.");
    }
  }

  return (
    <main><SiteHeader /><section className="shell form-layout">
      <div className="form-intro"><p className="eyebrow">CAMPAIGN MỚI</p><h1>Tạo một lời kêu gọi<br />đáng tin cậy.</h1><p>Ví kết nối là tổ chức tạo campaign. Chọn verifier độc lập cho campaign này; địa chỉ đó được khóa khi tạo và chỉ verifier mới được duyệt giải ngân.</p></div>
      <form className="form-card" onSubmit={submit}>
        <label>Tên chiến dịch<input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ví dụ: Hỗ trợ thư viện vùng cao" /></label>
        <label>Nội dung mô tả<textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả mục đích quyên góp…" /></label>
        <label>Hình ảnh (URL)<input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} type="url" placeholder="https://…" /></label>
        <div className="notice">Tên, mô tả và hình ảnh chưa thể lưu hoàn chỉnh trong contract hiện tại; on-chain chỉ lưu <code>metadataId</code> (đang dùng tên chiến dịch). Dùng IPFS/database để lưu metadata công khai.</div>
        <label>Số ETH mục tiêu<input value={target} onChange={(e) => setTarget(e.target.value)} type="number" min="0.000001" step="0.001" required /></label>
        <label>Ngày kết thúc<input value={deadline} onChange={(e) => setDeadline(e.target.value)} type="datetime-local" required /></label>
        <label>Địa chỉ ví thụ hưởng<input value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} placeholder="0x…" required /></label>
        <label>Địa chỉ ví verifier<input value={verifier} onChange={(e) => setVerifier(e.target.value)} placeholder="0x…" required /></label>
        {(formError || error) && <p className="form-error">{formError || error?.message}</p>}
        {receipt.isSuccess && <p className="form-success">Đã tạo campaign thành công. Transaction đã được xác nhận.</p>}
        <button className="button button-primary button-full" disabled={isPending || receipt.isLoading}>{isPending || receipt.isLoading ? "Đang xử lý…" : "Tạo chiến dịch"}</button>
      </form>
    </section></main>
  );
}
