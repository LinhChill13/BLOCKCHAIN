import { bigintEnv, ethers, getSigner, requiredAddress } from "./helpers.ts";

const beneficiary = await getSigner(1);
const campaignId = bigintEnv("CAMPAIGN_ID", 0n);
const amount = ethers.parseEther(process.env.REQUEST_ETH ?? "0.001");
const evidenceHash = process.env.EVIDENCE_HASH ?? ethers.keccak256(ethers.toUtf8Bytes("ipfs://evidence-001"));

if (amount <= 0n) {
  throw new Error("REQUEST_ETH must be greater than zero.");
}
if (!ethers.isHexString(evidenceHash, 32) || evidenceHash === ethers.ZeroHash) {
  throw new Error("EVIDENCE_HASH must be a non-zero bytes32 hash.");
}

const crowdfunding = await ethers.getContractAt("Crowdfunding", requiredAddress(), beneficiary);
console.log(`Requesting ${ethers.formatEther(amount)} ETH from campaign ${campaignId}...`);
const tx = await crowdfunding.createDisbursementRequest(campaignId, amount, evidenceHash);
await tx.wait();
console.log("Transaction:", tx.hash);
console.log("Request ID:", await crowdfunding.getActiveDisbursementRequestId(campaignId));
console.log("Evidence hash:", evidenceHash);
