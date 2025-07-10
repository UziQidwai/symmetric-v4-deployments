// scripts/deploy-core.js
const { ethers } = require("hardhat");

async function main() {
  console.log("\n=== Phase 1: Core Infrastructure ===\n");

  // ── CONFIG ──
  const pauseWindowDuration  = 7_776_000;  // 90 days
  const bufferPeriodDuration = 2_592_000;  // 30 days
  const initialSwapFee       = ethers.utils.parseUnits("0.05", 18); // 5%
  const initialYieldFee      = ethers.utils.parseUnits("0.05", 18); // 5%

  console.log("Config:");
  console.log("  pauseWindowDuration =", pauseWindowDuration);
  console.log("  bufferPeriodDuration=", bufferPeriodDuration);
  console.log("  initialSwapFee      =", initialSwapFee.toString());
  console.log("  initialYieldFee     =", initialYieldFee.toString());

  // ── 1. Deploy VaultAdmin ──
  console.log("\n🚀 Deploying VaultAdmin…");
  const VaultAdmin = await ethers.getContractFactory("VaultAdmin");
  const vaultAdmin = await VaultAdmin.deploy(
    /* vault: will be set after Vault is deployed, but this version takes no vault parameter */
    pauseWindowDuration,
    bufferPeriodDuration,
    (await ethers.getSigners())[0].address,
    (await ethers.getSigners())[0].address
  );
  await vaultAdmin.deployed();
  console.log("✅ VaultAdmin deployed to", vaultAdmin.address);

  // ── 2. Deploy VaultExtension ──
  console.log("\n🚀 Deploying VaultExtension…");
  const VaultExtension = await ethers.getContractFactory("VaultExtension");
  const vaultExtension = await VaultExtension.deploy(
    /* vault placeholder: will be fixed by initialize() */,
    vaultAdmin.address
  );
  await vaultExtension.deployed();
  console.log("✅ VaultExtension deployed to", vaultExtension.address);

  // ── 3. Deploy ProtocolFeeController ──
  console.log("\n🚀 Deploying ProtocolFeeController…");
  const ProtocolFeeController = await ethers.getContractFactory("ProtocolFeeController");
  const protocolFeeController = await ProtocolFeeController.deploy(
    /* vault placeholder */
    initialSwapFee,
    initialYieldFee
  );
  await protocolFeeController.deployed();
  console.log("✅ ProtocolFeeController deployed to", protocolFeeController.address);

  // ── 4. Deploy Vault ──
  console.log("\n🚀 Deploying Vault…");
  const Vault = await ethers.getContractFactory("Vault");
  const vault = await Vault.deploy(
    vaultExtension.address,
    vaultAdmin.address,
    protocolFeeController.address
  );
  await vault.deployed();
  console.log("✅ Vault deployed to", vault.address);

  console.log("\n✔ Phase 1 Complete.");
  console.log("  Next: go run scripts/deploy-routers.js\n");
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ deploy-core.js error:", err);
    process.exit(1);
  });
