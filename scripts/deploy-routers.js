// scripts/deploy-routers.js
const { ethers } = require("hardhat");

async function main() {
  console.log("\n=== Phase 2: Routers ===\n");

  // ── CONFIG ──
  const vaultAddress = "0x4D182DD50468c6357333D6abA4CBE817E897DdDd";
  const WETH          = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
  const PERMIT2       = ethers.constants.AddressZero;
  const routerVersion = "1.0.0";
  const batchVersion  = "1.0.0";

  console.log("Router constructor args:");
  console.log("  vaultAddress =", vaultAddress);
  console.log("  WETH         =", WETH);
  console.log("  PERMIT2      =", PERMIT2);
  console.log("  routerVersion=", routerVersion);

  // ── 1. Deploy Router ──
  console.log("\n🚀 Deploying Router…");
  const Router = await ethers.getContractFactory("Router");
  const router = await Router.deploy(
    vaultAddress,
    WETH,
    PERMIT2,
    routerVersion
  );
  await router.deployed();
  console.log("✅ Router deployed to", router.address);

  // ── 2. Deploy BatchRouter ──
  console.log("\n🚀 Deploying BatchRouter…");
  const BatchRouter = await ethers.getContractFactory("BatchRouter");
  const batchRouter = await BatchRouter.deploy(
    vaultAddress,
    router.address,
    WETH,
    batchVersion
  );
  await batchRouter.deployed();
  console.log("✅ BatchRouter deployed to", batchRouter.address);

  console.log("\n✔ Phase 2 Complete.");
  console.log("  Next: run scripts/deploy-factories.js\n");
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ deploy-routers.js error:", err);
    process.exit(1);
  });
