// scripts/grant-permissions.js
const { ethers } = require("hardhat");

async function main() {
  console.log("\n=== Phase 5: Grant Permissions ===\n");

  // ── CONFIG ──
  const vaultAddress = "0x4D182DD50468c6357333D6abA4CBE817E897DdDd";

  // 1) Get the Vault's Authorizer
  const IVault = [
    "function getAuthorizer() view returns (address)"
  ];
  const vault = await ethers.getContractAt(IVault, vaultAddress);
  const authorizer = await vault.getAuthorizer();
  console.log("Authorizer =", authorizer);

  // 2) Compute selectors
  const joinPool     = ethers.id("joinPool(bytes32,address,address,uint256[],bytes)").slice(0,10);
  const hookSig      = "joinPoolHook((address,address,uint256[],uint256,uint8,bool,bytes))";
  const joinPoolHook = ethers.keccak256(ethers.toUtf8Bytes(hookSig)).slice(0,10);

  console.log("Selector joinPool    =", joinPool);
  console.log("Selector joinPoolHook=", joinPoolHook);

  // 3) Grant perms
  const IAuthorizer = [
    "function grantPermissions(address,bytes4[]) external"
  ];
  const auth = await ethers.getContractAt(IAuthorizer, authorizer);

  console.log("🚀 Granting joinPool…");
  await (await auth.grantPermissions(vaultAddress, [joinPool])).wait();
  console.log("🚀 Granting joinPoolHook…");
  await (await auth.grantPermissions(vaultAddress, [joinPoolHook])).wait();

  console.log("\n✅ Phase 5 Complete.");
  console.log("  Next: run scripts/bootstrap-pool.js\n");
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ grant-permissions.js error:", err);
    process.exit(1);
  });
