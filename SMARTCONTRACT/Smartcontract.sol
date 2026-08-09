// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Crowdfunding - a single-contract crowdfunding MVP
/// @notice Stores on-chain financial data; `metadataId` links a campaign to its
///         off-chain record in Supabase.
contract Crowdfunding {
    enum CampaignStatus {
        Active,
        Closed
    }

    struct Campaign {
        uint256 id;
        address creator;
        address payable beneficiary;
        uint256 targetAmount;
        uint256 deadline;
        uint256 totalRaised;
        bool withdrawn;
        CampaignStatus status;
        string metadataId;
    }

    uint256 private campaignCount;
    uint256 private reentrancyLock = 1;

    mapping(uint256 campaignId => Campaign campaign) private campaigns;
    mapping(uint256 campaignId => mapping(address donor => uint256 amount)) private donations;

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        address indexed beneficiary,
        uint256 targetAmount,
        uint256 deadline,
        string metadataId
    );
    event DonationReceived(uint256 indexed campaignId, address indexed donor, uint256 amount);
    event CampaignClosed(uint256 indexed campaignId, address indexed closedBy);
    event FundsWithdrawn(uint256 indexed campaignId, address indexed beneficiary, uint256 amount);

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
        uint256 targetAmount,
        uint256 deadline,
        string calldata metadataId
    ) external returns (uint256 campaignId) {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(targetAmount > 0, "Target must be greater than zero");
        require(deadline > block.timestamp, "Deadline must be in the future");

        campaignId = campaignCount++;
        campaigns[campaignId] = Campaign({
            id: campaignId,
            creator: msg.sender,
            beneficiary: beneficiary,
            targetAmount: targetAmount,
            deadline: deadline,
            totalRaised: 0,
            withdrawn: false,
            status: CampaignStatus.Active,
            metadataId: metadataId
        });

        emit CampaignCreated(
            campaignId,
            msg.sender,
            beneficiary,
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

    /// @notice Sends all collected ETH to the beneficiary exactly once.
    /// @dev The campaign must have ended or have been closed by its creator.
    function withdraw(uint256 campaignId)
        external
        campaignExists(campaignId)
        nonReentrant
    {
        Campaign storage campaign = campaigns[campaignId];
        require(msg.sender == campaign.beneficiary, "Only beneficiary can withdraw");
        require(!campaign.withdrawn, "Funds already withdrawn");
        require(campaign.totalRaised > 0, "No funds to withdraw");
        require(
            campaign.status == CampaignStatus.Closed || block.timestamp > campaign.deadline,
            "Campaign is still active"
        );

        // Effects precede the external ETH transfer to prevent reentrancy.
        campaign.withdrawn = true;
        if (campaign.status == CampaignStatus.Active) {
            campaign.status = CampaignStatus.Closed;
            emit CampaignClosed(campaignId, msg.sender);
        }

        uint256 amount = campaign.totalRaised;
        (bool sent, ) = campaign.beneficiary.call{value: amount}("");
        require(sent, "ETH transfer failed");

        emit FundsWithdrawn(campaignId, campaign.beneficiary, amount);
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
}
