"use client";

import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { crowdfundingAbi, crowdfundingAddress, isContractConfigured, type Campaign } from "@/lib/contract";

export function useCampaigns() {
  const countQuery = useReadContract({
    address: crowdfundingAddress,
    abi: crowdfundingAbi,
    functionName: "getCampaignCount",
    query: { enabled: isContractConfigured }
  });
  const count = Number(countQuery.data ?? BigInt(0));
  const contracts = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => ({
        address: crowdfundingAddress,
        abi: crowdfundingAbi,
        functionName: "getCampaign" as const,
        args: [BigInt(index)] as const
      })),
    [count],
  );
  const campaignsQuery = useReadContracts({
    contracts,
    query: { enabled: isContractConfigured && contracts.length > 0 }
  });
  const campaigns = (campaignsQuery.data ?? []).flatMap((result) =>
    result.status === "success" && result.result
      ? [result.result as unknown as Campaign]
      : [],
  );

  return {
    campaigns,
    count,
    isLoading: countQuery.isLoading || campaignsQuery.isLoading,
    error: countQuery.error ?? campaignsQuery.error
  };
}
