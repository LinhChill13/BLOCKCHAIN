import { isAddress, zeroAddress, type Address } from "viem";

const configuredAddress = process.env.NEXT_PUBLIC_CROWDFUNDING_ADDRESS;

export const crowdfundingAddress = (configuredAddress && isAddress(configuredAddress)
  ? configuredAddress
  : zeroAddress) as Address;
export const isContractConfigured = Boolean(configuredAddress && isAddress(configuredAddress));

export const crowdfundingAbi = [
  {
    type: "function",
    name: "createCampaign",
    stateMutability: "nonpayable",
    inputs: [
      { name: "beneficiary", type: "address" },
      { name: "targetAmount", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "metadataId", type: "string" }
    ],
    outputs: [{ name: "campaignId", type: "uint256" }]
  },
  {
    type: "function",
    name: "donate",
    stateMutability: "payable",
    inputs: [{ name: "campaignId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "closeCampaign",
    stateMutability: "nonpayable",
    inputs: [{ name: "campaignId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [{ name: "campaignId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "getCampaignCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "getCampaign",
    stateMutability: "view",
    inputs: [{ name: "campaignId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "creator", type: "address" },
          { name: "beneficiary", type: "address" },
          { name: "targetAmount", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "totalRaised", type: "uint256" },
          { name: "withdrawn", type: "bool" },
          { name: "status", type: "uint8" },
          { name: "metadataId", type: "string" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "getDonation",
    stateMutability: "view",
    inputs: [
      { name: "campaignId", type: "uint256" },
      { name: "donor", type: "address" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "event",
    name: "CampaignCreated",
    inputs: [
      { indexed: true, name: "campaignId", type: "uint256" },
      { indexed: true, name: "creator", type: "address" },
      { indexed: true, name: "beneficiary", type: "address" },
      { indexed: false, name: "targetAmount", type: "uint256" },
      { indexed: false, name: "deadline", type: "uint256" },
      { indexed: false, name: "metadataId", type: "string" }
    ]
  },
  {
    type: "event",
    name: "DonationReceived",
    inputs: [
      { indexed: true, name: "campaignId", type: "uint256" },
      { indexed: true, name: "donor", type: "address" },
      { indexed: false, name: "amount", type: "uint256" }
    ]
  },
  {
    type: "event",
    name: "CampaignClosed",
    inputs: [
      { indexed: true, name: "campaignId", type: "uint256" },
      { indexed: true, name: "closedBy", type: "address" }
    ]
  },
  {
    type: "event",
    name: "FundsWithdrawn",
    inputs: [
      { indexed: true, name: "campaignId", type: "uint256" },
      { indexed: true, name: "beneficiary", type: "address" },
      { indexed: false, name: "amount", type: "uint256" }
    ]
  }
] as const;

export type Campaign = {
  id: bigint;
  creator: Address;
  beneficiary: Address;
  targetAmount: bigint;
  deadline: bigint;
  totalRaised: bigint;
  withdrawn: boolean;
  status: number;
  metadataId: string;
};
