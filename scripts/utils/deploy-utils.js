const fs = require('fs');
const path = require('path');

class DeploymentManager {
  constructor(network) {
    this.network = network;
    this.deploymentPath = path.join(__dirname, '../../deployments', `${network}.json`);
    this.deployments = this.loadDeployments();
  }

  loadDeployments() {
    if (fs.existsSync(this.deploymentPath)) {
      return JSON.parse(fs.readFileSync(this.deploymentPath, 'utf8'));
    }
    return {
      network: this.network,
      contracts: {},
      timestamp: new Date().toISOString()
    };
  }

  saveDeployments() {
    const dir = path.dirname(this.deploymentPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    this.deployments.timestamp = new Date().toISOString();
    fs.writeFileSync(this.deploymentPath, JSON.stringify(this.deployments, null, 2));
  }

  addContract(name, address, constructorArgs = [], txHash = null) {
    this.deployments.contracts[name] = {
      address,
      constructorArgs,
      txHash,
      timestamp: new Date().toISOString()
    };
    this.saveDeployments();
    console.log(`✅ ${name} deployed to: ${address}`);
  }

  getContract(name) {
    return this.deployments.contracts[name];
  }

  hasContract(name) {
    return this.deployments.contracts[name] !== undefined;
  }

  getAllContracts() {
    return this.deployments.contracts;
  }
}

async function deployContract(contractName, constructorArgs = [], deploymentManager = null) {
  console.log(`\n📄 Deploying ${contractName}...`);
  
  const ContractFactory = await ethers.getContractFactory(contractName);
  const contract = await ContractFactory.deploy(...constructorArgs);
  
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  const txHash = contract.deploymentTransaction().hash;
  
  if (deploymentManager) {
    deploymentManager.addContract(contractName, address, constructorArgs, txHash);
  }
  
  console.log(`   Address: ${address}`);
  console.log(`   TX Hash: ${txHash}`);
  
  return contract;
}

async function loadNetworkConfig(networkName) {
  const configPath = path.join(__dirname, '../../config/networks', `${networkName}.json`);
  if (!fs.existsSync(configPath)) {
    throw new Error(`Network config not found: ${configPath}`);
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  DeploymentManager,
  deployContract,
  loadNetworkConfig,
  delay
};
