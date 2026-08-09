import { bigintEnv, ethers, getSigner, requiredAddress } from "./helpers.ts";

const beneficiary = await getSigner(1);
const campaignId = bigintEnv("CAMPAIGN_ID", 0n);
const crowdfunding = await ethers.getContractAt("Crowdfunding", requiredAddress(), beneficiary);

console.log(`Withdrawing campaign ${campaignId} funds...`);
const tx = await crowdfunding.withdraw(campaignId);
await tx.wait();
console.log("Transaction:", tx.hash);
console.log("Funds withdrawn.");
