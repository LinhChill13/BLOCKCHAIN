export type UploadAuthPayload = {
  campaignId: string;
  address: string;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
  origin: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
};

export function buildUploadAuthMessage(payload: UploadAuthPayload) {
  return [
    "CrowdfundChain - Authorize IPFS evidence upload",
    `Origin: ${payload.origin}`,
    `Campaign ID: ${payload.campaignId}`,
    `Wallet: ${payload.address.toLowerCase()}`,
    `Nonce: ${payload.nonce}`,
    `Issued at: ${payload.issuedAt}`,
    `Expires at: ${payload.expiresAt}`,
    `File name: ${JSON.stringify(payload.fileName)}`,
    `File size: ${payload.fileSize}`,
    `MIME type: ${payload.mimeType}`,
  ].join("\n");
}
