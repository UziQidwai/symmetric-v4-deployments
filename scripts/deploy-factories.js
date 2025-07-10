// scripts/deploy-factories.js
const { ethers } = require("hardhat");

async function main() {
  console.log("\n=== Phase 3: Pool Factories ===\n");

  // ── CONFIG ──
  const vaultAddress = "0x4D182DD50468c6357333D6abA4CBE817E897DdDd";
  const pauseWindow  = 7_776_000;
  const factoryVersion = "1.0.0";
  const poolVersion    = "1.0.0";

  const factories = [
    "WeightedPoolFactory",
    "StablePoolFactory",
    "ReClammPoolFactory",
    "Gyro2CLPPoolFactory",
    "GyroECLPPoolFactory",
    "LBPoolFactory",
    "QuantAMMWeightedPoolFactory",
    "StablePoolV2Factory"
  ];

  for (const name of factories) {
    console.log(`\n🚀 Deploying ${name}…`);
    console.log("  args:", {
      vaultAddress,
      pauseWindow,
      factoryVersion,
      poolVersion
    });

    const Factory = await ethers.getContractFactory(name);
    const instance = await Factory.deploy(
      vaultAddress,
      pauseWindow,
      factoryVersion,
      poolVersion
    );
    await instance.deployed();
    console.log(`✅ ${name} deployed to`, instance.address);
  }

  console.log("\n✔ Phase 3 Complete.");
  console.log("  Next: run scripts/unpause-vault.js\n");
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ deploy-factories.js error:", err);
    process.exit(1);
  });
