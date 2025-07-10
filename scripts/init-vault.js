// scripts/init-vault.js
const { ethers } = require("hardhat");

async function main() {
  // ◀▼ YOUR DEPLOYED CONTRACT ADDRESSES ▼▶
  const vaultAddr               = "0x67709C7Ee06912611976Ab527c9041BCee7aB0F7";
  const vaultAdminAddr          = "0xb6907a3eF67540A774eE2Dd1f53Ca08FDE11A8e2";
  const vaultExtensionAddr      = "0x8f7D25447f49eD46C05fe1591416fe0C13307572";
  const protocolFeeControllerAddr = "0xcc16EA5230c1483DF78bdA0Dd4Ce55eeFF8a8106";

  // Minimal ABI for the initialize function
  const vaultAbi = [
    "function initialize(address vaultAdmin, address vaultExtension, address protocolFeeController) external"
  ];

  const [signer] = await ethers.getSigners();
  console.log("👤 Initializing Vault as:", signer.address);

  const vault = new ethers.Contract(vaultAddr, vaultAbi, signer);
  const tx = await vault.initialize(
    vaultAdminAddr,
    vaultExtensionAddr,
    protocolFeeControllerAddr
  );
  console.log("   tx hash:", tx.hash);
  await tx.wait();

  console.log("✅ Vault is now initialized and un‐paused");
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ init-vault error:", err);
    process.exit(1);
  });
