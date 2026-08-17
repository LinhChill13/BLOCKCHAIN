// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICrowdfundingForTest {
    function createDisbursementRequest(
        uint256 campaignId,
        uint256 amount,
        string calldata evidenceCid,
        bytes32 evidenceHash
    ) external returns (uint256);

    function withdraw(uint256 campaignId, uint256 requestId) external;
}

abstract contract ControlledBeneficiary {
    ICrowdfundingForTest internal immutable crowdfunding;
    address public immutable owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address crowdfundingAddress) {
        crowdfunding = ICrowdfundingForTest(crowdfundingAddress);
        owner = msg.sender;
    }

    function createRequest(
        uint256 campaignId,
        uint256 amount,
        string calldata evidenceCid,
        bytes32 evidenceHash
    ) external onlyOwner {
        crowdfunding.createDisbursementRequest(campaignId, amount, evidenceCid, evidenceHash);
    }
}

contract ReentrancyAttacker is ControlledBeneficiary {
    uint256 private attackingCampaignId;
    uint256 private attackingRequestId;

    bool public reentryAttempted;
    bool public reentryBlocked;
    bool public reentrySucceeded;

    constructor(address crowdfundingAddress) ControlledBeneficiary(crowdfundingAddress) {}

    function attack(uint256 campaignId, uint256 requestId) external onlyOwner {
        attackingCampaignId = campaignId;
        attackingRequestId = requestId;
        crowdfunding.withdraw(campaignId, requestId);
    }

    receive() external payable {
        reentryAttempted = true;

        try crowdfunding.withdraw(attackingCampaignId, attackingRequestId) {
            reentrySucceeded = true;
        } catch {
            reentryBlocked = true;
        }
    }
}

contract RejectingBeneficiary is ControlledBeneficiary {
    constructor(address crowdfundingAddress) ControlledBeneficiary(crowdfundingAddress) {}

    function withdraw(uint256 campaignId, uint256 requestId) external onlyOwner {
        crowdfunding.withdraw(campaignId, requestId);
    }

    receive() external payable {
        revert("Reject ETH");
    }
}
