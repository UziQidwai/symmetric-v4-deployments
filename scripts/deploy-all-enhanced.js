const { ethers } = require("hardhat");
const { DeploymentManager, deployContract, loadNetworkConfig } = require("./utils/deploy-utils");

async function deployCompleteSymmetricV4(networkName = 'moksha') {
  console.log(`\n🌟 Starting Complete Symmetric V4 (Balancer V3) Deployment to ${networkName}`);
  console.log("=" .repeat(70));
  
  const [deployer] = await ethers.getSigners();
  const deploymentManager = new DeploymentManager(networkName);
  const networkConfig = await loadNetworkConfig(networkName);
  const ROUTER_VERSION = "1.0.0";

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
