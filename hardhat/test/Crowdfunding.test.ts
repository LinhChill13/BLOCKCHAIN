import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

const TARGET_AMOUNT = ethers.parseEther("1");
const DONATION_AMOUNT = ethers.parseEther("0.1");
const METADATA_ID = "campaign-001";

async function deployCampaignFixture() {
  const crowdfunding = await ethers.deployContract("Crowdfunding");
  const [creator, beneficiary, donor, stranger] = await ethers.getSigners();
  const latestBlock = await ethers.provider.getBlock("latest");
  const deadline = BigInt(latestBlock!.timestamp + 3_600);

  async function createCampaign() {
    return crowdfunding
      .connect(creator)
      .createCampaign(beneficiary.address, TARGET_AMOUNT, deadline, METADATA_ID);
  }

  return { crowdfunding, creator, beneficiary, donor, stranger, deadline, createCampaign };
}

describe("Crowdfunding", function () {
  it("TC-01: tạo campaign và lưu đúng dữ liệu", async function () {
    const { crowdfunding, creator, beneficiary, deadline, createCampaign } =
      await deployCampaignFixture();

    await expect(createCampaign())
      .to.emit(crowdfunding, "CampaignCreated")
      .withArgs(0n, creator.address, beneficiary.address, TARGET_AMOUNT, deadline, METADATA_ID);

    expect(await crowdfunding.getCampaignCount()).to.equal(1n);

    const campaign = await crowdfunding.getCampaign(0);
    expect(campaign.id).to.equal(0n);
    expect(campaign.creator).to.equal(creator.address);
    expect(campaign.beneficiary).to.equal(beneficiary.address);
    expect(campaign.targetAmount).to.equal(TARGET_AMOUNT);
    expect(campaign.deadline).to.equal(deadline);
    expect(campaign.totalRaised).to.equal(0n);
    expect(campaign.withdrawn).to.equal(false);
    expect(campaign.status).to.equal(0n);
    expect(campaign.metadataId).to.equal(METADATA_ID);
  });

  it("TC-02: revert khi beneficiary là address(0)", async function () {
    const { crowdfunding, creator, deadline } = await deployCampaignFixture();

    await expect(
      crowdfunding
        .connect(creator)
        .createCampaign(ethers.ZeroAddress, TARGET_AMOUNT, deadline, METADATA_ID),
    ).to.be.revertedWith("Invalid beneficiary");
  });

  it("TC-03: revert khi targetAmount bằng 0", async function () {
    const { crowdfunding, creator, beneficiary, deadline } = await deployCampaignFixture();

    await expect(
      crowdfunding.connect(creator).createCampaign(beneficiary.address, 0, deadline, METADATA_ID),
    ).to.be.revertedWith("Target must be greater than zero");
  });

  it("TC-04: revert khi deadline ở quá khứ", async function () {
    const { crowdfunding, creator, beneficiary } = await deployCampaignFixture();
    const latestBlock = await ethers.provider.getBlock("latest");
    const pastDeadline = BigInt(latestBlock!.timestamp - 1);

    await expect(
      crowdfunding
        .connect(creator)
        .createCampaign(beneficiary.address, TARGET_AMOUNT, pastDeadline, METADATA_ID),
    ).to.be.revertedWith("Deadline must be in the future");
  });

  it("TC-05: nhận donate hợp lệ và phát DonationReceived", async function () {
    const { crowdfunding, donor, createCampaign } = await deployCampaignFixture();
    await createCampaign();

    await expect(crowdfunding.connect(donor).donate(0, { value: DONATION_AMOUNT }))
      .to.emit(crowdfunding, "DonationReceived")
      .withArgs(0n, donor.address, DONATION_AMOUNT);

    const campaign = await crowdfunding.getCampaign(0);
    expect(campaign.totalRaised).to.equal(DONATION_AMOUNT);
    expect(await crowdfunding.getDonation(0, donor.address)).to.equal(DONATION_AMOUNT);
  });

  it("TC-06: revert khi donate bằng 0 ETH", async function () {
    const { crowdfunding, donor, createCampaign } = await deployCampaignFixture();
    await createCampaign();

    await expect(crowdfunding.connect(donor).donate(0, { value: 0 })).to.be.revertedWith(
      "Donation must be greater than zero",
    );
  });

  it("TC-07: revert khi donate cho campaign đã đóng", async function () {
    const { crowdfunding, creator, donor, createCampaign } = await deployCampaignFixture();
    await createCampaign();
    await crowdfunding.connect(creator).closeCampaign(0);

    await expect(crowdfunding.connect(donor).donate(0, { value: DONATION_AMOUNT })).to.be.revertedWith(
      "Campaign is closed",
    );
  });

  it("TC-08: revert khi donate sau deadline", async function () {
    const { crowdfunding, donor, deadline, createCampaign } = await deployCampaignFixture();
    await createCampaign();
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(deadline) + 1]);

    await expect(crowdfunding.connect(donor).donate(0, { value: DONATION_AMOUNT })).to.be.revertedWith(
      "Campaign deadline passed",
    );
  });

  it("TC-09: creator đóng campaign thành công", async function () {
    const { crowdfunding, creator, createCampaign } = await deployCampaignFixture();
    await createCampaign();

    await expect(crowdfunding.connect(creator).closeCampaign(0))
      .to.emit(crowdfunding, "CampaignClosed")
      .withArgs(0n, creator.address);

    expect((await crowdfunding.getCampaign(0)).status).to.equal(1n);
  });

  it("TC-10: revert khi ví không phải creator đóng campaign", async function () {
    const { crowdfunding, stranger, createCampaign } = await deployCampaignFixture();
    await createCampaign();

    await expect(crowdfunding.connect(stranger).closeCampaign(0)).to.be.revertedWith(
      "Only creator can close campaign",
    );
  });

  it("TC-11: beneficiary rút tiền hợp lệ", async function () {
    const { crowdfunding, creator, beneficiary, donor, createCampaign } =
      await deployCampaignFixture();
    await createCampaign();
    await crowdfunding.connect(donor).donate(0, { value: DONATION_AMOUNT });
    await crowdfunding.connect(creator).closeCampaign(0);

    const balanceBefore = await ethers.provider.getBalance(beneficiary.address);
    await expect(crowdfunding.connect(beneficiary).withdraw(0))
      .to.emit(crowdfunding, "FundsWithdrawn")
      .withArgs(0n, beneficiary.address, DONATION_AMOUNT);
    const balanceAfter = await ethers.provider.getBalance(beneficiary.address);

    expect(balanceAfter).to.be.greaterThan(balanceBefore);
    expect((await crowdfunding.getCampaign(0)).withdrawn).to.equal(true);
  });

  it("TC-12: revert khi ví không phải beneficiary rút tiền", async function () {
    const { crowdfunding, creator, donor, stranger, createCampaign } = await deployCampaignFixture();
    await createCampaign();
    await crowdfunding.connect(donor).donate(0, { value: DONATION_AMOUNT });
    await crowdfunding.connect(creator).closeCampaign(0);

    await expect(crowdfunding.connect(stranger).withdraw(0)).to.be.revertedWith(
      "Only beneficiary can withdraw",
    );
  });

  it("TC-13: revert khi rút tiền lần hai", async function () {
    const { crowdfunding, creator, beneficiary, donor, createCampaign } =
      await deployCampaignFixture();
    await createCampaign();
    await crowdfunding.connect(donor).donate(0, { value: DONATION_AMOUNT });
    await crowdfunding.connect(creator).closeCampaign(0);
    await crowdfunding.connect(beneficiary).withdraw(0);

    await expect(crowdfunding.connect(beneficiary).withdraw(0)).to.be.revertedWith(
      "Funds already withdrawn",
    );
  });

  it("TC-14: revert khi rút tiền lúc campaign còn Active và chưa tới deadline", async function () {
    const { crowdfunding, beneficiary, donor, createCampaign } = await deployCampaignFixture();
    await createCampaign();
    await crowdfunding.connect(donor).donate(0, { value: DONATION_AMOUNT });

    await expect(crowdfunding.connect(beneficiary).withdraw(0)).to.be.revertedWith(
      "Campaign is still active",
    );
  });
});
