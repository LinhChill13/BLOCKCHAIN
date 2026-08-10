import { ethers, getSigner, requiredAddress } from "./helpers.ts";

const creator = await getSigner(0);
const defaultBeneficiary = await getSigner(1);
const defaultVerifier = await getSigner(3);
const beneficiary = process.env.BENEFICIARY ?? defaultBeneficiary.address;
const verifier = process.env.VERIFIER ?? defaultVerifier.address;
const targetAmount = ethers.parseEther(process.env.TARGET_ETH ?? "1");
const deadlineSeconds = Number(process.env.DEADLINE_SECONDS ?? "3600");
const metadataId = process.env.METADATA_ID ?? "campaign-001";

if (!ethers.isAddress(beneficiary)) {
  throw new Error("BENEFICIARY must be a valid address.");
}
if (!ethers.isAddress(verifier)) {
  throw new Error("VERIFIER must be a valid address.");
}

if (!Number.isInteger(deadlineSeconds) || deadlineSeconds <= 0) {
  throw new Error("DEADLINE_SECONDS must be a positive whole number.");
}

const latestBlock = await ethers.provider.getBlock("latest");
const deadline = BigInt(latestBlock!.timestamp + deadlineSeconds);
const crowdfunding = await ethers.getContractAt("Crowdfunding", requiredAddress(), creator);
const tx = await crowdfunding.createCampaign(beneficiary, verifier, targetAmount, deadline, metadataId);

console.log("Creating campaign...");
await tx.wait();
console.log("Transaction:", tx.hash);
console.log("Campaign ID:", (await crowdfunding.getCampaignCount()) - 1n);
console.log("Beneficiary:", beneficiary);
console.log("Verifier:", verifier);
console.log("Target:", ethers.formatEther(targetAmount), "ETH");
console.log("Deadline:", new Date(Number(deadline) * 1_000).toISOString());
