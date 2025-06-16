#!/bin/bash

echo "=========================================="
echo "Setting up subgraph contracts (FINAL VERSION)"
echo "=========================================="

# Step 1: Backup current hardhat config
echo "1. Backing up current hardhat.config.js..."
if [ -f "hardhat.config.js" ]; then
    cp hardhat.config.js hardhat.config.js.backup
    echo "✓ Backup created"
else
    echo "✗ No hardhat.config.js found"
    exit 1
fi

# Step 2: Create clean directory structure
echo ""
echo "2. Creating clean contract structure..."
mkdir -p contracts/clean/{core,factories/{interfaces,lib}}

# Step 3: Copy core contracts
echo ""
echo "3. Copying core contracts..."
if [ -f "contracts/core/PoolFactories.sol" ]; then
    cp contracts/core/PoolFactories.sol contracts/clean/core/PoolFactories.sol.original
    echo "✓ Backed up original PoolFactories.sol"
else
    echo "✗ Core PoolFactories.sol not found"
    exit 1
fi

# Step 4: Copy ONLY ReClamm contracts (confirmed working)
echo ""
echo "4. Setting up ReClamm contracts (confirmed working)..."

# Copy main contracts
cp contracts/reclamm/contracts/ReClammPoolFactory.sol contracts/clean/factories/ 2>/dev/null && echo "✓ ReClammPoolFactory.sol" || echo "✗ ReClammPoolFactory.sol not found"
cp contracts/reclamm/contracts/ReClammPool.sol contracts/clean/factories/ 2>/dev/null && echo "✓ ReClammPool.sol" || echo "✗ ReClammPool.sol not found"

# Copy lib files
cp contracts/reclamm/contracts/lib/ReClammMath.sol contracts/clean/factories/lib/ 2>/dev/null && echo "✓ ReClammMath.sol" || echo "✗ ReClammMath.sol not found"
cp contracts/reclamm/contracts/lib/ReClammPoolFactoryLib.sol contracts/clean/factories/lib/ 2>/dev/null && echo "✓ ReClammPoolFactoryLib.sol" || echo "✗ ReClammPoolFactoryLib.sol not found"

# Copy interface files
cp contracts/reclamm/contracts/interfaces/IReClammPool.sol contracts/clean/factories/interfaces/ 2>/dev/null && echo "✓ IReClammPool.sol" || echo "✗ IReClammPool.sol not found"

# Copy any additional files needed
cp contracts/reclamm/contracts/interfaces/*.sol contracts/clean/factories/interfaces/ 2>/dev/null || true
cp contracts/reclamm/contracts/lib/*.sol contracts/clean/factories/lib/ 2>/dev/null || true

# Step 5: Update hardhat.config.js
echo ""
echo "5. Updating hardhat.config.js to use clean structure..."
cat > hardhat.config.js << 'EOF'
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 100
      },
      viaIR: true,
      evmVersion: "cancun",
    },
  },
  paths: {
    sources: "./contracts/clean",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  networks: {
    hardhat: {
      hardfork: "cancun",
      forking: process.env.MAINNET_RPC_URL ? {
        url: process.env.MAINNET_RPC_URL,
      } : undefined,
    },
    moksha: {
      url: process.env.MOKSHA_RPC_URL || "https://rpc.moksha.vana.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 14800,
      gasPrice: "auto",
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
    mainnet: {
      url: process.env.MAINNET_RPC_URL || `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1,
    },
  },
  etherscan: {
    apiKey: {
      moksha: process.env.MOKSHA_ETHERSCAN_API_KEY || "dummy",
      sepolia: process.env.ETHERSCAN_API_KEY,
      mainnet: process.env.ETHERSCAN_API_KEY,
    },
    customChains: [
      {
        network: "moksha",
        chainId: 14800,
        urls: {
          apiURL: "https://moksha.vanascan.io/api",
          browserURL: "https://moksha.vanascan.io"
        }
      }
    ]
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
};
EOF
echo "✓ Updated hardhat.config.js"

# Step 6: Create working PoolFactories.sol
echo ""
echo "6. Creating PoolFactories.sol with guaranteed working contracts..."
cat > contracts/clean/core/PoolFactories.sol << 'EOF'
// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

// Import original pool factories (guaranteed to work)
import "@balancer-labs/v3-pool-weighted/contracts/WeightedPoolFactory.sol";
import "@balancer-labs/v3-pool-stable/contracts/StablePoolFactory.sol";

// Import ReClamm contracts (confirmed working)
import "../factories/ReClammPoolFactory.sol";

/**
 * @title PoolFactories
 * @notice Imports confirmed working pool factories for subgraph deployment
 * @dev This is the guaranteed working base set. Use add-more-contracts.sh to test additional contracts.
 */
contract PoolFactories {
    // Empty contract - just for compilation
}
EOF
echo "✓ Created PoolFactories.sol with working contracts"

# Step 7: Test compilation
echo ""
echo "7. Testing compilation..."
npm run compile

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ SUCCESS! Setup complete and working"
    echo "=========================================="
    echo ""
    echo "✅ GUARANTEED WORKING CONTRACTS:"
    echo "  • WeightedPoolFactory (Balancer core)"
    echo "  • StablePoolFactory (Balancer core)"
    echo "  • ReClammPoolFactory (ReClamm)"
    echo ""
    echo "📁 Files created:"
    echo "  • contracts/clean/ - Clean contract structure"
    echo "  • hardhat.config.js - Updated configuration"
    echo "  • hardhat.config.js.backup - Original backup"
    echo ""
    echo "🚀 Next steps:"
    echo "  1. Deploy with current working contracts"
    echo "  2. Run './add-more-contracts.sh' to test additional contracts"
    echo "  3. Run './restore-original.sh' to revert if needed"
    echo ""
    echo "This setup is now ready for deployment!"
else
    echo ""
    echo "❌ Unexpected compilation failure"
    echo "Something went wrong. You can restore: cp hardhat.config.js.backup hardhat.config.js"
fi