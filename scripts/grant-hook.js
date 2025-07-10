// scripts/grant-hook.js
const { ethers } = require("hardhat");

async function main() {
  const vaultAddr = "0x67709C7Ee06912611976Ab527c9041BCee7aB0F7";

  // 1) Fetch the Authorizer from the Vault
  const IVault = [
    "function getAuthorizer() view returns (address)"
  ];
  const vault = await ethers.getContractAt(IVault, vaultAddr);
  const authorizer = await vault.getAuthorizer();
  console.log("🔑 Authorizer:", authorizer);

  // 2) Compute the joinPoolHook selector
  const hookSig = "joinPoolHook((address,address,uint256[],uint256,uint8,bool,bytes))";
  const hookSelector = ethers
    .keccak256(ethers.toUtf8Bytes(hookSig))
    .substring(0, 10);
  console.log("🔍 joinPoolHook selector:", hookSelector);

  // 3) Grant that selector on the Authorizer
  const IAuthorizer = [
    "function grantPermissions(address where, bytes4[] selectors) external"
  ];
  const [signer] = await ethers.getSigners();
  console.log("👤 Granting joinPoolHook as:", signer.address);

  const auth = await ethers.getContractAt(IAuthorizer, authorizer, signer);
  const tx = await auth.grantPermissions(vaultAddr, [hookSelector]);
  console.log("   tx hash:", tx.hash);
  await tx.wait();

  console.log("✅ joinPoolHook granted; Router can now initialize pools");
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ grant-hook error:", err);
    process.exit(1);
  });
