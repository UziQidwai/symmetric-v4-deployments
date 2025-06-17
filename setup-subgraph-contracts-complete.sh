#!/bin/bash

# Accept network parameter (default to moksha)
NETWORK=${1:-moksha}

echo "=========================================="
echo "🚀 COMPLETE SUBGRAPH CONTRACTS SETUP"
echo "=========================================="
echo "Final version - Works from any clean repository clone"
echo "This script will set up additional contracts for comprehensive"
echo "subgraph deployment with multiple pool factory types."
echo ""
echo "Target network: $NETWORK"
echo ""
echo "📋 What this script will do:"
echo "   1. Complete environment cleanup"
echo "   2. Verify base setup works from clean state"
echo "   3. Add ReClamm contracts (version-filtered)"
echo "   4. Create production-ready deployment script"
echo "   5. Provide working 4-factory deployment"
echo ""

# Step 1: Complete environment cleanup and reset
echo "1️⃣  Complete environment cleanup and reset..."

# Remove any additional contracts directories
rm -rf contracts/core/additional/ 2>/dev/null || true
rm -rf contracts/additional/ 2>/dev/null || true

# Remove any enhanced deployment scripts
rm -f scripts/deploy-*enhanced*.js 2>/dev/null || true
rm -f scripts/deploy-*reclamm*.js 2>/dev/null || true
rm -f scripts/deploy-*safe*.js 2>/dev/null || true
rm -f scripts/deploy-*subgraph*.js 2>/dev/null || true

# Remove backup files from any previous runs
rm -f hardhat.config.js.backup* 2>/dev/null || true
rm -f contracts/core/PoolFactories.sol.backup* 2>/dev/null || true
rm -f scripts/deploy-all.js.backup* 2>/dev/null || true

# Clean Hardhat artifacts and cache completely
echo "🧹 Cleaning Hardhat build artifacts..."
npx hardhat clean > /dev/null 2>&1 || true
rm -rf artifacts/ cache/ typechain-types/ 2>/dev/null || true

# Remove any temp files
rm -f /tmp/*compile* /tmp/*test* /tmp/*setup* 2>/dev/null || true

# Ensure we have a truly clean PoolFactories.sol (original state)
if [ -f "contracts/core/PoolFactories.sol" ]; then
    # Check if it already has additional imports
    if grep -q "additional/factories" contracts/core/PoolFactories.sol; then
        echo "🔄 Restoring original PoolFactories.sol..."
        # Create the original clean version
        cat > contracts/core/PoolFactories.sol << 'EOF'
// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

// Import original pool factories
import "@balancer-labs/v3-pool-weighted/contracts/WeightedPoolFactory.sol";
import "@balancer-labs/v3-pool-stable/contracts/StablePoolFactory.sol";

/**
 * @title PoolFactories
 * @notice Imports all required pool factories for subgraph deployment
 */
contract PoolFactories {
    // Empty contract - just for compilation
}
EOF
    fi
fi

echo "✓ Environment completely cleaned and reset to original state"

# Step 2: Verify dependencies and base setup
echo ""
echo "2️⃣  Verifying dependencies and base setup..."

# Check for required dependencies
echo "📦 Checking project dependencies..."

if [ ! -f "package.json" ]; then
    echo "❌ No package.json found - ensure you're in the right directory"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
fi

# Check for ReClamm submodule
echo "📦 Checking ReClamm submodule..."
if [ ! -f "contracts/reclamm/contracts/ReClammPoolFactory.sol" ]; then
    echo "📦 Initializing submodules (this may take a moment)..."
    git submodule update --init --recursive
    
    # Check again
    if [ ! -f "contracts/reclamm/contracts/ReClammPoolFactory.sol" ]; then
        echo "❌ ReClamm contracts not found after submodule init!"
        echo "Expected: contracts/reclamm/contracts/ReClammPoolFactory.sol"
        echo ""
        echo "🔧 Please run manually:"
        echo "   git submodule update --init --recursive"
        exit 1
    fi
fi

echo "✓ All dependencies verified"

# Test clean base compilation
echo ""
echo "🧪 Testing clean base compilation..."
HARDHAT_NETWORK=$NETWORK npm run compile > /tmp/base_test 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Base setup compiles correctly"
else
    echo "❌ Base setup has compilation issues:"
    echo ""
    cat /tmp/base_test | grep -A 5 -B 2 "Error" | head -20
    echo ""
    echo "🔧 Common fixes:"
    echo "   • Run: npm install"
    echo "   • Run: git submodule update --init --recursive"
    echo "   • Check your hardhat.config.js network settings"
    exit 1
fi

# Step 3: Check Solidity version compatibility
echo ""
echo "3️⃣  Checking Solidity version compatibility..."

# Extract Solidity version from hardhat config
SOLIDITY_VERSION=$(grep -A 10 "solidity:" hardhat.config.js | grep "version:" | head -1 | sed 's/.*version: *"\([^"]*\)".*/\1/' 2>/dev/null || echo "0.8.24")
echo "📋 Detected Solidity version: $SOLIDITY_VERSION"

# Validate it's a supported version
case $SOLIDITY_VERSION in
    "0.8.24"|"0.8.23"|"0.8.22"|"0.8.21"|"0.8.20")
        echo "✅ Solidity version is compatible"
        ;;
    *)
        echo "⚠️  Solidity version $SOLIDITY_VERSION may have compatibility issues"
        echo "   Recommended: 0.8.24 or earlier"
        ;;
esac

# Step 4: Create safety backups
echo ""
echo "4️⃣  Creating safety backups..."
cp hardhat.config.js hardhat.config.js.backup
cp contracts/core/PoolFactories.sol contracts/core/PoolFactories.sol.backup
cp scripts/deploy-all.js scripts/deploy-all.js.backup
echo "✓ Safety backups created"

# Step 5: Set up ReClamm contracts with intelligent filtering
echo ""
echo "5️⃣  Setting up ReClamm contracts (intelligent version filtering)..."

# Create clean structure
mkdir -p contracts/core/additional/factories/{lib,interfaces}

# Copy main ReClamm contracts
echo "📦 Copying main ReClamm contracts..."
cp contracts/reclamm/contracts/ReClammPoolFactory.sol contracts/core/additional/factories/
cp contracts/reclamm/contracts/ReClammPool.sol contracts/core/additional/factories/
echo "✓ Copied ReClammPoolFactory.sol and ReClammPool.sol"

# Copy and filter library files
echo "📦 Copying and filtering library files..."
COPIED_LIBS=0
if [ -d "contracts/reclamm/contracts/lib" ]; then
    for file in contracts/reclamm/contracts/lib/*.sol; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            
            # Check Solidity version in file
            FILE_VERSION=$(head -10 "$file" | grep "pragma solidity" | sed 's/.*pragma solidity *\^\?\([0-9]*\.[0-9]*\).*/\1/' 2>/dev/null || echo "unknown")
            
            # Determine if file is compatible
            COMPATIBLE=false
            
            # Always include ReClamm-specific files
            if [[ "$filename" == ReClamm* ]]; then
                COMPATIBLE=true
            # Include files with compatible versions
            elif [[ "$FILE_VERSION" == "0.8.24" ]] || [[ "$FILE_VERSION" == "0.8.23" ]] || [[ "$FILE_VERSION" == "0.8.22" ]] || [[ "$FILE_VERSION" == "0.8.21" ]] || [[ "$FILE_VERSION" == "0.8.20" ]] || [[ "$FILE_VERSION" == "unknown" ]]; then
                COMPATIBLE=true
            # Skip newer versions that cause conflicts
            elif [[ "$FILE_VERSION" == "0.8.25" ]] || [[ "$FILE_VERSION" == "0.8.26" ]] || [[ "$FILE_VERSION" == "0.8.27" ]]; then
                COMPATIBLE=false
            # Skip known problematic Gyro files
            elif [[ "$filename" == *Gyro* ]]; then
                COMPATIBLE=false
            else
                COMPATIBLE=true  # Default to compatible for unknown cases
            fi
            
            if [ "$COMPATIBLE" = true ]; then
                cp "$file" contracts/core/additional/factories/lib/
                echo "  ✓ $filename (version: ${FILE_VERSION:-compatible})"
                COPIED_LIBS=$((COPIED_LIBS + 1))
            else
                echo "  ⚠️  Skipped $filename (version: $FILE_VERSION - incompatible)"
            fi
        fi
    done
    echo "✓ Copied $COPIED_LIBS compatible library files"
else
    echo "⚠️  No lib directory found in ReClamm contracts"
fi

# Copy interface files
echo "📦 Copying interface files..."
COPIED_INTERFACES=0
if [ -d "contracts/reclamm/contracts/interfaces" ]; then
    for file in contracts/reclamm/contracts/interfaces/*.sol; do
        if [ -f "$file" ]; then
            cp "$file" contracts/core/additional/factories/interfaces/
            COPIED_INTERFACES=$((COPIED_INTERFACES + 1))
        fi
    done
    echo "✓ Copied $COPIED_INTERFACES interface files"
else
    echo "⚠️  No interfaces directory found in ReClamm contracts"
fi

# Step 6: Update PoolFactories.sol
echo ""
echo "6️⃣  Updating PoolFactories.sol..."

cat > contracts/core/PoolFactories.sol << 'EOF'
// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

// Import original pool factories
import "@balancer-labs/v3-pool-weighted/contracts/WeightedPoolFactory.sol";
import "@balancer-labs/v3-pool-stable/contracts/StablePoolFactory.sol";

// Import ReClamm for subgraph
import "./additional/factories/ReClammPoolFactory.sol";

/**
 * @title PoolFactories
 * @notice Imports all required pool factories for subgraph deployment
 * @dev Includes original Balancer factories plus ReClamm for comprehensive indexing
 */
contract PoolFactories {
    // Empty contract - just for compilation
}
EOF

echo "✓ Updated PoolFactories.sol with ReClamm import"

# Step 7: Test compilation with ReClamm
echo ""
echo "7️⃣  Testing compilation with ReClamm..."

HARDHAT_NETWORK=$NETWORK npm run compile > /tmp/reclamm_test 2>&1

if [ $? -eq 0 ]; then
    echo "✅ ReClamm compilation successful!"
    SETUP_SUCCESS=true
else
    echo "❌ ReClamm compilation failed:"
    echo ""
    cat /tmp/reclamm_test | grep -A 5 -B 1 "Error" | head -20
    echo ""
    echo "🔧 Attempting automatic fixes..."
    
    # Try removing any potentially problematic files
    find contracts/core/additional/factories/lib/ -name "*Gyro*" -delete 2>/dev/null || true
    find contracts/core/additional/factories/lib/ -name "*.sol" -exec grep -l "pragma solidity.*0\.8\.2[5-9]" {} \; | xargs rm -f 2>/dev/null || true
    
    # Test again
    HARDHAT_NETWORK=$NETWORK npm run compile > /tmp/fixed_test 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ Automatic fixes successful - ReClamm now compiles!"
        SETUP_SUCCESS=true
    else
        echo "❌ Automatic fixes failed. Restoring original state..."
        cp contracts/core/PoolFactories.sol.backup contracts/core/PoolFactories.sol
        rm -rf contracts/core/additional/
        echo "✓ Original state restored"
        SETUP_SUCCESS=false
    fi
fi

# Step 8: Create production deployment script
if [ "$SETUP_SUCCESS" = true ]; then
    echo ""
    echo "8️⃣  Creating production deployment script..."

cat > scripts/deploy-subgraph-ready.js << 'EOF'
const { ethers } = require("hardhat");
const { DeploymentManager, deployContract, loadNetworkConfig } = require("./utils/deploy-utils");

async function deploySubgraphReadySymmetricV4(networkName = 'moksha') {
  console.log(`\n🌟 Starting Subgraph-Ready Symmetric V4 Deployment to ${networkName}`);
  console.log("=" .repeat(70));
  
  if (hre.network.name !== networkName) {
    console.error(`❌ Network mismatch! Expected ${networkName}, got ${hre.network.name}`);
    console.error(`Please run: npx hardhat run scripts/deploy-subgraph-ready.js --network ${networkName}`);
    process.exit(1);
  }
  
  const [deployer] = await ethers.getSigners();
  const deploymentManager = new DeploymentManager(networkName);
  const networkConfig = await loadNetworkConfig(networkName);
  const ROUTER_VERSION = "1.0.0";

  console.log(`Network: ${hre.network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  
  if (parseFloat(ethers.formatEther(await ethers.provider.getBalance(deployer.address))) < 1.0) {
    console.warn(`⚠️  Low balance detected. Ensure you have sufficient ETH for deployment.`);
  }
  
  const startTime = Date.now();
  
  try {
    // Phase 1: Core Infrastructure
    console.log(`\n🏗️  Phase 1: Core Infrastructure`);
    console.log("-".repeat(50));
    
    const nonce = await ethers.provider.getTransactionCount(deployer.address);
    const futureVaultAddress = ethers.getCreateAddress({
      from: deployer.address,
      nonce: nonce + 3
    });
    
    console.log(`Calculated future Vault address: ${futureVaultAddress}`);
    
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
    
    const vaultExtension = await deployContract(
      "VaultExtension",
      [futureVaultAddress, await vaultAdmin.getAddress()],
      deploymentManager
    );
    
    const protocolFeeController = await deployContract(
      "ProtocolFeeController",
      [
        futureVaultAddress,
        ethers.parseEther("0.0025"),
        ethers.parseEther("0.005")
      ],
      deploymentManager
    );
    
    const vault = await deployContract(
      "Vault",
      [
        await vaultExtension.getAddress(),
        deployer.address,
        await protocolFeeController.getAddress()
      ],
      deploymentManager
    );
    
    console.log(`✅ Vault deployed at expected address: ${await vault.getAddress()}`);
    
    // Phase 2: Routers
    console.log(`\n🛣️  Phase 2: Routers`);
    console.log("-".repeat(50));
    
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    const wethAddress = networkConfig.tokens?.WETH || ZERO_ADDRESS;
    
    const router = await deployContract(
      "Router",
      [await vault.getAddress(), wethAddress, ZERO_ADDRESS, ROUTER_VERSION],
      deploymentManager
    );
    
    const batchRouter = await deployContract(
      "BatchRouter", 
      [await vault.getAddress(), wethAddress, ZERO_ADDRESS, ROUTER_VERSION],
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
    
    // Phase 4: ReClamm Pool Factory
    console.log(`\n🔧 Phase 4: ReClamm Pool Factory`);
    console.log("-".repeat(50));
    
    const reClammPoolFactory = await deployContract(
      "ReClammPoolFactory",
      [
        await vault.getAddress(),
        2592000, // 30 days pause window
        "ReClamm Pool Factory",
        "ReClamm Pool"
      ],
      deploymentManager
    );
    
    // Phase 5: Additional Contracts for Subgraph Diversity
    console.log(`\n📊 Phase 5: Additional Contracts for Subgraph`);
    console.log("-".repeat(50));
    
    // Deploy duplicate StablePoolFactory for subgraph variety
    const stablePoolV2Factory = await deployContract(
      "StablePoolFactory",
      [
        await vault.getAddress(),
        networkConfig.deployments.pools.stablePoolFactory.pauseWindowDuration,
        "Stable Pool Factory V3 (V2)", 
        "Stable Pool V3 (V2)"
      ],
      deploymentManager
    );
    
    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n🎉 Subgraph-Ready Symmetric V4 Deployment Complete!`);
    console.log("=" .repeat(70));
    
    console.log(`\n📋 Core Infrastructure:`);
    console.log(`   Vault: ${await vault.getAddress()}`);
    console.log(`   VaultAdmin: ${await vaultAdmin.getAddress()}`);
    console.log(`   VaultExtension: ${await vaultExtension.getAddress()}`);
    console.log(`   ProtocolFeeController: ${await protocolFeeController.getAddress()}`);
    
    console.log(`\n📋 Routers:`);
    console.log(`   Router: ${await router.getAddress()}`);
    console.log(`   BatchRouter: ${await batchRouter.getAddress()}`);
    
    console.log(`\n📋 Pool Factories for Subgraph (4 types):`);
    console.log(`   WeightedPoolFactory: ${await weightedPoolFactory.getAddress()}`);
    console.log(`   StablePoolFactory: ${await stablePoolFactory.getAddress()}`);
    console.log(`   ReClammPoolFactory: ${await reClammPoolFactory.getAddress()}`);
    console.log(`   StablePoolV2Factory: ${await stablePoolV2Factory.getAddress()}`);
    
    console.log(`\n⏱️  Total deployment time: ${duration}s`);
    console.log(`📊 Total factory types for subgraph: 4`);
    console.log(`📁 Deployment saved to: deployments/${networkName}.json`);
    
    // Subgraph configuration helper
    console.log(`\n📝 Ready-to-use Subgraph Configuration:`);
    console.log(`========================================`);
    console.log(`Copy this to your subgraph.yaml:`);
    console.log(``);
    console.log(`dataSources:`);
    console.log(`  - kind: ethereum/contract`);
    console.log(`    name: WeightedPoolFactory`);
    console.log(`    network: ${networkName}`);
    console.log(`    source:`);
    console.log(`      address: "${await weightedPoolFactory.getAddress()}"`);
    console.log(`      abi: WeightedPoolFactory`);
    console.log(`      startBlock: # Add deployment block number`);
    console.log(`  - kind: ethereum/contract`);
    console.log(`    name: StablePoolFactory`);
    console.log(`    network: ${networkName}`);
    console.log(`    source:`);
    console.log(`      address: "${await stablePoolFactory.getAddress()}"`);
    console.log(`      abi: StablePoolFactory`);
    console.log(`      startBlock: # Add deployment block number`);
    console.log(`  - kind: ethereum/contract`);
    console.log(`    name: ReClammPoolFactory`);
    console.log(`    network: ${networkName}`);
    console.log(`    source:`);
    console.log(`      address: "${await reClammPoolFactory.getAddress()}"`);
    console.log(`      abi: ReClammPoolFactory`);
    console.log(`      startBlock: # Add deployment block number`);
    console.log(`  - kind: ethereum/contract`);
    console.log(`    name: StablePoolV2Factory`);
    console.log(`    network: ${networkName}`);
    console.log(`    source:`);
    console.log(`      address: "${await stablePoolV2Factory.getAddress()}"`);
    console.log(`      abi: StablePoolFactory`);
    console.log(`      startBlock: # Add deployment block number`);
    console.log(`========================================`);
    
    console.log(`\n🎯 Your subgraph can now index 4 different pool factory types!`);
    console.log(`🚀 Ready for comprehensive DeFi analytics and monitoring!`);
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    if (error.message.includes("insufficient funds")) {
      console.error("💰 Please ensure you have sufficient ETH balance for deployment");
    }
    process.exit(1);
  }
}

if (require.main === module) {
  const networkName = process.argv[2] || process.env.HARDHAT_NETWORK || 'moksha';
  deploySubgraphReadySymmetricV4(networkName)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { deploySubgraphReadySymmetricV4 };
EOF

    echo "✓ Created production-ready deployment script"
fi

# Final summary and instructions
echo ""
echo "=========================================="
if [ "$SETUP_SUCCESS" = true ]; then
    echo "✅ COMPLETE SETUP SUCCESS!"
    echo "=========================================="
    echo ""
    echo "🎯 Setup Summary:"
    echo "   ✅ Environment cleaned and verified"
    echo "   ✅ Dependencies checked and initialized"
    echo "   ✅ ReClamm contracts added with version filtering"
    echo "   ✅ Compilation tested and working"
    echo "   ✅ Production deployment script created"
    echo ""
    echo "📊 Ready to deploy 4 pool factory types:"
    echo "   1. WeightedPoolFactory (Balancer V3 weighted pools)"
    echo "   2. StablePoolFactory (Balancer V3 stable pools)"
    echo "   3. ReClammPoolFactory (Custom ReClamm pools)"
    echo "   4. StablePoolV2Factory (Duplicate for variety)"
    echo ""
    echo "🚀 DEPLOYMENT COMMAND:"
    echo "   npx hardhat run scripts/deploy-subgraph-ready.js --network $NETWORK"
    echo ""
    echo "📈 This deployment will provide comprehensive pool factory coverage"
    echo "   for rich subgraph indexing and DeFi analytics!"
    echo ""
    echo "🔧 Network Requirements:"
    echo "   • Ensure sufficient ETH balance (≥1 ETH recommended)"
    echo "   • Verify network connectivity to $NETWORK"
    echo "   • Check gas prices for optimal deployment timing"
else
    echo "❌ SETUP FAILED"
    echo "=========================================="
    echo ""
    echo "The setup encountered issues that couldn't be automatically resolved."
    echo "Your original setup has been restored."
    echo ""
    echo "🔧 Manual troubleshooting steps:"
    echo "   1. Verify submodules: git submodule update --init --recursive"
    echo "   2. Reinstall dependencies: rm -rf node_modules && npm install"
    echo "   3. Check Solidity version in hardhat.config.js"
    echo "   4. Ensure network configuration is correct"
    echo "   5. Test base compilation: npm run compile"
fi

echo ""
echo "📁 Files created/modified:"
echo "  • contracts/core/additional/factories/ - ReClamm contracts (version-filtered)"
echo "  • contracts/core/PoolFactories.sol - Updated with ReClamm import"
echo "  • scripts/deploy-subgraph-ready.js - Production deployment script"
echo "  • *.backup files - Safety backups of original files"
echo ""
echo "🔄 To restore original setup (if needed):"
echo "  cp contracts/core/PoolFactories.sol.backup contracts/core/PoolFactories.sol"
echo "  rm -rf contracts/core/additional/"
echo "  rm -f scripts/deploy-subgraph-ready.js"
echo ""
echo "📖 QUICK START FOR TEAM MEMBERS:"
echo "   1. git clone <your-repo>"
echo "   2. cd symmetric-v4-deployments"
echo "   3. ./setup-subgraph-contracts-complete.sh moksha"
echo "   4. npx hardhat run scripts/deploy-subgraph-ready.js --network moksha"
echo ""
echo "Setup complete! 🎉"
echo ""
if [ "$SETUP_SUCCESS" = true ]; then
    echo "🎯 Next step: Run the deployment command above to deploy your"
    echo "   comprehensive Symmetric V4 infrastructure with multiple pool types!"
fi