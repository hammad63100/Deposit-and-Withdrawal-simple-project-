const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const Karnawallet = await hre.ethers.getContractFactory("Karnawallet");
  const wallet = await Karnawallet.deploy();

  await wallet.waitForDeployment();
  const address = await wallet.getAddress();

  console.log(`Karnawallet deployed to: ${address}`);

  // Write address to frontend config
  const configPath = path.join(__dirname, "../frontend/config.js");
  const configContent = `const CONFIG = {\n  CONTRACT_ADDRESS: "${address}",\n  NETWORK_ID: 31337\n};`;
  
  fs.writeFileSync(configPath, configContent);
  console.log("Frontend config updated at frontend/config.js");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
