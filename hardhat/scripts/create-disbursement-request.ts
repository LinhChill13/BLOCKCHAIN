import { bigintEnv, ethers, getSigner, requiredAddress } from "./helpers.ts";

const beneficiary = await getSigner(1);
const campaignId = bigintEnv("CAMPAIGN_ID", 0n);
const amount = ethers.parseEther(process.env.REQUEST_ETH ?? "0.001");
const evidenceCid = process.env.EVIDENCE_CID ?? "bafybeigdyrzt4evidence001";
const evidenceHash = ethers.keccak256(ethers.toUtf8Bytes(evidenceCid));

if (amount <= 0n) {
  throw new Error("REQUEST_ETH must be greater than zero.");
}
if (evidenceCid.trim().length === 0) {
  throw new Error("EVIDENCE_CID must not be empty.");
}

const crowdfunding = await ethers.getContractAt("Crowdfunding", requiredAddress(), beneficiary);
console.log(`Requesting ${ethers.formatEther(amount)} ETH from campaign ${campaignId}...`);
const tx = await crowdfunding.createDisbursementRequest(campaignId, amount, evidenceCid, evidenceHash);
await tx.wait();
console.log("Transaction:", tx.hash);
console.log("Request ID:", await crowdfunding.getActiveDisbursementRequestId(campaignId));
console.log("Evidence CID:", evidenceCid);
console.log("Evidence hash:", evidenceHash);
