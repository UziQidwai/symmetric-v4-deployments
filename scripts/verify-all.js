/**
 * scripts/verify-all.js
 *
 * Batch‑verifies every contract that was deployed by `scripts/deploy-all.js`
 * to the Moksha explorer (https://moksha.vanascan.io).
 *
 * Prerequisites
 * -------------
 * 1. Add `MOKSHA_ETHERSCAN_API_KEY` to your .env file or export it in the shell.
 * 2. Ensure deployments/<network>.json exists (it is written automatically
 * by DeploymentManager.saveDeployments()).
 *
 * Usage
 * -----
 * $ npx hardhat run scripts/verify-all.js --network moksha
 *
 * The script can be invoked against mainnet as well – just change --network.
 */
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Reads deployments/<network>.json that is produced by DeploymentManager.
 * The JSON shape is:
 * {
 *   "timestamp": "...",
 *   "contracts": {
 *     "ContractName": {
 *       "address": "0x…",
 *       "constructorArgs": [ ... ],
 *       "txHash": "0x…"
 *     },
 *     …
 *   }
 * }
 */
function loadDeployments(network) {
  const file = path.join(__dirname, `../deployments/${network}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(
      `Deployment file not found: ${file}\n` +
      `⇢ Make sure you have run deploy-all.js on the '${network}' network first.`
    );
  }
  return JSON.parse(fs.readFileSync(file, "utf8")).contracts || {};
}

async function verify(name, address, args) {
  try {
    console.log(`🔍 Verifying ${name} at ${address}`);
    await hre.run("verify:verify", {
      address,
      constructorArguments: args,
    });
    console.log(`✅ ${name} verified successfully`);
    return true;
  } catch (err) {
    const msg = (err.message || "").toLowerCase();
    if (msg.includes("already verified")) {
      console.log(`ℹ️  ${name} already verified – skipping`);
      return true;
    } else {
      console.warn(`⚠️  Verification failed for ${name}: ${err.message}`);
      return false;
    }
  }
}

async function main() {
  const network = hre.network.name;
  console.log(`\n🔍 Starting contract verification on ${network}`);
  console.log("=" .repeat(60));
  
  const deployments = loadDeployments(network);
  const names = Object.keys(deployments);
  
  if (!names.length) {
    console.log(`No contracts found in deployments/${network}.json`);
    return;
  }

  console.log(`Found ${names.length} contracts to verify:`);
  names.forEach(name => {
    console.log(`  • ${name}: ${deployments[name].address}`);
  });
  console.log("");

  // Categorize contracts for better reporting
  const coreContracts = ['Vault', 'VaultAdmin', 'VaultExtension', 'ProtocolFeeController'];
  const routerContracts = ['Router', 'BatchRouter'];
  const factoryContracts = ['WeightedPoolFactory', 'StablePoolFactory', 'ReClammPoolFactory', 
                           'LBPoolFactory', 'StablePoolV2Factory', 'QuantAMMWeightedPoolFactory',
                           'Gyro2CLPPoolFactory', 'GyroECLPPoolFactory'];
  const hookContracts = ['StableSurgeHook', 'StableSurgeHookV2'];

  let successCount = 0;
  let failureCount = 0;
  let alreadyVerifiedCount = 0;

  // Verify contracts sequentially to avoid hitting explorer rate‑limits
  console.log("🚀 Starting verification process...\n");
  
  for (const name of names) {
    const { address, constructorArgs = [] } = deployments[name];
    
    // Add a small delay between verifications to avoid rate limiting
    if (names.indexOf(name) > 0) {
      console.log("⏳ Waiting 3 seconds to avoid rate limiting...");
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    try {
      console.log(`🔍 Verifying ${name} at ${address}`);
      await hre.run("verify:verify", {
        address,
        constructorArguments: constructorArgs,
      });
      console.log(`✅ ${name} verified successfully\n`);
      successCount++;
    } catch (err) {
      const msg = (err.message || "").toLowerCase();
      if (msg.includes("already verified")) {
        console.log(`ℹ️  ${name} already verified – skipping\n`);
        alreadyVerifiedCount++;
      } else {
        console.warn(`⚠️  Verification failed for ${name}: ${err.message}\n`);
        failureCount++;
      }
    }
  }

  // Summary report
  console.log("=" .repeat(60));
  console.log("📊 VERIFICATION SUMMARY");
  console.log("=" .repeat(60));
  
  console.log(`\n📋 Contract Categories Verified:`);
  
  const verifiedCore = coreContracts.filter(name => deployments[name]);
  const verifiedRouters = routerContracts.filter(name => deployments[name]);
  const verifiedFactories = factoryContracts.filter(name => deployments[name]);
  const verifiedHooks = hookContracts.filter(name => deployments[name]);
  
  if (verifiedCore.length > 0) {
    console.log(`  ✅ Core Infrastructure (${verifiedCore.length}): ${verifiedCore.join(', ')}`);
  }
  
  if (verifiedRouters.length > 0) {
    console.log(`  ✅ Routers (${verifiedRouters.length}): ${verifiedRouters.join(', ')}`);
  }
  
  if (verifiedFactories.length > 0) {
    console.log(`  ✅ Pool Factories (${verifiedFactories.length}): ${verifiedFactories.join(', ')}`);
  }
  
  if (verifiedHooks.length > 0) {
    console.log(`  ✅ Hooks (${verifiedHooks.length}): ${verifiedHooks.join(', ')}`);
  }

  console.log(`\n📈 Results:`);
  console.log(`  ✅ Successfully verified: ${successCount}`);
  console.log(`  ℹ️  Already verified: ${alreadyVerifiedCount}`);
  console.log(`  ⚠️  Failed verification: ${failureCount}`);
  console.log(`  📊 Total contracts: ${names.length}`);
  
  if (failureCount > 0) {
    console.log(`\n⚠️  Some contracts failed verification. This might be due to:`);
    console.log(`   • Rate limiting (try running again later)`);
    console.log(`   • Constructor argument mismatch`);
    console.log(`   • Contract compilation issues`);
    console.log(`   • Network connectivity issues`);
  }
  
  const totalVerified = successCount + alreadyVerifiedCount;
  if (totalVerified === names.length) {
    console.log(`\n🎉 All contracts verified successfully!`);
    console.log(`🌐 Check them on the explorer: https://${network === 'moksha' ? 'moksha.vanascan.io' : 'etherscan.io'}`);
  } else {
    console.log(`\n📋 ${totalVerified}/${names.length} contracts are verified.`);
  }

  console.log(`\n✨ Verification complete!`);
}

main()
  .catch(err => {
    console.error("\n❌ Verification script failed:", err);
    process.exit(1);
  });
