// scripts/unpause-vault.js
const { ethers } = require("hardhat");

async function main() {
  console.log("\n=== Phase 4: Unpause Vault ===\n");

  // ── CONFIG ──
  const vaultAddress = "0x4D182DD50468c6357333D6abA4CBE817E897DdDd";

  // 1) Grab the Authorizer from the Vault
  const IVault = [
    "function getAuthorizer() view returns (address)"
  ];
  const vault = await ethers.getContractAt(IVault, vaultAddress);
  const authorizer = await vault.getAuthorizer();
  console.log("Authorizer =", authorizer);

  // 2) Call setPaused(vault, false)
  const IAuthorizer = [
    "function setPaused(address,bool) external"
  ];
  const auth = await ethers.getContractAt(IAuthorizer, authorizer);
  console.log(`🚀 Unpausing Vault (${vaultAddress})…`);
  const tx = await auth.setPaused(vaultAddress, false);
  await tx.wait();
  console.log("✅ Vault unpaused");

  console.log("\n✔ Phase 4 Complete.");
  console.log("  Next: run scripts/grant-permissions.js\n");
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ unpause-vault.js error:", err);
    process.exit(1);
  });
