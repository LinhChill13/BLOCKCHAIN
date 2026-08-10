import { bigintEnv, ethers, getSigner, requiredAddress } from "./helpers.ts";

const donor = await getSigner(2);
const campaignId = bigintEnv("CAMPAIGN_ID", 0n);
const amount = ethers.parseEther(process.env.DONATION_ETH ?? "0.001");
const crowdfunding = await ethers.getContractAt("Crowdfunding", requiredAddress(), donor);

if (amount <= 0n) {
  throw new Error("DONATION_ETH must be greater than zero.");
}

console.log(`Donating ${ethers.formatEther(amount)} ETH to campaign ${campaignId}...`);
const tx = await crowdfunding.donate(campaignId, { value: amount });
await tx.wait();
console.log("Transaction:", tx.hash);
console.log("Donation recorded.");
