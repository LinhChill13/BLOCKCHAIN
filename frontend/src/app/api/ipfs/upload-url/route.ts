import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { createPublicClient, http, isAddress, isHex, type Address, type Hex } from "viem";
import { sepolia } from "viem/chains";
import { crowdfundingAbi, crowdfundingAddress, isContractConfigured } from "@/lib/contract";
import { buildUploadAuthMessage, type UploadAuthPayload } from "@/lib/upload-auth";

export const dynamic = "force-dynamic";

const MAX_EVIDENCE_FILE_SIZE = 10 * 1024 * 1024;
const MAX_AUTH_DURATION_MS = 5 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 60 * 1000;
const ALLOWED_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg"];
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CAMPAIGN_ID_PATTERN = /^(?:0|[1-9][0-9]{0,76})$/;
const MAX_UINT256 = (1n << 256n) - 1n;

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? Redis.fromEnv()
  : null;

const walletLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      prefix: "crowdfund:upload:wallet",
    })
  : null;

const ipLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "1 m"),
      prefix: "crowdfund:upload:ip",
    })
  : null;

type UploadUrlRequest = {
  campaignId?: unknown;
  address?: unknown;
  nonce?: unknown;
  issuedAt?: unknown;
  expiresAt?: unknown;
  origin?: unknown;
  fileName?: unknown;
  fileSize?: unknown;
  mimeType?: unknown;
  signature?: unknown;
};

function invalidRequest() {
  return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
}

function isValidFileMetadata(body: UploadUrlRequest): body is UploadUrlRequest & Pick<UploadAuthPayload, "fileName" | "fileSize" | "mimeType"> {
  return typeof body.fileName === "string"
    && body.fileName.trim().length > 0
    && body.fileName.length <= 255
    && typeof body.fileSize === "number"
    && Number.isSafeInteger(body.fileSize)
    && body.fileSize > 0
    && body.fileSize <= MAX_EVIDENCE_FILE_SIZE
    && typeof body.mimeType === "string"
    && ALLOWED_MIME_TYPES.includes(body.mimeType);
}

function parsePayload(body: UploadUrlRequest): UploadAuthPayload | null {
  if (
    typeof body.campaignId !== "string"
    || !CAMPAIGN_ID_PATTERN.test(body.campaignId)
    || BigInt(body.campaignId) > MAX_UINT256
    || typeof body.address !== "string"
    || !isAddress(body.address)
    || typeof body.nonce !== "string"
    || !UUID_V4_PATTERN.test(body.nonce)
    || typeof body.issuedAt !== "number"
    || !Number.isSafeInteger(body.issuedAt)
    || typeof body.expiresAt !== "number"
    || !Number.isSafeInteger(body.expiresAt)
    || typeof body.origin !== "string"
    || typeof body.fileName !== "string"
    || typeof body.fileSize !== "number"
    || typeof body.mimeType !== "string"
  ) {
    return null;
  }

  return {
    campaignId: body.campaignId,
    address: body.address.toLowerCase(),
    nonce: body.nonce,
    issuedAt: body.issuedAt,
    expiresAt: body.expiresAt,
    origin: body.origin,
    fileName: body.fileName,
    fileSize: body.fileSize,
    mimeType: body.mimeType,
  };
}

export async function POST(request: Request) {
  const pinataJwt = process.env.PINATA_JWT;
  const sepoliaRpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
  if (!pinataJwt || !redis || !walletLimiter || !ipLimiter || !isContractConfigured || !sepoliaRpcUrl) {
    return NextResponse.json({ error: "IPFS upload is not configured on the server." }, { status: 503 });
  }

  let body: UploadUrlRequest;
  try {
    const parsedBody: unknown = await request.json();
    if (typeof parsedBody !== "object" || parsedBody === null || Array.isArray(parsedBody)) return invalidRequest();
    body = parsedBody as UploadUrlRequest;
  } catch {
    return invalidRequest();
  }

  if (!isValidFileMetadata(body)) {
    return NextResponse.json({ error: "Only PDF, PNG, or JPG files up to 10 MB are allowed." }, { status: 400 });
  }

  const payload = parsePayload(body);
  const signature = body.signature;
  if (!payload || typeof signature !== "string" || !isHex(signature)) {
    return invalidRequest();
  }
  const hexSignature = signature as Hex;
  const walletAddress = payload.address as Address;

  const now = Date.now();
  if (
    payload.issuedAt > now + MAX_FUTURE_SKEW_MS
    || payload.expiresAt <= now
    || payload.expiresAt <= payload.issuedAt
    || payload.expiresAt - payload.issuedAt > MAX_AUTH_DURATION_MS
  ) {
    return NextResponse.json({ error: "Upload authorization has expired or is invalid." }, { status: 401 });
  }

  if (payload.origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid upload origin." }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  try {
    if (!(await ipLimiter.limit(ip)).success) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
  } catch (error) {
    console.error("IPFS upload IP rate limit error:", error);
    return NextResponse.json({ error: "IPFS upload is temporarily unavailable." }, { status: 503 });
  }

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(sepoliaRpcUrl),
  });

  let validSignature: boolean;
  try {
    validSignature = await publicClient.verifyMessage({
      address: walletAddress,
      message: buildUploadAuthMessage(payload),
      signature: hexSignature,
    });
  } catch (error) {
    console.error("IPFS upload signature verification error:", error);
    return NextResponse.json({ error: "Could not verify wallet signature." }, { status: 503 });
  }
  if (!validSignature) {
    return NextResponse.json({ error: "Invalid wallet signature." }, { status: 401 });
  }

  let campaign: { beneficiary: string };
  try {
    campaign = await publicClient.readContract({
      address: crowdfundingAddress,
      abi: crowdfundingAbi,
      functionName: "getCampaign",
      args: [BigInt(payload.campaignId)],
    });
  } catch (error) {
    console.error("IPFS upload campaign verification error:", error);
    return NextResponse.json({ error: "Could not validate the campaign beneficiary." }, { status: 503 });
  }
  if (campaign.beneficiary.toLowerCase() !== payload.address) {
    return NextResponse.json({ error: "Only the campaign beneficiary may upload evidence." }, { status: 403 });
  }

  try {
    if (!(await walletLimiter.limit(payload.address)).success) {
      return NextResponse.json({ error: "Too many upload requests from this wallet." }, { status: 429 });
    }

    const nonceKey = `upload-nonce:${payload.address}:${payload.nonce}`;
    const stored = await redis.set(nonceKey, "used", { nx: true, ex: 300 });
    if (!stored) {
      return NextResponse.json({ error: "Upload authorization was already used." }, { status: 409 });
    }
  } catch (error) {
    console.error("IPFS upload authorization storage error:", error);
    return NextResponse.json({ error: "IPFS upload is temporarily unavailable." }, { status: 503 });
  }

  const pinataResponse = await fetch("https://uploads.pinata.cloud/v3/files/sign", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pinataJwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      date: Math.floor(Date.now() / 1000),
      expires: 60,
      max_file_size: MAX_EVIDENCE_FILE_SIZE,
      allow_mime_types: ALLOWED_MIME_TYPES,
      filename: payload.fileName,
    }),
  });

  const pinataBody = (await pinataResponse.json()) as { data?: unknown; error?: unknown };
  if (!pinataResponse.ok || typeof pinataBody.data !== "string") {
    console.error("Pinata signed upload URL error:", pinataBody.error ?? pinataBody);
    const pinataError = typeof pinataBody.error === "string" ? `: ${pinataBody.error}` : "";
    return NextResponse.json(
      { error: `Pinata rejected the upload URL request (HTTP ${pinataResponse.status})${pinataError}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ url: pinataBody.data });
}
