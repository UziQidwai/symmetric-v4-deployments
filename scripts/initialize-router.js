const hre = require("hardhat");

async function main() {
  const routerAddress = "0xCBD8E7e94C143007A2900290c188a02efE4f0593";
  const vault = "0x67709C7Ee06912611976Ab527c9041BCee7aB0F7";
  const weth = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
  const permit2 = "0x0000000000000000000000000000000000000000";

  const [signer] = await hre.ethers.getSigners();
  console.log("Signer:", signer.address);

  const router = new hre.ethers.Contract(
    routerAddress,
    [
      "function getVault() view returns (address)",
      "function getWeth() view returns (address)",
      "function getPermit2() view returns (address)",
      "function initialize(address vault, address weth, address permit2) external"
    ],
    signer
  );

  console.log("Before init:");
  console.log("Vault:", await router.getVault());
  console.log("WETH:", await router.getWeth());
  console.log("Permit2:", await router.getPermit2());

  console.log("\nAttempting initialize...");
  try {
    const tx = await router.initialize(vault, weth, permit2);
    console.log("✅ Sent tx:", tx.hash);
    await tx.wait();
    console.log("✅ Router initialized!");
  } catch (err) {
    console.error("❌ Initialize reverted:", err.error?.message || err.message);
  }

  console.log("\nAfter init:");
  console.log("Vault:", await router.getVault());
  console.log("WETH:", await router.getWeth());
  console.log("Permit2:", await router.getPermit2());
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
