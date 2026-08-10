import { bigintEnv, ethers, getSigner, requiredAddress } from "./helpers.ts";

const beneficiary = await getSigner(1);
const campaignId = bigintEnv("CAMPAIGN_ID", 0n);
const crowdfunding = await ethers.getContractAt("Crowdfunding", requiredAddress(), beneficiary);
const requestId = process.env.REQUEST_ID === undefined
  ? await crowdfunding.getActiveDisbursementRequestId(campaignId)
  : bigintEnv("REQUEST_ID", 0n);

if (requestId === 0n) {
  throw new Error("No active request. Set REQUEST_ID or create a request first.");
}

console.log(`Cancelling request ${requestId} for campaign ${campaignId}...`);
const tx = await crowdfunding.cancelDisbursement(campaignId, requestId);
await tx.wait();
console.log("Transaction:", tx.hash);
console.log("Request cancelled; a corrected request can be submitted.");
