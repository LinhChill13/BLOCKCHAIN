import { isAddress, zeroAddress, type Address, type Hex } from "viem";

const configuredAddress = process.env.NEXT_PUBLIC_CROWDFUNDING_ADDRESS;

export const crowdfundingAddress = (configuredAddress && isAddress(configuredAddress)
  ? configuredAddress
  : zeroAddress) as Address;
export const isContractConfigured = Boolean(configuredAddress && isAddress(configuredAddress));

export const crowdfundingAbi = [
  {
    type: "function", name: "createCampaign", stateMutability: "nonpayable",
    inputs: [
      { name: "beneficiary", type: "address" }, { name: "verifier", type: "address" }, { name: "targetAmount", type: "uint256" },
      { name: "deadline", type: "uint256" }, { name: "metadataId", type: "string" }
    ], outputs: [{ name: "campaignId", type: "uint256" }]
  },
  { type: "function", name: "donate", stateMutability: "payable", inputs: [{ name: "campaignId", type: "uint256" }], outputs: [] },
  { type: "function", name: "closeCampaign", stateMutability: "nonpayable", inputs: [{ name: "campaignId", type: "uint256" }], outputs: [] },
  {
    type: "function", name: "createDisbursementRequest", stateMutability: "nonpayable",
    inputs: [
      { name: "campaignId", type: "uint256" }, { name: "amount", type: "uint256" },
      { name: "evidenceCid", type: "string" }, { name: "evidenceHash", type: "bytes32" }
    ], outputs: [{ name: "requestId", type: "uint256" }]
  },
  {
    type: "function", name: "approveDisbursement", stateMutability: "nonpayable",
    inputs: [{ name: "campaignId", type: "uint256" }, { name: "requestId", type: "uint256" }], outputs: []
  },
  {
    type: "function", name: "rejectDisbursement", stateMutability: "nonpayable",
    inputs: [{ name: "campaignId", type: "uint256" }, { name: "requestId", type: "uint256" }], outputs: []
  },
  {
    type: "function", name: "cancelDisbursement", stateMutability: "nonpayable",
    inputs: [{ name: "campaignId", type: "uint256" }, { name: "requestId", type: "uint256" }], outputs: []
  },
  {
    type: "function", name: "withdraw", stateMutability: "nonpayable",
    inputs: [{ name: "campaignId", type: "uint256" }, { name: "requestId", type: "uint256" }], outputs: []
  },
  { type: "function", name: "getCampaignCount", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  {
    type: "function", name: "getCampaign", stateMutability: "view", inputs: [{ name: "campaignId", type: "uint256" }],
    outputs: [{ name: "", type: "tuple", components: [
      { name: "id", type: "uint256" }, { name: "creator", type: "address" }, { name: "beneficiary", type: "address" }, { name: "verifier", type: "address" },
      { name: "targetAmount", type: "uint256" }, { name: "deadline", type: "uint256" },
      { name: "totalRaised", type: "uint256" }, { name: "totalWithdrawn", type: "uint256" },
      { name: "status", type: "uint8" }, { name: "metadataId", type: "string" }
    ] }]
  },
  {
    type: "function", name: "getDonation", stateMutability: "view",
    inputs: [{ name: "campaignId", type: "uint256" }, { name: "donor", type: "address" }], outputs: [{ name: "", type: "uint256" }]
  },
  { type: "function", name: "getDisbursementRequestCount", stateMutability: "view", inputs: [{ name: "campaignId", type: "uint256" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "getActiveDisbursementRequestId", stateMutability: "view", inputs: [{ name: "campaignId", type: "uint256" }], outputs: [{ name: "", type: "uint256" }] },
  {
    type: "function", name: "getDisbursementRequest", stateMutability: "view",
    inputs: [{ name: "campaignId", type: "uint256" }, { name: "requestId", type: "uint256" }],
    outputs: [{ name: "", type: "tuple", components: [
      { name: "amount", type: "uint256" }, { name: "evidenceCid", type: "string" }, { name: "evidenceHash", type: "bytes32" }, { name: "status", type: "uint8" }
    ] }]
  },
  {
    type: "event", name: "DisbursementRequested", inputs: [
      { indexed: true, name: "campaignId", type: "uint256" }, { indexed: true, name: "requestId", type: "uint256" },
      { indexed: true, name: "beneficiary", type: "address" }, { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "evidenceCid", type: "string" }, { indexed: false, name: "evidenceHash", type: "bytes32" }
    ]
  },
  {
    type: "event", name: "DisbursementApproved", inputs: [
      { indexed: true, name: "campaignId", type: "uint256" }, { indexed: true, name: "requestId", type: "uint256" },
      { indexed: true, name: "verifier", type: "address" }
    ]
  },
  {
    type: "event", name: "DisbursementRejected", inputs: [
      { indexed: true, name: "campaignId", type: "uint256" }, { indexed: true, name: "requestId", type: "uint256" },
      { indexed: true, name: "verifier", type: "address" }
    ]
  },
  {
    type: "event", name: "DisbursementCancelled", inputs: [
      { indexed: true, name: "campaignId", type: "uint256" }, { indexed: true, name: "requestId", type: "uint256" },
      { indexed: true, name: "beneficiary", type: "address" }
    ]
  },
  {
    type: "event", name: "FundsWithdrawn", inputs: [
      { indexed: true, name: "campaignId", type: "uint256" }, { indexed: true, name: "requestId", type: "uint256" },
      { indexed: true, name: "beneficiary", type: "address" }, { indexed: false, name: "amount", type: "uint256" }
    ]
  }
] as const;

export type Campaign = {
  id: bigint;
  creator: Address;
  beneficiary: Address;
  verifier: Address;
  targetAmount: bigint;
  deadline: bigint;
  totalRaised: bigint;
  totalWithdrawn: bigint;
  status: number;
  metadataId: string;
};

export type DisbursementRequest = {
  amount: bigint;
  evidenceCid: string;
  evidenceHash: Hex;
  status: number;
};
