import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_EVIDENCE_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg"];

type UploadUrlRequest = {
  fileName?: unknown;
  fileSize?: unknown;
  mimeType?: unknown;
};

export async function POST(request: Request) {
  const pinataJwt = process.env.PINATA_JWT;
  if (!pinataJwt) {
    return NextResponse.json({ error: "IPFS upload is not configured on the server." }, { status: 503 });
  }

  let body: UploadUrlRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  }

  if (
    typeof body.fileName !== "string" ||
    body.fileName.trim().length === 0 ||
    typeof body.fileSize !== "number" ||
    !Number.isSafeInteger(body.fileSize) ||
    body.fileSize <= 0 ||
    body.fileSize > MAX_EVIDENCE_FILE_SIZE ||
    typeof body.mimeType !== "string" ||
    !ALLOWED_MIME_TYPES.includes(body.mimeType)
  ) {
    return NextResponse.json({ error: "Only PDF, PNG, or JPG files up to 10 MB are allowed." }, { status: 400 });
  }

  const pinataResponse = await fetch("https://uploads.pinata.cloud/v3/files/sign", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pinataJwt}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      date: Math.floor(Date.now() / 1000),
      expires: 60,
      max_file_size: MAX_EVIDENCE_FILE_SIZE,
      allow_mime_types: ALLOWED_MIME_TYPES,
      filename: body.fileName.trim()
    })
  });

  const pinataBody = (await pinataResponse.json()) as { data?: unknown; error?: unknown };
  if (!pinataResponse.ok || typeof pinataBody.data !== "string") {
    console.error("Pinata signed upload URL error:", pinataBody.error ?? pinataBody);
    const pinataError = typeof pinataBody.error === "string" ? `: ${pinataBody.error}` : "";
    return NextResponse.json(
      { error: `Pinata rejected the upload URL request (HTTP ${pinataResponse.status})${pinataError}` },
      { status: 502 }
    );
  }

  return NextResponse.json({ url: pinataBody.data });
}
