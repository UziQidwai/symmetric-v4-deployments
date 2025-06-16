#!/bin/bash

echo "=========================================="
echo "🚀 COMPLETE SUBGRAPH CONTRACTS SETUP"
echo "=========================================="
echo "This script will set up additional contracts for subgraph deployment"
echo "while maintaining your existing working deployment setup."
echo ""

# Step 1: Backup existing files
echo "1️⃣  Creating backups..."
if [ -f "hardhat.config.js" ]; then
    cp hardhat.config.js hardhat.config.js.backup
    echo "✓ Backed up hardhat.config.js"
else
    echo "✗ No hardhat.config.js found"
    exit 1
fi

if [ -f "scripts/deploy-all.js" ]; then
    cp scripts/deploy-all.js scripts/deploy-all.js.backup
    echo "✓ Backed up deployment script"
else
    echo "✗ No scripts/deploy-all.js found"
    exit 1
fi

if [ -f "contracts/core/PoolFactories.sol" ]; then
    cp contracts/core/PoolFactories.sol contracts/core/PoolFactories.sol.backup
    echo "✓ Backed up PoolFactories.sol"
fi

# Step 2: Test original compilation
echo ""
echo "2️⃣  Testing original setup..."
npm run compile > /tmp/original_compile 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Original compilation works"
else
    echo "❌ Original compilation failed. Check your base setup first."
    echo "Error details:"
    cat /tmp/original_compile | grep -A 3 -B 1 "Error"
    exit 1
fi

# Step 3: Create clean structure for additional contracts
echo ""
echo "3️⃣  Setting up additional contracts structure..."
mkdir -p contracts/core/additional/{factories/{interfaces,lib},hooks}

# Step 4: Copy ReClamm contracts (confirmed working)
echo ""
echo "4️⃣  Copying ReClamm contracts..."

# Copy ReClamm main contracts
if [ -f "contracts/reclamm/contracts/ReClammPoolFactory.sol" ]; then
    cp contracts/reclamm/contracts/ReClammPoolFactory.sol contracts/core/additional/factories/
    echo "✓ ReClammPoolFactory.sol"
else
    echo "⚠️  ReClammPoolFactory.sol not found"
fi

if [ -f "contracts/reclamm/contracts/ReClammPool.sol" ]; then
    cp contracts/reclamm/contracts/ReClammPool.sol contracts/core/additional/factories/
    echo "✓ ReClammPool.sol"
else
    echo "⚠️  ReClammPool.sol not found"
fi

# Copy ReClamm lib files
if [ -d "contracts/reclamm/contracts/lib" ]; then
    cp contracts/reclamm/contracts/lib/*.sol contracts/core/additional/factories/lib/ 2>/dev/null || true
    echo "✓ ReClamm lib files"
fi

# Copy ReClamm interface files
if [ -d "contracts/reclamm/contracts/interfaces" ]; then
    cp contracts/reclamm/contracts/interfaces/*.sol contracts/core/additional/factories/interfaces/ 2>/dev/null || true
    echo "✓ ReClamm interface files"
fi

# Step 5: Update PoolFactories.sol to include additional contracts
echo ""
echo "5️⃣  Updating PoolFactories.sol..."
cat > contracts/core/PoolFactories.sol << 'EOF'
// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

// Import original pool factories
import "@balancer-labs/v3-pool-weighted/contracts/WeightedPoolFactory.sol";
import "@balancer-labs/v3-pool-stable/contracts/StablePoolFactory.sol";

// Import additional contracts for subgraph
import "./additional/factories/ReClammPoolFactory.sol";

/**
 * @title PoolFactories
 * @notice Imports all required pool factories for subgraph deployment
 * @dev Includes original Balancer factories plus confirmed additional contracts
 */
contract PoolFactories {
    // Empty contract - just for compilation
}
EOF
echo "✓ Updated PoolFactories.sol with additional contracts"

# Step 6: Test compilation with additional contracts
echo ""
echo "6️⃣  Testing compilation with additional contracts..."
npm run compile > /tmp/additional_compile 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Compilation successful with additional contracts"
    COMPILATION_SUCCESS=true
else
    echo "⚠️  Compilation failed with additional contracts"
    echo "Restoring original PoolFactories.sol..."
    cp contracts/core/PoolFactories.sol.backup contracts/core/PoolFactories.sol
    echo "Error details:"
    cat /tmp/additional_compile | grep -A 3 -B 1 "Error"
    COMPILATION_SUCCESS=false
fi

# Step 7: Create enhanced deployment script
echo ""
echo "7️⃣  Creating enhanced deployment script..."
cat > scripts/deploy-all-enhanced.js << 'EOF'
const { ethers } = require("hardhat");
const { DeploymentManager, deployContract, loadNetworkConfig } = require("./utils/deploy-utils");

async function deployCompleteSymmetricV4(networkName = 'moksha') {
  console.log(`\n🌟 Starting Complete Symmetric V4 (Balancer V3) Deployment to ${networkName}`);
  console.log("=" .repeat(70));
  
  // Ensure we're using the correct network
  if (hre.network.name !== networkName) {
    console.error(`❌ Network mismatch! Expected ${networkName}, but connected to ${hre.network.name}`);
    console.log(`Please run: npx hardhat run scripts/deploy-all-enhanced.js --network ${networkName}`);
    process.exit(1);
  }
  
  const [deployer] = await ethers.getSigners();
  const deploymentManager = new DeploymentManager(networkName);
  const networkConfig = await loadNetworkConfig(networkName);
  const ROUTER_VERSION = "1.0.0";

  console.log(`Network: ${hre.network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  
  const startTime = Date.now();
  
  try {
    console.log(`\n🏗️  Phase 1: Solving Circular Dependencies with CREATE2`);
    console.log("-".repeat(50));
    
    console.log("\n📄 Step 1: Deploy VaultAdmin first (it needs a Vault address)");
    
    // Get deployer nonce to calculate future addresses
    const nonce = await ethers.provider.getTransactionCount(deployer.address);
    console.log(`Deployer nonce: ${nonce}`);
    
    // Calculate what the Vault address will be (it will be deployed at nonce + 3)
    const futureVaultAddress = ethers.getCreateAddress({
      from: deployer.address,
      nonce: nonce + 3
    });
    
    console.log(`Calculated future Vault address: ${futureVaultAddress}`);
    
    // Step 1: Deploy VaultAdmin with future Vault address
    const vaultAdmin = await deployContract(
      "VaultAdmin",
      [
        futureVaultAddress,
        networkConfig.deployments.vault.pauseWindowDuration,
        networkConfig.deployments.vault.bufferPeriodDuration,
        ethers.parseEther("0.000001"),
        ethers.parseEther("0.000001")
      ],
      deploymentManager
    );
    
    // Step 2: Deploy VaultExtension
    const vaultExtension = await deployContract(
      "VaultExtension",
      [
        futureVaultAddress,
        await vaultAdmin.getAddress()
      ],
      deploymentManager
    );
    
    // Step 3: Deploy ProtocolFeeController
    const protocolFeeController = await deployContract(
      "ProtocolFeeController",
      [
        futureVaultAddress,
        ethers.parseEther("0.0025"),
        ethers.parseEther("0.005")
      ],
      deploymentManager
    );
    
    // Step 4: Deploy Vault
    const vault = await deployContract(
      "Vault",
      [
        await vaultExtension.getAddress(),
        deployer.address,
        await protocolFeeController.getAddress()
      ],
      deploymentManager
    );
    
    // Verify the address calculation
    const actualVaultAddress = await vault.getAddress();
    if (actualVaultAddress.toLowerCase() !== futureVaultAddress.toLowerCase()) {
      console.warn(`⚠️  Address calculation mismatch!`);
      console.warn(`   Expected: ${futureVaultAddress}`);
      console.warn(`   Actual:   ${actualVaultAddress}`);
    } else {
      console.log(`✅ Address calculation was correct!`);
    }
    
    // Phase 2: Routers
    console.log(`\n🛣️  Phase 2: Routers`);
    console.log("-".repeat(50));
    
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    const wethAddress = networkConfig.tokens.WETH || ZERO_ADDRESS;
    const permit2Address = ZERO_ADDRESS;
    
    const router = await deployContract(
      "Router",
      [await vault.getAddress(), wethAddress, permit2Address, ROUTER_VERSION],
      deploymentManager
    );
    
    const batchRouter = await deployContract(
      "BatchRouter", 
      [await vault.getAddress(), wethAddress, permit2Address, ROUTER_VERSION],
      deploymentManager
    );
    
    // Phase 3: Core Pool Factories
    console.log(`\n🏊 Phase 3: Core Pool Factories`);
    console.log("-".repeat(50));
    
    const weightedPoolFactory = await deployContract(
      "WeightedPoolFactory",
      [
        await vault.getAddress(),
        networkConfig.deployments.pools.weightedPoolFactory.pauseWindowDuration,
        "Weighted Pool Factory V3",
        "Weighted Pool V3"
      ],
      deploymentManager
    );
    
    const stablePoolFactory = await deployContract(
      "StablePoolFactory",
      [
        await vault.getAddress(),
        networkConfig.deployments.pools.stablePoolFactory.pauseWindowDuration,
        "Stable Pool Factory V3", 
        "Stable Pool V3"
      ],
      deploymentManager
    );
    
    // Phase 4: Additional Pool Factories
    console.log(`\n🔧 Phase 4: Additional Pool Factories for Subgraph`);
    console.log("-".repeat(50));
    
    // Deploy ReClamm Pool Factory (if available)
    try {
      console.log("Deploying ReClammPoolFactory...");
      const reClammPoolFactory = await deployContract(
        "ReClammPoolFactory",
        [
          await vault.getAddress(),
          networkConfig.deployments.pools?.reClammPoolFactory?.pauseWindowDuration || 2592000,
          "ReClamm Pool Factory",
          "ReClamm Pool"
        ],
        deploymentManager
      );
      console.log(`✅ ReClammPoolFactory deployed at: ${await reClammPoolFactory.getAddress()}`);
    } catch (error) {
      console.warn(`⚠️  ReClammPoolFactory deployment failed: ${error.message}`);
      console.warn(`   Continuing with core deployment...`);
    }
    
    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n🎉 Enhanced Symmetric V4 Deployment Complete!`);
    console.log("=" .repeat(70));
    
    const deployments = deploymentManager.getAllContracts();
    
    console.log(`\n📋 Core Infrastructure:`);
    const coreContracts = ['Vault', 'VaultAdmin', 'VaultExtension', 'ProtocolFeeController'];
    coreContracts.forEach(name => {
      if (deployments[name]) {
        console.log(`   ${name}: ${deployments[name].address}`);
      }
    });
    
    console.log(`\n📋 Routers:`);
    const routerContracts = ['Router', 'BatchRouter'];
    routerContracts.forEach(name => {
      if (deployments[name]) {
        console.log(`   ${name}: ${deployments[name].address}`);
      }
    });
    
    console.log(`\n📋 Pool Factories:`);
    const factoryContracts = ['WeightedPoolFactory', 'StablePoolFactory', 'ReClammPoolFactory'];
    factoryContracts.forEach(name => {
      if (deployments[name]) {
        console.log(`   ${name}: ${deployments[name].address}`);
      }
    });
    
    console.log(`\n⏱️  Total deployment time: ${duration}s`);
    console.log(`📁 Full deployment saved to: deployments/${networkName}.json`);
    console.log(`🌐 Network: ${networkConfig.name} (Chain ID: ${networkConfig.chainId})`);
    console.log(`🔍 Explorer: ${networkConfig.explorer}`);
    console.log(`\n👑 You are the admin/authorizer with full protocol control!`);
    
    // Show subgraph summary
    const successfulFactories = factoryContracts.filter(name => deployments[name]);
    console.log(`\n📊 Subgraph Ready Contracts:`);
    console.log(`   ✅ Available factories: ${successfulFactories.join(', ')}`);
    console.log(`   ℹ️  Use these addresses in your subgraph configuration`);
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  const networkName = process.argv[2] || process.env.HARDHAT_NETWORK || 'moksha';
  deployCompleteSymmetricV4(networkName)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { deployCompleteSymmetricV4 };
EOF

echo "✓ Created enhanced deployment script"

# Step 8: Test deployment script compilation
echo ""
echo "8️⃣  Testing enhanced deployment script..."
echo "Checking if all required contracts can be found..."

# Quick test that the deployment script can find the contracts
node -e "
const { ethers } = require('hardhat');
async function test() {
  try {
    await ethers.getContractFactory('VaultAdmin');
    await ethers.getContractFactory('WeightedPoolFactory');
    await ethers.getContractFactory('StablePoolFactory');
    console.log('✅ Core contracts found');
    
    try {
      await ethers.getContractFactory('ReClammPoolFactory');
      console.log('✅ ReClammPoolFactory found');
    } catch (e) {
      console.log('⚠️  ReClammPoolFactory not found (will be skipped in deployment)');
    }
  } catch (error) {
    console.log('❌ Error finding contracts:', error.message);
    process.exit(1);
  }
}
test();
" || echo "Contract factory test had issues"

# Step 9: Final status and instructions
echo ""
echo "=========================================="
if [ "$COMPILATION_SUCCESS" = true ]; then
    echo "✅ SETUP COMPLETE - SUCCESS!"
    echo "=========================================="
    echo ""
    echo "📋 What was set up:"
    echo "  ✅ ReClamm contracts added and compiling"
    echo "  ✅ Enhanced deployment script created"
    echo "  ✅ All backups created"
    echo ""
    echo "🚀 Ready to deploy!"
    echo "  • Test deployment: npx hardhat run scripts/deploy-all-enhanced.js --network moksha"
    echo "  • Production deployment: npm run deploy:moksha (after replacing script)"
    echo ""
    echo "📁 Files created/modified:"
    echo "  • contracts/core/additional/ - Additional contracts"
    echo "  • contracts/core/PoolFactories.sol - Updated with ReClamm"
    echo "  • scripts/deploy-all-enhanced.js - Enhanced deployment script"
    echo ""
    echo "🔄 To use enhanced script as default:"
    echo "  cp scripts/deploy-all-enhanced.js scripts/deploy-all.js"
else
    echo "⚠️  SETUP COMPLETE - PARTIAL SUCCESS"
    echo "=========================================="
    echo ""
    echo "📋 What was set up:"
    echo "  ⚠️  Additional contracts copied but compilation failed"
    echo "  ✅ Enhanced deployment script created (will attempt ReClamm)"
    echo "  ✅ All backups created"
    echo "  ✅ Original setup preserved and working"
    echo ""
    echo "🚀 You can still deploy!"
    echo "  • Original deployment: npm run deploy:moksha"
    echo "  • Enhanced deployment: npx hardhat run scripts/deploy-all-enhanced.js --network moksha"
    echo "    (Will skip ReClamm if it fails)"
fi

echo ""
echo "🔙 To restore original setup:"
echo "  • cp hardhat.config.js.backup hardhat.config.js"
echo "  • cp contracts/core/PoolFactories.sol.backup contracts/core/PoolFactories.sol"
echo "  • cp scripts/deploy-all.js.backup scripts/deploy-all.js"
echo ""
echo "Setup complete! 🎉"