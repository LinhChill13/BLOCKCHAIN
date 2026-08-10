import { network } from "hardhat";

const { ethers } = await network.create();
const [deployer] = await ethers.getSigners();
const crowdfunding = await ethers.deployContract("Crowdfunding");

console.log("Crowdfunding deployed to:", await crowdfunding.getAddress());
console.log("Deployer / organization:", deployer.address);
