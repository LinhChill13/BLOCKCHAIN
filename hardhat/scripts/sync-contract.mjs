import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const source = resolve(scriptDirectory, "../../SMARTCONTRACT/Smartcontract.sol");
const destination = resolve(scriptDirectory, "../contracts/Crowdfunding.sol");

await mkdir(dirname(destination), { recursive: true });
await copyFile(source, destination);

console.log("Synced SMARTCONTRACT/Smartcontract.sol to hardhat/contracts/Crowdfunding.sol");
