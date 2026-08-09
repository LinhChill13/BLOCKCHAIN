import { bigintEnv, ethers, getSigner, requiredAddress } from "./helpers.ts";

const creator = await getSigner(0);
const campaignId = bigintEnv("CAMPAIGN_ID", 0n);
const crowdfunding = await ethers.getContractAt("Crowdfunding", requiredAddress(), creator);

console.log(`Closing campaign ${campaignId}...`);
const tx = await crowdfunding.closeCampaign(campaignId);
await tx.wait();
console.log("Transaction:", tx.hash);
console.log("Campaign closed.");
