// scripts/register-pool.js
const { ethers } = require("hardhat");

async function main() {
  const vaultAdminAddress = "0xb6907a3eF67540A774eE2Dd1f53Ca08FDE11A8e2";
  const poolAddress        = "0x7e19d5b14c7242f4d01e08236b5d378d380e43c7";

  const IVaultAdmin = [
    "function registerPool(address) external"
  ];
  const [signer] = await ethers.getSigners();
  const admin = await ethers.getContractAt(IVaultAdmin, vaultAdminAddress, signer);

  const tx = await admin.registerPool(poolAddress);
  console.log("registerPool tx:", tx.hash);
  await tx.wait();
  console.log("✅ Pool registered");
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
