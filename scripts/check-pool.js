// scripts/check-pool.js
const { ethers } = require("hardhat");

async function main() {
  const vaultAddress = "0x67709C7Ee06912611976Ab527c9041BCee7aB0F7";
  const poolAddress  = "0x7e19d5b14c7242f4d01e08236b5d378d380e43c7";

  const IVault = [
    "function isPoolRegistered(address) view returns (bool)",
    "function isPoolInitialized(address) view returns (bool)"
  ];
  const vault = await ethers.getContractAt(IVault, vaultAddress);

  console.log("Pool registered?   ", await vault.isPoolRegistered(poolAddress));
  console.log("Pool initialized?  ", await vault.isPoolInitialized(poolAddress));
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
