/**
 * scripts/verify-all-enhanced.js
 *
 * Enhanced batch verification script that handles common verification issues:
 * - Identical bytecode contracts (minimal factory stubs)
 * - ReClamm contract dependencies
 * - Rate limiting and retries
 * - Proper contract path specification
 *
 * Prerequisites
 * -------------
 * 1. Add `MOKSHA_ETHERSCAN_API_KEY` to your .env file
 * 2. Ensure deployments/<network>.json exists
 *
 * Usage
 * -----
 * $ npx hardhat run scripts/verify-all-enhanced.js --network moksha
 */
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

function loadDeployments(network) {
  const file = path.join(__dirname, `../deployments/${network}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(
      `Deployment file not found: ${file}\n` +
      `⇢ Make sure you have run deploy scripts on the '${network}' network first.`
    );
  }
  return JSON.parse(fs.readFileSync(file, "utf8")).contracts || {};
}

async function verifyWithRetry(name, address, args, contractPath = null, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 Verifying ${name} at ${address} (attempt ${attempt}/${maxRetries})`);
      
      const verifyOptions = {
        address,
        constructorArguments: args,
      };
      
      // Add contract path for identical bytecode resolution
      if (contractPath) {
        verifyOptions.contract = contractPath;
        console.log(`   📂 Using contract path: ${contractPath}`);
      }
      
      await hre.run("verify:verify", verifyOptions);
      console.log(`✅ ${name} verified successfully\n`);
      return { success: true, alreadyVerified: false };
      
    } catch (err) {
      const msg = (err.message || "").toLowerCase();
      
      if (msg.includes("already verified")) {
        console.log(`ℹ️  ${name} already verified – skipping\n`);
        return { success: true, alreadyVerified: true };
      }
      
      if (msg.includes("more than one contract was found")) {
        console.log(`⚠️  Multiple contracts with same bytecode detected`);
        if (!contractPath) {
          // Extract the correct contract path from error message
          const pathMatch = err.message.match(new RegExp(`contracts/[^:]+:${name}`));
          if (pathMatch) {
            console.log(`   🔄 Retrying with specific contract path...`);
            return await verifyWithRetry(name, address, args, pathMatch[0], 1);
          }
        }
      }
      
      if (attempt < maxRetries) {
        console.log(`⚠️  Attempt ${attempt} failed: ${err.message}`);
        console.log(`   🔄 Retrying in 5 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.warn(`❌ Verification failed for ${name} after ${maxRetries} attempts: ${err.message}\n`);
        return { success: false, alreadyVerified: false };
      }
    }
  }
  
  return { success: false, alreadyVerified: false };
}

async function main() {
  const network = hre.network.name;
  console.log(`\n🔍 Enhanced Contract Verification on ${network}`);
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

  // Define contract paths for disambiguation
  const contractPaths = {
    'Gyro2CLPPoolFactory': 'contracts/core/additional/factories/Gyro2CLPPoolFactory.sol:Gyro2CLPPoolFactory',
    'GyroECLPPoolFactory': 'contracts/core/additional/factories/GyroECLPPoolFactory.sol:GyroECLPPoolFactory',
    'LBPoolFactory': 'contracts/core/additional/factories/LBPoolFactory.sol:LBPoolFactory',
    'QuantAMMWeightedPoolFactory': 'contracts/core/additional/factories/QuantAMMWeightedPoolFactory.sol:QuantAMMWeightedPoolFactory',
    'ReClammPoolFactory': 'contracts/core/additional/factories/ReClammPoolFactory.sol:ReClammPoolFactory'
  };

  // Prioritize verification order: Core first, then routers, then factories
  const verificationOrder = [
    // Core infrastructure (usually verify easily)
    'Vault', 'VaultAdmin', 'VaultExtension', 'ProtocolFeeController',
    // Routers
    'Router', 'BatchRouter',
    // Standard factories (should work)
    'WeightedPoolFactory', 'StablePoolFactory',
    // Problematic contracts last
    'ReClammPoolFactory', 
    'Gyro2CLPPoolFactory', 'GyroECLPPoolFactory', 'LBPoolFactory', 'QuantAMMWeightedPoolFactory'
  ];

  // Add any remaining contracts not in the order list
  const remainingContracts = names.filter(name => !verificationOrder.includes(name));
  const orderedNames = [...verificationOrder.filter(name => names.includes(name)), ...remainingContracts];

  let successCount = 0;
  let failureCount = 0;
  let alreadyVerifiedCount = 0;
  const failedContracts = [];

  console.log("🚀 Starting enhanced verification process...\n");
  
  for (let i = 0; i < orderedNames.length; i++) {
    const name = orderedNames[i];
    const { address, constructorArgs = [] } = deployments[name];
    
    // Add delay between verifications to avoid rate limiting
    if (i > 0) {
      console.log("⏳ Waiting 3 seconds to avoid rate limiting...");
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Special handling for problematic contracts
    if (name === 'ReClammPoolFactory') {
      console.log("🔧 Special handling for ReClammPoolFactory (known dependency issues)");
    }
    
    const contractPath = contractPaths[name];
    const result = await verifyWithRetry(name, address, constructorArgs, contractPath);
    
    if (result.success) {
      if (result.alreadyVerified) {
        alreadyVerifiedCount++;
      } else {
        successCount++;
      }
    } else {
      failureCount++;
      failedContracts.push(name);
    }
  }

  // Summary report
  console.log("=" .repeat(60));
  console.log("📊 ENHANCED VERIFICATION SUMMARY");
  console.log("=" .repeat(60));
  
  console.log(`\n📈 Results:`);
  console.log(`  ✅ Successfully verified: ${successCount}`);
  console.log(`  ℹ️  Already verified: ${alreadyVerifiedCount}`);
  console.log(`  ❌ Failed verification: ${failureCount}`);
  console.log(`  📊 Total contracts: ${names.length}`);
  
  if (failedContracts.length > 0) {
    console.log(`\n❌ Failed contracts: ${failedContracts.join(', ')}`);
    console.log(`\n🔧 Troubleshooting failed verifications:`);
    
    failedContracts.forEach(contractName => {
      const { address, constructorArgs = [] } = deployments[contractName];
      console.log(`\n📋 ${contractName}:`);
      console.log(`   Address: ${address}`);
      console.log(`   Constructor args: ${JSON.stringify(constructorArgs)}`);
      
      if (contractPaths[contractName]) {
        console.log(`   Manual verification command:`);
        console.log(`   npx hardhat verify --contract ${contractPaths[contractName]} --network ${network} ${address} ${constructorArgs.map(arg => `"${arg}"`).join(' ')}`);
      }
      
      if (contractName === 'ReClammPoolFactory') {
        console.log(`   ⚠️  Known issue: ReClamm has complex dependencies that may not verify automatically`);
        console.log(`   💡 Consider manually flattening the contract or checking dependency imports`);
      }
      
      if (['Gyro2CLPPoolFactory', 'GyroECLPPoolFactory', 'LBPoolFactory', 'QuantAMMWeightedPoolFactory'].includes(contractName)) {
        console.log(`   ⚠️  Known issue: Identical minimal contracts with same bytecode`);
        console.log(`   💡 This is expected for stub contracts - they serve their purpose even if unverified`);
      }
    });
  }
  
  const totalVerified = successCount + alreadyVerifiedCount;
  if (totalVerified === names.length) {
    console.log(`\n🎉 All contracts verified successfully!`);
  } else {
    console.log(`\n📋 ${totalVerified}/${names.length} contracts are verified.`);
    
    if (failureCount > 0) {
      const stubFailures = failedContracts.filter(name => 
        ['Gyro2CLPPoolFactory', 'GyroECLPPoolFactory', 'LBPoolFactory', 'QuantAMMWeightedPoolFactory'].includes(name)
      ).length;
      
      if (stubFailures === failureCount) {
        console.log(`\n✅ All core contracts verified! The ${failureCount} failed verifications are just minimal stub contracts.`);
        console.log(`   These contracts work perfectly for subgraph indexing even without verification.`);
      }
    }
  }

  console.log(`\n🌐 Check verified contracts on: https://${network === 'moksha' ? 'moksha.vanascan.io' : 'etherscan.io'}`);
  console.log(`\n✨ Enhanced verification complete!`);
  
  // Exit with appropriate code
  if (failureCount > 0) {
    const criticalFailures = failedContracts.filter(name => 
      !['Gyro2CLPPoolFactory', 'GyroECLPPoolFactory', 'LBPoolFactory', 'QuantAMMWeightedPoolFactory'].includes(name)
    );
    
    if (criticalFailures.length > 0) {
      console.log(`\n⚠️  ${criticalFailures.length} critical contract(s) failed verification.`);
      process.exit(1);
    }
  }
}

main()
  .catch(err => {
    console.error("\n❌ Enhanced verification script failed:", err);
    process.exit(1);
  });
