import { network } from "hardhat";

export const { ethers } = await network.create();

export function requiredAddress() {
  const address = process.env.CROWDFUNDING_ADDRESS;

  if (address === undefined || !ethers.isAddress(address)) {
    throw new Error("Set CROWDFUNDING_ADDRESS to a valid deployed Crowdfunding contract address.");
  }

  return address;
}

export async function getSigner(defaultIndex: number) {
  const accountIndex = Number(process.env.ACCOUNT_INDEX ?? defaultIndex);
  const signers = await ethers.getSigners();

  if (!Number.isInteger(accountIndex) || accountIndex < 0 || accountIndex >= signers.length) {
    throw new Error(`ACCOUNT_INDEX must be between 0 and ${signers.length - 1}.`);
  }

  return signers[accountIndex];
}

export function bigintEnv(name: string, defaultValue: bigint) {
  const value = process.env[name];

  try {
    return value === undefined ? defaultValue : BigInt(value);
  } catch {
    throw new Error(`${name} must be a whole number.`);
  }
}
