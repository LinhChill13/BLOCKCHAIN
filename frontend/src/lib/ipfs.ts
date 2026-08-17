import { keccak256, toBytes } from "viem";
import { buildUploadAuthMessage } from "./upload-auth";

const MAX_EVIDENCE_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg"];

type PinataUploadResponse = {
  data?: { cid?: string };
  IpfsHash?: string;
  error?: unknown;
};

type UploadAuth = {
  campaignId: bigint;
  address: `0x${string}`;
  signMessage: (message: string) => Promise<`0x${string}`>;
};

export function isAcceptedEvidenceFile(file: File) {
  return file.size > 0 && file.size <= MAX_EVIDENCE_FILE_SIZE && ALLOWED_MIME_TYPES.includes(file.type);
}

export function evidenceHashForCid(cid: string) {
  return keccak256(toBytes(cid));
}

export async function uploadEvidenceFile(file: File, auth: UploadAuth) {
  if (!isAcceptedEvidenceFile(file)) {
    throw new Error("Chỉ chấp nhận PDF, PNG, JPG/JPEG và dung lượng tối đa 10 MB.");
  }

  const issuedAt = Date.now();
  const payload = {
    campaignId: auth.campaignId.toString(),
    address: auth.address.toLowerCase(),
    nonce: crypto.randomUUID(),
    issuedAt,
    expiresAt: issuedAt + 5 * 60 * 1000,
    origin: window.location.origin,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  };
  const signature = await auth.signMessage(buildUploadAuthMessage(payload));

  const signedUrlResponse = await fetch("/api/ipfs/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, signature })
  });
  const signedUrlBody = (await signedUrlResponse.json()) as { url?: unknown; error?: unknown };
  if (!signedUrlResponse.ok || typeof signedUrlBody.url !== "string") {
    throw new Error(typeof signedUrlBody.error === "string" ? signedUrlBody.error : "Không thể chuẩn bị upload IPFS.");
  }

  const formData = new FormData();
  formData.append("network", "public");
  formData.append("file", file, file.name);
  const uploadResponse = await fetch(signedUrlBody.url, { method: "POST", body: formData });
  const uploadBody = (await uploadResponse.json()) as PinataUploadResponse;
  const cid = uploadBody.data?.cid ?? uploadBody.IpfsHash;
  if (!uploadResponse.ok || typeof cid !== "string" || cid.length === 0) {
    throw new Error("Pinata không trả về CID sau khi upload chứng từ.");
  }

  return { cid, evidenceHash: evidenceHashForCid(cid) };
}

export function evidenceGatewayUrl(cid: string) {
  const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? "https://ipfs.io/ipfs";
  return `${gateway.replace(/\/$/, "")}/${encodeURIComponent(cid)}`;
}
