import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

const TARGET_AMOUNT = ethers.parseEther("1");
const DONATION_AMOUNT = ethers.parseEther("0.1");
const REQUEST_AMOUNT = ethers.parseEther("0.04");
const METADATA_ID = "campaign-001";
const EVIDENCE_CID = "bafybeigdyrzt4evidence001";
const EVIDENCE_HASH = ethers.keccak256(ethers.toUtf8Bytes(EVIDENCE_CID));

async function expectAccountingInvariant(crowdfunding: any, campaignId: number) {
  const campaign = await crowdfunding.getCampaign(campaignId);
  const contractBalance = await ethers.provider.getBalance(await crowdfunding.getAddress());

  expect(campaign.totalWithdrawn).to.be.lte(campaign.totalRaised);
  expect(contractBalance).to.equal(campaign.totalRaised - campaign.totalWithdrawn);
}

async function deployCampaignFixture() {
  const [creator, beneficiary, donor, verifier, stranger] = await ethers.getSigners();
  const crowdfunding = await ethers.deployContract("Crowdfunding");
  const latestBlock = await ethers.provider.getBlock("latest");
  const deadline = BigInt(latestBlock!.timestamp + 3_600);

  async function createCampaign() {
    return crowdfunding
      .connect(creator)
      .createCampaign(beneficiary.address, verifier.address, TARGET_AMOUNT, deadline, METADATA_ID);
  }

  async function fundCampaign() {
    await createCampaign();
    await crowdfunding.connect(donor).donate(0, { value: DONATION_AMOUNT });
  }

  return { crowdfunding, creator, beneficiary, donor, verifier, stranger, deadline, createCampaign, fundCampaign };
}

describe("Crowdfunding", function () {
  it("TC-01: tạo campaign và lưu verifier riêng cho campaign", async function () {
    const { crowdfunding, creator, beneficiary, verifier, deadline, createCampaign } = await deployCampaignFixture();

    await expect(createCampaign())
      .to.emit(crowdfunding, "CampaignCreated")
      .withArgs(0n, creator.address, beneficiary.address, verifier.address, TARGET_AMOUNT, deadline, METADATA_ID);

    const campaign = await crowdfunding.getCampaign(0);
    expect(await crowdfunding.getCampaignCount()).to.equal(1n);
    expect(campaign.creator).to.equal(creator.address);
    expect(campaign.beneficiary).to.equal(beneficiary.address);
    expect(campaign.verifier).to.equal(verifier.address);
    expect(campaign.totalRaised).to.equal(0n);
    expect(campaign.totalWithdrawn).to.equal(0n);
    expect(campaign.status).to.equal(0n);
  });

  it("TC-02: kiểm tra dữ liệu campaign không hợp lệ", async function () {
    const { crowdfunding, creator, beneficiary, verifier, deadline } = await deployCampaignFixture();
    const latestBlock = await ethers.provider.getBlock("latest");

    await expect(
      crowdfunding.connect(creator).createCampaign(ethers.ZeroAddress, verifier.address, TARGET_AMOUNT, deadline, METADATA_ID),
    ).to.be.revertedWith("Invalid beneficiary");
    await expect(
      crowdfunding.connect(creator).createCampaign(beneficiary.address, verifier.address, 0, deadline, METADATA_ID),
    ).to.be.revertedWith("Target must be greater than zero");
    await expect(
      crowdfunding
        .connect(creator)
        .createCampaign(beneficiary.address, verifier.address, TARGET_AMOUNT, BigInt(latestBlock!.timestamp - 1), METADATA_ID),
    ).to.be.revertedWith("Deadline must be in the future");
    await expect(
      crowdfunding.connect(creator).createCampaign(beneficiary.address, ethers.ZeroAddress, TARGET_AMOUNT, deadline, METADATA_ID),
    ).to.be.revertedWith("Invalid verifier");
    await expect(
      crowdfunding.connect(creator).createCampaign(beneficiary.address, beneficiary.address, TARGET_AMOUNT, deadline, METADATA_ID),
    ).to.be.revertedWith("Verifier must be independent");
    await expect(
      crowdfunding.connect(creator).createCampaign(beneficiary.address, creator.address, TARGET_AMOUNT, deadline, METADATA_ID),
    ).to.be.revertedWith("Verifier must be independent");
  });

  it("TC-03: donor donate và không thể donate sai điều kiện", async function () {
    const { crowdfunding, creator, donor, deadline, createCampaign } = await deployCampaignFixture();
    await createCampaign();

    await expect(crowdfunding.connect(donor).donate(0, { value: DONATION_AMOUNT }))
      .to.emit(crowdfunding, "DonationReceived")
      .withArgs(0n, donor.address, DONATION_AMOUNT);
    expect((await crowdfunding.getCampaign(0)).totalRaised).to.equal(DONATION_AMOUNT);
    await expectAccountingInvariant(crowdfunding, 0);

    await expect(crowdfunding.connect(donor).donate(0, { value: 0 })).to.be.revertedWith(
      "Donation must be greater than zero",
    );
    await crowdfunding.connect(creator).closeCampaign(0);
    await expect(crowdfunding.connect(donor).donate(0, { value: DONATION_AMOUNT })).to.be.revertedWith(
      "Campaign is closed",
    );

    await createCampaign();
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(deadline) + 1]);
    await expect(crowdfunding.connect(donor).donate(1, { value: DONATION_AMOUNT })).to.be.revertedWith(
      "Campaign deadline passed",
    );
  });

  it("TC-04: chỉ tổ chức có thể đóng campaign", async function () {
    const { crowdfunding, creator, stranger, createCampaign } = await deployCampaignFixture();
    await createCampaign();

    await expect(crowdfunding.connect(stranger).closeCampaign(0)).to.be.revertedWith(
      "Only creator can close campaign",
    );
    await expect(crowdfunding.connect(creator).closeCampaign(0))
      .to.emit(crowdfunding, "CampaignClosed")
      .withArgs(0n, creator.address);
  });

  it("TC-05: beneficiary tạo yêu cầu với CID và hash khớp nhau", async function () {
    const { crowdfunding, beneficiary, fundCampaign } = await deployCampaignFixture();
    await fundCampaign();

    await expect(crowdfunding.connect(beneficiary).createDisbursementRequest(0, REQUEST_AMOUNT, EVIDENCE_CID, EVIDENCE_HASH))
      .to.emit(crowdfunding, "DisbursementRequested")
      .withArgs(0n, 1n, beneficiary.address, REQUEST_AMOUNT, EVIDENCE_CID, EVIDENCE_HASH);

    const request = await crowdfunding.getDisbursementRequest(0, 1);
    expect(request.amount).to.equal(REQUEST_AMOUNT);
    expect(request.evidenceCid).to.equal(EVIDENCE_CID);
    expect(request.evidenceHash).to.equal(EVIDENCE_HASH);
    expect(request.status).to.equal(0n);
    expect(await crowdfunding.getActiveDisbursementRequestId(0)).to.equal(1n);
  });

  it("TC-06: kiểm tra quyền, CID và hash khi tạo request", async function () {
    const { crowdfunding, donor, beneficiary, stranger, fundCampaign } = await deployCampaignFixture();
    await fundCampaign();

    await expect(crowdfunding.connect(stranger).createDisbursementRequest(0, REQUEST_AMOUNT, EVIDENCE_CID, EVIDENCE_HASH))
      .to.be.revertedWith("Only beneficiary can request");
    await expect(crowdfunding.connect(beneficiary).createDisbursementRequest(0, 0, EVIDENCE_CID, EVIDENCE_HASH))
      .to.be.revertedWith("Amount must be greater than zero");
    await expect(crowdfunding.connect(beneficiary).createDisbursementRequest(0, REQUEST_AMOUNT, "", EVIDENCE_HASH))
      .to.be.revertedWith("Evidence CID is required");
    await expect(crowdfunding.connect(beneficiary).createDisbursementRequest(0, REQUEST_AMOUNT, EVIDENCE_CID, ethers.ZeroHash))
      .to.be.revertedWith("Evidence hash is required");
    await expect(crowdfunding.connect(beneficiary).createDisbursementRequest(0, REQUEST_AMOUNT, EVIDENCE_CID, ethers.keccak256(ethers.toUtf8Bytes("different-cid"))))
      .to.be.revertedWith("Evidence hash mismatch");
    await expect(crowdfunding.connect(beneficiary).createDisbursementRequest(0, DONATION_AMOUNT + 1n, EVIDENCE_CID, EVIDENCE_HASH))
      .to.be.revertedWith("Amount exceeds available funds");
    expect(await crowdfunding.getDonation(0, donor.address)).to.equal(DONATION_AMOUNT);
  });

  it("TC-07: mỗi campaign chỉ có một request đang xử lý", async function () {
    const { crowdfunding, beneficiary, fundCampaign } = await deployCampaignFixture();
    await fundCampaign();
    await crowdfunding.connect(beneficiary).createDisbursementRequest(0, REQUEST_AMOUNT, EVIDENCE_CID, EVIDENCE_HASH);

    await expect(crowdfunding.connect(beneficiary).createDisbursementRequest(0, REQUEST_AMOUNT, EVIDENCE_CID, EVIDENCE_HASH))
      .to.be.revertedWith("Active request exists");
  });

  it("TC-08: chỉ verifier của campaign có thể duyệt request pending", async function () {
    const { crowdfunding, beneficiary, verifier, stranger, fundCampaign } = await deployCampaignFixture();
    await fundCampaign();
    await crowdfunding.connect(beneficiary).createDisbursementRequest(0, REQUEST_AMOUNT, EVIDENCE_CID, EVIDENCE_HASH);

    await expect(crowdfunding.connect(stranger).approveDisbursement(0, 1)).to.be.revertedWith(
      "Only campaign verifier can approve",
    );
    await expect(crowdfunding.connect(verifier).approveDisbursement(0, 1))
      .to.emit(crowdfunding, "DisbursementApproved")
      .withArgs(0n, 1n, verifier.address);
    expect((await crowdfunding.getDisbursementRequest(0, 1)).status).to.equal(1n);
    await expect(crowdfunding.connect(verifier).approveDisbursement(0, 1)).to.be.revertedWith(
      "Request is not pending",
    );
  });

  it("TC-09: mỗi campaign có thể dùng verifier khác", async function () {
    const { crowdfunding, creator, beneficiary, donor, verifier, stranger, deadline, createCampaign } =
      await deployCampaignFixture();
    await createCampaign();
    await crowdfunding
      .connect(creator)
      .createCampaign(beneficiary.address, stranger.address, TARGET_AMOUNT, deadline, "campaign-002");
    await crowdfunding.connect(donor).donate(1, { value: DONATION_AMOUNT });
    await crowdfunding.connect(beneficiary).createDisbursementRequest(1, REQUEST_AMOUNT, EVIDENCE_CID, EVIDENCE_HASH);

    expect((await crowdfunding.getCampaign(0)).verifier).to.equal(verifier.address);
    expect((await crowdfunding.getCampaign(1)).verifier).to.equal(stranger.address);
    await expect(crowdfunding.connect(verifier).approveDisbursement(1, 1)).to.be.revertedWith(
      "Only campaign verifier can approve",
    );
    await expect(crowdfunding.connect(stranger).approveDisbursement(1, 1))
      .to.emit(crowdfunding, "DisbursementApproved")
      .withArgs(1n, 1n, stranger.address);
  });

  it("TC-10: beneficiary chỉ rút đúng request đã được verifier duyệt", async function () {
    const { crowdfunding, beneficiary, verifier, stranger, fundCampaign } = await deployCampaignFixture();
    await fundCampaign();
    await crowdfunding.connect(beneficiary).createDisbursementRequest(0, REQUEST_AMOUNT, EVIDENCE_CID, EVIDENCE_HASH);

    await expect(crowdfunding.connect(beneficiary).withdraw(0, 1)).to.be.revertedWith("Request is not approved");
    await crowdfunding.connect(verifier).approveDisbursement(0, 1);
    await expect(crowdfunding.connect(stranger).withdraw(0, 1)).to.be.revertedWith(
      "Only beneficiary can withdraw",
    );

    const balanceBefore = await ethers.provider.getBalance(beneficiary.address);
    await expect(crowdfunding.connect(beneficiary).withdraw(0, 1))
      .to.emit(crowdfunding, "FundsWithdrawn")
      .withArgs(0n, 1n, beneficiary.address, REQUEST_AMOUNT);
    const balanceAfter = await ethers.provider.getBalance(beneficiary.address);
    expect(balanceAfter).to.be.greaterThan(balanceBefore);
    expect((await crowdfunding.getCampaign(0)).totalWithdrawn).to.equal(REQUEST_AMOUNT);
    expect((await crowdfunding.getDisbursementRequest(0, 1)).status).to.equal(3n);
    expect(await crowdfunding.getActiveDisbursementRequestId(0)).to.equal(0n);
    await expectAccountingInvariant(crowdfunding, 0);
  });

  it("TC-11: sau khi rút beneficiary có thể tạo request kế tiếp trong số dư còn lại", async function () {
    const { crowdfunding, beneficiary, verifier, fundCampaign } = await deployCampaignFixture();
    await fundCampaign();
    await crowdfunding.connect(beneficiary).createDisbursementRequest(0, REQUEST_AMOUNT, EVIDENCE_CID, EVIDENCE_HASH);
    await crowdfunding.connect(verifier).approveDisbursement(0, 1);
    await crowdfunding.connect(beneficiary).withdraw(0, 1);

    const remainingAmount = DONATION_AMOUNT - REQUEST_AMOUNT;
    await crowdfunding.connect(beneficiary).createDisbursementRequest(0, remainingAmount, EVIDENCE_CID, EVIDENCE_HASH);
    expect(await crowdfunding.getDisbursementRequestCount(0)).to.equal(2n);
  });

  it("TC-12: verifier có thể từ chối request pending và beneficiary tạo request mới", async function () {
    const { crowdfunding, beneficiary, verifier, stranger, fundCampaign } = await deployCampaignFixture();
    await fundCampaign();
    await crowdfunding.connect(beneficiary).createDisbursementRequest(0, REQUEST_AMOUNT, EVIDENCE_CID, EVIDENCE_HASH);

    await expect(crowdfunding.connect(stranger).rejectDisbursement(0, 1)).to.be.revertedWith(
      "Only campaign verifier can reject",
    );
    await expect(crowdfunding.connect(verifier).rejectDisbursement(0, 1))
      .to.emit(crowdfunding, "DisbursementRejected")
      .withArgs(0n, 1n, verifier.address);
    expect((await crowdfunding.getDisbursementRequest(0, 1)).status).to.equal(2n);
    expect(await crowdfunding.getActiveDisbursementRequestId(0)).to.equal(0n);

    await crowdfunding.connect(beneficiary).createDisbursementRequest(0, REQUEST_AMOUNT, EVIDENCE_CID, EVIDENCE_HASH);
    expect(await crowdfunding.getDisbursementRequestCount(0)).to.equal(2n);
  });

  it("TC-13: beneficiary có thể hủy request pending và tạo request mới", async function () {
    const { crowdfunding, beneficiary, stranger, fundCampaign } = await deployCampaignFixture();
    await fundCampaign();
    await crowdfunding.connect(beneficiary).createDisbursementRequest(0, REQUEST_AMOUNT, EVIDENCE_CID, EVIDENCE_HASH);

    await expect(crowdfunding.connect(stranger).cancelDisbursement(0, 1)).to.be.revertedWith(
      "Only beneficiary can cancel",
    );
    await expect(crowdfunding.connect(beneficiary).cancelDisbursement(0, 1))
      .to.emit(crowdfunding, "DisbursementCancelled")
      .withArgs(0n, 1n, beneficiary.address);
    expect((await crowdfunding.getDisbursementRequest(0, 1)).status).to.equal(4n);
    expect(await crowdfunding.getActiveDisbursementRequestId(0)).to.equal(0n);

    await crowdfunding.connect(beneficiary).createDisbursementRequest(0, REQUEST_AMOUNT, EVIDENCE_CID, EVIDENCE_HASH);
    expect(await crowdfunding.getDisbursementRequestCount(0)).to.equal(2n);
  });

  it("TC-14: không thể withdraw cùng request hai lần", async function () {
    const { crowdfunding, beneficiary, verifier, fundCampaign } = await deployCampaignFixture();
    await fundCampaign();
    await crowdfunding.connect(beneficiary).createDisbursementRequest(0, REQUEST_AMOUNT, EVIDENCE_CID, EVIDENCE_HASH);
    await crowdfunding.connect(verifier).approveDisbursement(0, 1);

    await crowdfunding.connect(beneficiary).withdraw(0, 1);
    await expect(crowdfunding.connect(beneficiary).withdraw(0, 1)).to.be.revertedWith("Request is not active");

    await expectAccountingInvariant(crowdfunding, 0);
  });

  it("TC-15: chặn reentrancy khi beneficiary nhận ETH", async function () {
    const [creator, verifier, donor] = await ethers.getSigners();
    const crowdfunding = await ethers.deployContract("Crowdfunding");
    const attacker = await ethers.deployContract("ReentrancyAttacker", [await crowdfunding.getAddress()]);
    const latestBlock = await ethers.provider.getBlock("latest");
    const deadline = BigInt(latestBlock!.timestamp + 3_600);
    const amount = ethers.parseEther("0.25");
    const cid = "ipfs://test-reentrancy";
    const hash = ethers.keccak256(ethers.toUtf8Bytes(cid));

    await crowdfunding
      .connect(creator)
      .createCampaign(await attacker.getAddress(), verifier.address, TARGET_AMOUNT, deadline, "reentrancy-test");
    await crowdfunding.connect(donor).donate(0, { value: ethers.parseEther("1") });
    await expectAccountingInvariant(crowdfunding, 0);
    await attacker.connect(creator).createRequest(0, amount, cid, hash);
    await crowdfunding.connect(verifier).approveDisbursement(0, 1);

    await attacker.connect(creator).attack(0, 1);

    expect(await attacker.reentryAttempted()).to.equal(true);
    expect(await attacker.reentryBlocked()).to.equal(true);
    expect(await attacker.reentrySucceeded()).to.equal(false);
    expect((await crowdfunding.getDisbursementRequest(0, 1)).status).to.equal(3n);
    expect((await crowdfunding.getCampaign(0)).totalWithdrawn).to.equal(amount);
    await expectAccountingInvariant(crowdfunding, 0);
  });

  it("TC-16: ETH transfer thất bại thì request vẫn Approved", async function () {
    const [creator, verifier, donor] = await ethers.getSigners();
    const crowdfunding = await ethers.deployContract("Crowdfunding");
    const rejectingBeneficiary = await ethers.deployContract("RejectingBeneficiary", [await crowdfunding.getAddress()]);
    const latestBlock = await ethers.provider.getBlock("latest");
    const deadline = BigInt(latestBlock!.timestamp + 3_600);
    const amount = ethers.parseEther("0.25");
    const cid = "ipfs://test-reject-eth";
    const hash = ethers.keccak256(ethers.toUtf8Bytes(cid));

    await crowdfunding
      .connect(creator)
      .createCampaign(await rejectingBeneficiary.getAddress(), verifier.address, TARGET_AMOUNT, deadline, "reject-eth-test");
    await crowdfunding.connect(donor).donate(0, { value: ethers.parseEther("1") });
    await expectAccountingInvariant(crowdfunding, 0);
    await rejectingBeneficiary.connect(creator).createRequest(0, amount, cid, hash);
    await crowdfunding.connect(verifier).approveDisbursement(0, 1);

    await expect(rejectingBeneficiary.connect(creator).withdraw(0, 1)).to.be.revertedWith("ETH transfer failed");

    expect((await crowdfunding.getDisbursementRequest(0, 1)).status).to.equal(1n);
    expect((await crowdfunding.getCampaign(0)).totalWithdrawn).to.equal(0n);
    expect(await crowdfunding.getActiveDisbursementRequestId(0)).to.equal(1n);
    await expectAccountingInvariant(crowdfunding, 0);
  });
});
