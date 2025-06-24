const { ethers } = require("hardhat");
const { DeploymentManager, deployContract, loadNetworkConfig } = require("./utils/deploy-utils");

async function deployCompleteSubgraphSetup(networkName = 'moksha') {
  console.log(`\n🌟 Complete Subgraph-Ready Deployment to ${networkName}`);
  console.log("=" .repeat(60));
  
  if (hre.network.name !== networkName) {
    console.error(`❌ Network mismatch! Expected ${networkName}, got ${hre.network.name}`);
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
    // Phase 1: Core Infrastructure
    console.log(`\n🏗️  Phase 1: Core Infrastructure`);
    console.log("-".repeat(40));
    
    const nonce = await ethers.provider.getTransactionCount(deployer.address);
    const futureVaultAddress = ethers.getCreateAddress({
      from: deployer.address,
      nonce: nonce + 3
    });
    
    const vaultAdmin = await deployContract("VaultAdmin", [
      futureVaultAddress,
      networkConfig.deployments.vault.pauseWindowDuration,
      networkConfig.deployments.vault.bufferPeriodDuration,
      ethers.parseEther("0.000001"),
      ethers.parseEther("0.000001")
    ], deploymentManager);
    
    const vaultExtension = await deployContract("VaultExtension", [
      futureVaultAddress, await vaultAdmin.getAddress()
    ], deploymentManager);
    
    const protocolFeeController = await deployContract("ProtocolFeeController", [
      futureVaultAddress,
      ethers.parseEther("0.0025"),
      ethers.parseEther("0.005")
    ], deploymentManager);
    
    const vault = await deployContract("Vault", [
      await vaultExtension.getAddress(),
      deployer.address,
      await protocolFeeController.getAddress()
    ], deploymentManager);
    
    // Phase 2: Routers
    console.log(`\n🛣️  Phase 2: Routers`);
    console.log("-".repeat(40));
    
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    const wethAddress = networkConfig.tokens?.WETH || ZERO_ADDRESS;
    
    const router = await deployContract("Router", [
      await vault.getAddress(), wethAddress, ZERO_ADDRESS, ROUTER_VERSION
    ], deploymentManager);
    
    const batchRouter = await deployContract("BatchRouter", [
      await vault.getAddress(), wethAddress, ZERO_ADDRESS, ROUTER_VERSION
    ], deploymentManager);
    
    // Phase 3: Pool Factories
    console.log(`\n🏊 Phase 3: All Pool Factories`);
    console.log("-".repeat(40));
    
    // Core factories
    const weightedPoolFactory = await deployContract("WeightedPoolFactory", [
      await vault.getAddress(),
      networkConfig.deployments.pools.weightedPoolFactory.pauseWindowDuration,
      "Weighted Pool Factory V3",
      "Weighted Pool V3"
    ], deploymentManager);
    
    const stablePoolFactory = await deployContract("StablePoolFactory", [
      await vault.getAddress(),
      networkConfig.deployments.pools.stablePoolFactory.pauseWindowDuration,
      "Stable Pool Factory V3", 
      "Stable Pool V3"
    ], deploymentManager);
    
    // ReClamm factory
    const reClammPoolFactory = await deployContract("ReClammPoolFactory", [
      await vault.getAddress(),
      2592000,
      "ReClamm Pool Factory",
      "ReClamm Pool"
    ], deploymentManager);
    
    // Additional minimal factories
    const deployedFactories = [];
    
    const additionalFactories = [
      "Gyro2CLPPoolFactory",
      "GyroECLPPoolFactory", 
      "LBPoolFactory",
      "QuantAMMWeightedPoolFactory"
    ];
    
    for (const factoryName of additionalFactories) {
      try {
        const factory = await deployContract(factoryName, [
          await vault.getAddress(),
          2592000,
          "v1.0.0"
        ], deploymentManager);
        deployedFactories.push({name: factoryName, address: await factory.getAddress()});
      } catch (error) {
        console.warn(`⚠️  ${factoryName} deployment failed: ${error.message}`);
      }
    }
    
    // Duplicate StablePoolFactory
    const stablePoolV2Factory = await deployContract("StablePoolFactory", [
      await vault.getAddress(),
      networkConfig.deployments.pools.stablePoolFactory.pauseWindowDuration,
      "Stable Pool Factory V3 (V2)", 
      "Stable Pool V3 (V2)"
    ], deploymentManager);
    
    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const totalFactories = 3 + deployedFactories.length + 1; // Core + Additional + Duplicate
    
    console.log(`\n🎉 Complete Subgraph Setup Deployment Finished!`);
    console.log("=" .repeat(60));
    
    console.log(`\n📋 Core Infrastructure:`);
    console.log(`   Vault: ${await vault.getAddress()}`);
    console.log(`   VaultAdmin: ${await vaultAdmin.getAddress()}`);
    console.log(`   VaultExtension: ${await vaultExtension.getAddress()}`);
    console.log(`   ProtocolFeeController: ${await protocolFeeController.getAddress()}`);
    
    console.log(`\n📋 Routers:`);
    console.log(`   Router: ${await router.getAddress()}`);
    console.log(`   BatchRouter: ${await batchRouter.getAddress()}`);
    
    console.log(`\n📋 All Pool Factories for Subgraph (${totalFactories} types):`);
    console.log(`   WeightedPoolFactory: ${await weightedPoolFactory.getAddress()}`);
    console.log(`   StablePoolFactory: ${await stablePoolFactory.getAddress()}`);
    console.log(`   ReClammPoolFactory: ${await reClammPoolFactory.getAddress()}`);
    
    deployedFactories.forEach(factory => {
      console.log(`   ${factory.name}: ${factory.address}`);
    });
    
    console.log(`   StablePoolV2Factory: ${await stablePoolV2Factory.getAddress()}`);
    
    console.log(`\n⏱️  Total deployment time: ${duration}s`);
    console.log(`📊 Total factory types: ${totalFactories}`);
    
    console.log(`\n📝 READY-TO-USE SUBGRAPH CONFIGURATION:`);
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
    console.log(`  - kind: ethereum/contract`);
    console.log(`    name: StablePoolFactory`);
    console.log(`    network: ${networkName}`);
    console.log(`    source:`);
    console.log(`      address: "${await stablePoolFactory.getAddress()}"`);
    console.log(`      abi: StablePoolFactory`);
    console.log(`  - kind: ethereum/contract`);
    console.log(`    name: ReClammPoolFactory`);
    console.log(`    network: ${networkName}`);
    console.log(`    source:`);
    console.log(`      address: "${await reClammPoolFactory.getAddress()}"`);
    console.log(`      abi: ReClammPoolFactory`);
    
    deployedFactories.forEach(factory => {
      console.log(`  - kind: ethereum/contract`);
      console.log(`    name: ${factory.name}`);
      console.log(`    network: ${networkName}`);
      console.log(`    source:`);
      console.log(`      address: "${factory.address}"`);
      console.log(`      abi: ${factory.name}`);
    });
    
    console.log(`  - kind: ethereum/contract`);
    console.log(`    name: StablePoolV2Factory`);
    console.log(`    network: ${networkName}`);
    console.log(`    source:`);
    console.log(`      address: "${await stablePoolV2Factory.getAddress()}"`);
    console.log(`      abi: StablePoolFactory`);
    console.log(`========================================`);
    
    console.log(`\n🎯 SUCCESS! Complete ${totalFactories}-factory subgraph-ready deployment!`);
    console.log(`🚀 Your infrastructure is ready for comprehensive DeFi analytics!`);
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  const networkName = process.argv[2] || process.env.HARDHAT_NETWORK || 'moksha';
  deployCompleteSubgraphSetup(networkName)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { deployCompleteSubgraphSetup };
