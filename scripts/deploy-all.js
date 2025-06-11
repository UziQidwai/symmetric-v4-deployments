const { ethers } = require("hardhat");
const { DeploymentManager, deployContract, loadNetworkConfig } = require("./utils/deploy-utils");

async function deployCompleteSymmetricV4(networkName = 'moksha') {
  console.log(`\n🌟 Starting Complete Symmetric V4 (Balancer V3) Deployment to ${networkName}`);
  console.log("=" .repeat(70));
  
  const [deployer] = await ethers.getSigners();
  const deploymentManager = new DeploymentManager(networkName);
  const networkConfig = await loadNetworkConfig(networkName);
  
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  
  const startTime = Date.now();
  
  try {
    console.log(`\n🏗️  Phase 1: Solving Circular Dependencies with CREATE2`);
    console.log("-".repeat(50));
    
    // We need to calculate addresses ahead of time or use a different approach
    // Let's try deploying the minimal contracts first
    
    console.log("\n📄 Step 1: Deploy VaultAdmin first (it needs a Vault address)");
    
    // We'll use a deployment factory pattern or deploy with known addresses
    // For now, let's try deploying everything with deterministic addresses
    
    // Get deployer nonce to calculate future addresses
    const nonce = await ethers.provider.getTransactionCount(deployer.address);
    console.log(`Deployer nonce: ${nonce}`);
    
    // Calculate what the Vault address will be (it will be deployed at nonce + 1)
    const futureVaultAddress = ethers.getCreateAddress({
      from: deployer.address,
      nonce: nonce + 1  // Vault will be deployed second
    });
    
    console.log(`Calculated future Vault address: ${futureVaultAddress}`);
    
    // Step 1: Deploy VaultAdmin with future Vault address
    const vaultAdmin = await deployContract(
      "VaultAdmin",
      [
        futureVaultAddress, // mainVault - calculated address
        networkConfig.deployments.vault.pauseWindowDuration,
        networkConfig.deployments.vault.bufferPeriodDuration,
        ethers.parseEther("0.000001"), // minTradeAmount
        ethers.parseEther("0.000001")  // minWrapAmount
      ],
      deploymentManager
    );
    
    // Step 2: Deploy VaultExtension with future Vault address and real VaultAdmin
    const vaultExtension = await deployContract(
      "VaultExtension",
      [
        futureVaultAddress, // mainVault - calculated address
        await vaultAdmin.getAddress() // vaultAdmin - real address
      ],
      deploymentManager
    );
    
    // Step 3: Deploy ProtocolFeeController with future Vault address
    const protocolFeeController = await deployContract(
      "ProtocolFeeController",
      [
        futureVaultAddress, // vault - calculated address
        ethers.parseEther("0.0025"), // initialGlobalSwapFeePercentage
        ethers.parseEther("0.005")   // initialGlobalYieldFeePercentage
      ],
      deploymentManager
    );
    
    // Step 4: Now deploy Vault with real addresses (should be at calculated address)
    const vault = await deployContract(
      "Vault",
      [
        await vaultExtension.getAddress(), // vaultExtension - real address
        deployer.address, // authorizer - you as admin
        await protocolFeeController.getAddress() // protocolFeeController - real address
      ],
      deploymentManager
    );
    
    // Verify the address calculation was correct
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
      [await vault.getAddress(), wethAddress, permit2Address],
      deploymentManager
    );
    
    const batchRouter = await deployContract(
      "BatchRouter", 
      [await vault.getAddress(), wethAddress, permit2Address],
      deploymentManager
    );
    
    // Phase 3: Pool Factories
    console.log(`\n🏊 Phase 3: Pool Factories`);
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
    
    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n🎉 Symmetric V4 Deployment Complete!`);
    console.log("=" .repeat(70));
    
    const deployments = deploymentManager.getAllContracts();
    Object.entries(deployments).forEach(([name, deployment]) => {
      console.log(`   ${name}: ${deployment.address}`);
    });
    
    console.log(`\n⏱️  Total deployment time: ${duration}s`);
    console.log(`📁 Full deployment saved to: deployments/${networkName}.json`);
    console.log(`🌐 Network: ${networkConfig.name} (Chain ID: ${networkConfig.chainId})`);
    console.log(`🔍 Explorer: ${networkConfig.explorer}`);
    console.log(`\n👑 You are the admin/authorizer with full protocol control!`);
    
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