// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Crowdfunding - transparent, verifier-approved charity disbursements
/// @notice The contract holds donations. A beneficiary must publish an amount and
/// evidence hash, receive the campaign verifier's approval, then withdraw that exact amount.
contract Crowdfunding {
    enum CampaignStatus {
        Active,
        Closed
    }

    enum DisbursementStatus {
        Pending,
        Approved,
        Rejected,
        Withdrawn,
        Cancelled
    }

    struct Campaign {
        uint256 id;
        address creator;
        address payable beneficiary;
        address verifier;
        uint256 targetAmount;
        uint256 deadline;
        uint256 totalRaised;
        uint256 totalWithdrawn;
        CampaignStatus status;
        string metadataId;
    }

    struct DisbursementRequest {
        uint256 amount;
        string evidenceCid;
        bytes32 evidenceHash;
        DisbursementStatus status;
    }

    uint256 private campaignCount;
    uint256 private reentrancyLock = 1;

    mapping(uint256 campaignId => Campaign campaign) private campaigns;
    mapping(uint256 campaignId => mapping(address donor => uint256 amount)) private donations;
    mapping(uint256 campaignId => uint256 requestCount) private disbursementRequestCounts;
    mapping(uint256 campaignId => uint256 requestId) private activeDisbursementRequestIds;
    mapping(uint256 campaignId => mapping(uint256 requestId => DisbursementRequest request))
        private disbursementRequests;

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        address indexed beneficiary,
        address verifier,
        uint256 targetAmount,
        uint256 deadline,
        string metadataId
    );
    event DonationReceived(uint256 indexed campaignId, address indexed donor, uint256 amount);
    event CampaignClosed(uint256 indexed campaignId, address indexed closedBy);
    event DisbursementRequested(
        uint256 indexed campaignId,
        uint256 indexed requestId,
        address indexed beneficiary,
        uint256 amount,
        string evidenceCid,
        bytes32 evidenceHash
    );
    event DisbursementApproved(
        uint256 indexed campaignId,
        uint256 indexed requestId,
        address indexed verifier
    );
    event DisbursementRejected(
        uint256 indexed campaignId,
        uint256 indexed requestId,
        address indexed verifier
    );
    event DisbursementCancelled(
        uint256 indexed campaignId,
        uint256 indexed requestId,
        address indexed beneficiary
    );
    event FundsWithdrawn(
        uint256 indexed campaignId,
        uint256 indexed requestId,
        address indexed beneficiary,
        uint256 amount
    );

    modifier campaignExists(uint256 campaignId) {
        require(campaignId < campaignCount, "Campaign does not exist");
        _;
    }

    modifier nonReentrant() {
        require(reentrancyLock == 1, "Reentrant call");
        reentrancyLock = 2;
        _;
        reentrancyLock = 1;
    }

    /// @notice Creates a campaign. `deadline` is a Unix timestamp in seconds.
    function createCampaign(
        address payable beneficiary,
        address verifier,
        uint256 targetAmount,
        uint256 deadline,
        string calldata metadataId
    ) external returns (uint256 campaignId) {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(verifier != address(0), "Invalid verifier");
        require(
            verifier != beneficiary && verifier != msg.sender,
            "Verifier must be independent"
        );
        require(targetAmount > 0, "Target must be greater than zero");
        require(deadline > block.timestamp, "Deadline must be in the future");

        campaignId = campaignCount++;
        campaigns[campaignId] = Campaign({
            id: campaignId,
            creator: msg.sender,
            beneficiary: beneficiary,
            verifier: verifier,
            targetAmount: targetAmount,
            deadline: deadline,
            totalRaised: 0,
            totalWithdrawn: 0,
            status: CampaignStatus.Active,
            metadataId: metadataId
        });

        emit CampaignCreated(
            campaignId,
            msg.sender,
            beneficiary,
            verifier,
            targetAmount,
            deadline,
            metadataId
        );
    }

    /// @notice Donates ETH to an active campaign before its deadline.
    function donate(uint256 campaignId) external payable campaignExists(campaignId) {
        Campaign storage campaign = campaigns[campaignId];
        require(campaign.status == CampaignStatus.Active, "Campaign is closed");
        require(block.timestamp <= campaign.deadline, "Campaign deadline passed");
        require(msg.value > 0, "Donation must be greater than zero");

        campaign.totalRaised += msg.value;
        donations[campaignId][msg.sender] += msg.value;

        emit DonationReceived(campaignId, msg.sender, msg.value);
    }

    /// @notice Permanently closes a campaign. Only its creator can close it early.
    function closeCampaign(uint256 campaignId) external campaignExists(campaignId) {
        Campaign storage campaign = campaigns[campaignId];
        require(msg.sender == campaign.creator, "Only creator can close campaign");
        require(campaign.status == CampaignStatus.Active, "Campaign already closed");

        campaign.status = CampaignStatus.Closed;
        emit CampaignClosed(campaignId, msg.sender);
    }

    /// @notice Beneficiary requests a specific disbursement and commits its evidence hash.
    /// @dev Only one request may be awaiting approval or withdrawal per campaign.
    function createDisbursementRequest(
        uint256 campaignId,
        uint256 amount,
        string calldata evidenceCid,
        bytes32 evidenceHash
    ) external campaignExists(campaignId) returns (uint256 requestId) {
        Campaign storage campaign = campaigns[campaignId];
        require(msg.sender == campaign.beneficiary, "Only beneficiary can request");
        require(amount > 0, "Amount must be greater than zero");
        require(bytes(evidenceCid).length > 0, "Evidence CID is required");
        require(evidenceHash != bytes32(0), "Evidence hash is required");
        require(evidenceHash == keccak256(bytes(evidenceCid)), "Evidence hash mismatch");
        require(activeDisbursementRequestIds[campaignId] == 0, "Active request exists");
        require(amount <= campaign.totalRaised - campaign.totalWithdrawn, "Amount exceeds available funds");

        requestId = ++disbursementRequestCounts[campaignId];
        activeDisbursementRequestIds[campaignId] = requestId;
        disbursementRequests[campaignId][requestId] = DisbursementRequest({
            amount: amount,
            evidenceCid: evidenceCid,
            evidenceHash: evidenceHash,
            status: DisbursementStatus.Pending
        });

        emit DisbursementRequested(
            campaignId,
            requestId,
            campaign.beneficiary,
            amount,
            evidenceCid,
            evidenceHash
        );
    }

    /// @notice The campaign's verifier approves a beneficiary's published request.
    function approveDisbursement(uint256 campaignId, uint256 requestId)
        external
        campaignExists(campaignId)
    {
        require(msg.sender == campaigns[campaignId].verifier, "Only campaign verifier can approve");
        require(activeDisbursementRequestIds[campaignId] == requestId, "Request is not active");

        DisbursementRequest storage request = disbursementRequests[campaignId][requestId];
        require(request.status == DisbursementStatus.Pending, "Request is not pending");
        request.status = DisbursementStatus.Approved;

        emit DisbursementApproved(campaignId, requestId, msg.sender);
    }

    /// @notice The campaign verifier rejects a pending request and releases the campaign.
    function rejectDisbursement(uint256 campaignId, uint256 requestId)
        external
        campaignExists(campaignId)
    {
        require(msg.sender == campaigns[campaignId].verifier, "Only campaign verifier can reject");
        require(activeDisbursementRequestIds[campaignId] == requestId, "Request is not active");

        DisbursementRequest storage request = disbursementRequests[campaignId][requestId];
        require(request.status == DisbursementStatus.Pending, "Request is not pending");
        request.status = DisbursementStatus.Rejected;
        activeDisbursementRequestIds[campaignId] = 0;

        emit DisbursementRejected(campaignId, requestId, msg.sender);
    }

    /// @notice Beneficiary cancels its own pending request and may submit a corrected one.
    function cancelDisbursement(uint256 campaignId, uint256 requestId)
        external
        campaignExists(campaignId)
    {
        Campaign storage campaign = campaigns[campaignId];
        require(msg.sender == campaign.beneficiary, "Only beneficiary can cancel");
        require(activeDisbursementRequestIds[campaignId] == requestId, "Request is not active");

        DisbursementRequest storage request = disbursementRequests[campaignId][requestId];
        require(request.status == DisbursementStatus.Pending, "Request is not pending");
        request.status = DisbursementStatus.Cancelled;
        activeDisbursementRequestIds[campaignId] = 0;

        emit DisbursementCancelled(campaignId, requestId, msg.sender);
    }

    /// @notice Transfers only the exact amount in a verifier-approved request.
    function withdraw(uint256 campaignId, uint256 requestId)
        external
        campaignExists(campaignId)
        nonReentrant
    {
        Campaign storage campaign = campaigns[campaignId];
        require(msg.sender == campaign.beneficiary, "Only beneficiary can withdraw");
        require(activeDisbursementRequestIds[campaignId] == requestId, "Request is not active");

        DisbursementRequest storage request = disbursementRequests[campaignId][requestId];
        require(request.status == DisbursementStatus.Approved, "Request is not approved");

        // Effects precede the external ETH transfer to prevent reentrancy.
        request.status = DisbursementStatus.Withdrawn;
        activeDisbursementRequestIds[campaignId] = 0;
        campaign.totalWithdrawn += request.amount;

        (bool sent, ) = campaign.beneficiary.call{value: request.amount}("");
        require(sent, "ETH transfer failed");

        emit FundsWithdrawn(campaignId, requestId, campaign.beneficiary, request.amount);
    }

    function getCampaign(uint256 campaignId)
        external
        view
        campaignExists(campaignId)
        returns (Campaign memory)
    {
        return campaigns[campaignId];
    }

    function getCampaignCount() external view returns (uint256) {
        return campaignCount;
    }

    function getDonation(uint256 campaignId, address donor)
        external
        view
        campaignExists(campaignId)
        returns (uint256)
    {
        return donations[campaignId][donor];
    }

    function getDisbursementRequestCount(uint256 campaignId)
        external
        view
        campaignExists(campaignId)
        returns (uint256)
    {
        return disbursementRequestCounts[campaignId];
    }

    function getActiveDisbursementRequestId(uint256 campaignId)
        external
        view
        campaignExists(campaignId)
        returns (uint256)
    {
        return activeDisbursementRequestIds[campaignId];
    }

    function getDisbursementRequest(uint256 campaignId, uint256 requestId)
        external
        view
        campaignExists(campaignId)
        returns (DisbursementRequest memory)
    {
        require(requestId > 0 && requestId <= disbursementRequestCounts[campaignId], "Request does not exist");
        return disbursementRequests[campaignId][requestId];
    }
}
