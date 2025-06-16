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
    
    // Deploy core contracts
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
      [
        futureVaultAddress,
        await vaultAdmin.getAddress()
      ],
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
    const wethAddress = networkConfig.tokens?.WETH || ZERO_ADDRESS;
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
    
    // Phase 4: Additional Pool Factories for Subgraph
    console.log(`\n🔧 Phase 4: Additional Pool Factories for Subgraph`);
    console.log("-".repeat(50));
    
    const additionalFactories = [];
    
    // Helper function to deploy additional factories
    async function deployAdditionalFactory(contractName, displayName, args) {
      try {
        console.log(`Deploying ${displayName}...`);
        const factory = await deployContract(contractName, args, deploymentManager);
        console.log(`✅ ${displayName} deployed at: ${await factory.getAddress()}`);
        additionalFactories.push(contractName);
        return factory;
      } catch (error) {
        console.warn(`⚠️  ${displayName} deployment failed: ${error.message}`);
        console.warn(`   Continuing with other contracts...`);
        return null;
      }
    }
    
    // Deploy all available additional factories
    await deployAdditionalFactory(
      "ReClammPoolFactory",
      "ReClammPoolFactory",
      [
        await vault.getAddress(),
        networkConfig.deployments.pools?.reClammPoolFactory?.pauseWindowDuration || 2592000,
        "ReClamm Pool Factory",
        "ReClamm Pool"
      ]
    );
    
    await deployAdditionalFactory(
      "Gyro2CLPPoolFactory",
      "Gyro2CLPPoolFactory",
      [
        await vault.getAddress(),
        networkConfig.deployments.pools?.gyro2CLPPoolFactory?.pauseWindowDuration || 2592000,
        "Gyro 2CLP Pool Factory",
        "Gyro 2CLP Pool"
      ]
    );
    
    await deployAdditionalFactory(
      "GyroECLPPoolFactory", 
      "GyroECLPPoolFactory",
      [
        await vault.getAddress(),
        networkConfig.deployments.pools?.gyroECLPPoolFactory?.pauseWindowDuration || 2592000,
        "Gyro ECLP Pool Factory", 
        "Gyro ECLP Pool"
      ]
    );
    
    await deployAdditionalFactory(
      "LBPoolFactory",
      "LBPoolFactory", 
      [
        await vault.getAddress(),
        networkConfig.deployments.pools?.lbPoolFactory?.pauseWindowDuration || 2592000,
        "LB Pool Factory",
        "LB Pool"
      ]
    );
    
    await deployAdditionalFactory(
      "QuantAMMWeightedPoolFactory",
      "QuantAMMWeightedPoolFactory",
      [
        await vault.getAddress(),
        networkConfig.deployments.pools?.quantAMMWeightedPoolFactory?.pauseWindowDuration || 2592000,
        "QuantAMM Weighted Pool Factory",
        "QuantAMM Weighted Pool"
      ]
    );
    
    // Deploy duplicate factories for subgraph
    await deployAdditionalFactory(
      "StablePoolFactory",
      "StablePoolV2Factory (duplicate)",
      [
        await vault.getAddress(),
        networkConfig.deployments.pools.stablePoolFactory.pauseWindowDuration,
        "Stable Pool Factory V3 (V2)", 
        "Stable Pool V3 (V2)"
      ]
    );
    
    // Phase 5: Hooks
    console.log(`\n🪝 Phase 5: Hooks for Subgraph`);
    console.log("-".repeat(50));
    
    const additionalHooks = [];
    
    // Deploy hooks
    async function deployHook(contractName, displayName, args) {
      try {
        console.log(`Deploying ${displayName}...`);
        const hook = await deployContract(contractName, args, deploymentManager);
        console.log(`✅ ${displayName} deployed at: ${await hook.getAddress()}`);
        additionalHooks.push(contractName);
        return hook;
      } catch (error) {
        console.warn(`⚠️  ${displayName} deployment failed: ${error.message}`);
        console.warn(`   Continuing with other contracts...`);
        return null;
      }
    }
    
    await deployHook(
      "StableSurgeHook",
      "StableSurgeHook",
      [await vault.getAddress()]
    );
    
    await deployHook(
      "StableSurgeHookV2",
      "StableSurgeHookV2 (duplicate)", 
      [await vault.getAddress()]
    );
    
    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n🎉 Complete Symmetric V4 Deployment Finished!`);
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
    
    console.log(`\n📋 Core Pool Factories:`);
    const coreFactories = ['WeightedPoolFactory', 'StablePoolFactory'];
    coreFactories.forEach(name => {
      if (deployments[name]) {
        console.log(`   ${name}: ${deployments[name].address}`);
      }
    });
    
    console.log(`\n📋 Additional Pool Factories:`);
    const additionalFactoryNames = [
      'ReClammPoolFactory', 'Gyro2CLPPoolFactory', 'GyroECLPPoolFactory', 
      'LBPoolFactory', 'QuantAMMWeightedPoolFactory', 'StablePoolV2Factory'
    ];
    additionalFactoryNames.forEach(name => {
      if (deployments[name]) {
        console.log(`   ${name}: ${deployments[name].address}`);
      }
    });
    
    console.log(`\n📋 Hooks:`);
    const hookNames = ['StableSurgeHook', 'StableSurgeHookV2'];
    hookNames.forEach(name => {
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
    const allSuccessfulContracts = [...coreFactories, ...additionalFactories, ...additionalHooks];
    console.log(`\n📊 Subgraph Ready Contracts:`);
    console.log(`   ✅ Successfully deployed: ${allSuccessfulContracts.length} contracts`);
    console.log(`   📝 Available for subgraph: ${allSuccessfulContracts.join(', ')}`);
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
