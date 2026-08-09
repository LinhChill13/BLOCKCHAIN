import { network } from "hardhat";

const { ethers } = await network.create();

const crowdfunding = await ethers.deployContract("Crowdfunding");

console.log("Crowdfunding deployed to:", await crowdfunding.getAddress());
