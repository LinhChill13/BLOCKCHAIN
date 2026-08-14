import { network } from "hardhat";

const { ethers } = await network.create();
const [organization, beneficiaryA, donor, verifierA, verifierB, beneficiaryB, verifierC] =
  await ethers.getSigners();

if (verifierC === undefined) {
  throw new Error("The demo seed needs at least 7 local accounts. Run it against Hardhat localhost.");
}

const crowdfunding = await ethers.deployContract("Crowdfunding");
const contractAddress = await crowdfunding.getAddress();
const latestBlock = await ethers.provider.getBlock("latest");
const deadline = BigInt(latestBlock!.timestamp + 30 * 24 * 60 * 60);

const evidenceHash = (cid: string) => ethers.keccak256(ethers.toUtf8Bytes(cid));

async function createCampaign(
  beneficiary: string,
  verifier: string,
  targetEth: string,
  metadataId: string,
) {
  const tx = await crowdfunding
    .connect(organization)
    .createCampaign(beneficiary, verifier, ethers.parseEther(targetEth), deadline, metadataId);
  await tx.wait();
}

async function donate(campaignId: bigint, amountEth: string) {
  const tx = await crowdfunding.connect(donor).donate(campaignId, { value: ethers.parseEther(amountEth) });
  await tx.wait();
}

// Campaign #0: a request that is awaiting review.
await createCampaign(beneficiaryA.address, verifierA.address, "1", "school-library");
await donate(0n, "0.6");
await (await crowdfunding
  .connect(beneficiaryA)
  .createDisbursementRequest(0n, ethers.parseEther("0.15"), "bafybeigdyrzt-school-library-receipts-01", evidenceHash("bafybeigdyrzt-school-library-receipts-01")))
  .wait();

// Campaign #1: a successful, partially completed disbursement.
await createCampaign(beneficiaryA.address, verifierB.address, "2", "flood-relief");
await donate(1n, "1");
await (await crowdfunding
  .connect(beneficiaryA)
  .createDisbursementRequest(1n, ethers.parseEther("0.25"), "bafybeigdyrzt-flood-relief-invoices-01", evidenceHash("bafybeigdyrzt-flood-relief-invoices-01")))
  .wait();
await (await crowdfunding.connect(verifierB).approveDisbursement(1n, 1n)).wait();
await (await crowdfunding.connect(beneficiaryA).withdraw(1n, 1n)).wait();

// Campaign #2: verifier rejects an insufficient request; funds remain in the contract.
await createCampaign(beneficiaryB.address, verifierC.address, "1", "community-clinic");
await donate(2n, "0.4");
await (await crowdfunding
  .connect(beneficiaryB)
  .createDisbursementRequest(2n, ethers.parseEther("0.1"), "bafybeigdyrzt-community-clinic-incomplete-proof", evidenceHash("bafybeigdyrzt-community-clinic-incomplete-proof")))
  .wait();
await (await crowdfunding.connect(verifierC).rejectDisbursement(2n, 1n)).wait();

// Campaign #3: beneficiary corrects its own mistake by cancelling the request.
await createCampaign(beneficiaryB.address, verifierA.address, "0.5", "emergency-food");
await donate(3n, "0.3");
await (await crowdfunding
  .connect(beneficiaryB)
  .createDisbursementRequest(3n, ethers.parseEther("0.05"), "bafybeigdyrzt-emergency-food-wrong-amount", evidenceHash("bafybeigdyrzt-emergency-food-wrong-amount")))
  .wait();
await (await crowdfunding.connect(beneficiaryB).cancelDisbursement(3n, 1n)).wait();

console.log("\nDemo data seeded successfully.");
console.log("Crowdfunding address:", contractAddress);
console.log("Organization:", organization.address);
console.log("Donor:", donor.address);
console.table([
  { id: 0, metadataId: "school-library", verifier: verifierA.address, requestStatus: "Pending", raisedEth: "0.6", withdrawnEth: "0" },
  { id: 1, metadataId: "flood-relief", verifier: verifierB.address, requestStatus: "Withdrawn", raisedEth: "1", withdrawnEth: "0.25" },
  { id: 2, metadataId: "community-clinic", verifier: verifierC.address, requestStatus: "Rejected", raisedEth: "0.4", withdrawnEth: "0" },
  { id: 3, metadataId: "emergency-food", verifier: verifierA.address, requestStatus: "Cancelled", raisedEth: "0.3", withdrawnEth: "0" },
]);
console.log("\nSet this in frontend/.env.local:");
console.log(`NEXT_PUBLIC_CROWDFUNDING_ADDRESS=${contractAddress}`);
