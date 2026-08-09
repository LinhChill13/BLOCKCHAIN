import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("Crowdfunding", function () {
  it("creates a campaign and records a donation", async function () {
    const crowdfunding = await ethers.deployContract("Crowdfunding");
    const [creator, beneficiary, donor] = await ethers.getSigners();
    const latestBlock = await ethers.provider.getBlock("latest");
    const deadline = BigInt(latestBlock!.timestamp + 3_600);
    const targetAmount = ethers.parseEther("5");
    const donation = ethers.parseEther("1");

    await expect(
      crowdfunding
        .connect(creator)
        .createCampaign(beneficiary.address, targetAmount, deadline, "campaign-001"),
    )
      .to.emit(crowdfunding, "CampaignCreated")
      .withArgs(0n, creator.address, beneficiary.address, targetAmount, deadline, "campaign-001");

    await expect(crowdfunding.connect(donor).donate(0, { value: donation }))
      .to.emit(crowdfunding, "DonationReceived")
      .withArgs(0n, donor.address, donation);

    const campaign = await crowdfunding.getCampaign(0);
    expect(campaign.totalRaised).to.equal(donation);
    expect(await crowdfunding.getDonation(0, donor.address)).to.equal(donation);
  });
});
