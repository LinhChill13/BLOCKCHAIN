import { bigintEnv, ethers, requiredAddress } from "./helpers.ts";

const contractAddress = requiredAddress();
const campaignId = bigintEnv("CAMPAIGN_ID", 0n);
const accounts = await ethers.getSigners();

console.log("\nLocal account balances");
console.table(
  await Promise.all(
    accounts.map(async (account, index) => ({
      account: `#${index}`,
      address: account.address,
      eth: ethers.formatEther(await ethers.provider.getBalance(account.address))
    })),
  ),
);

const crowdfunding = await ethers.getContractAt("Crowdfunding", contractAddress);
const contractBalance = await ethers.provider.getBalance(contractAddress);

console.log("Crowdfunding contract");
console.table([
  {
    address: contractAddress,
    eth: ethers.formatEther(contractBalance)
  }
]);

try {
  const campaign = await crowdfunding.getCampaign(campaignId);
  console.log(`Campaign ${campaignId}`);
  console.table([
    {
      creator: campaign.creator,
      beneficiary: campaign.beneficiary,
      targetEth: ethers.formatEther(campaign.targetAmount),
      totalRaisedEth: ethers.formatEther(campaign.totalRaised),
      status: campaign.status === 0n ? "Active" : "Closed",
      withdrawn: campaign.withdrawn,
      metadataId: campaign.metadataId
    }
  ]);
} catch {
  console.log(`Campaign ${campaignId} does not exist yet.`);
}
