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
    // Use our core contracts directory, NOT the entire symmetric-v4/pkg
    sources: "./contracts/core",
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
    vana: {
      url: process.env.VANA_RPC_URL || `https://rpc.vana.org`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1480,
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
    swellchain: {
      url: process.env.SWELLCHAIN_RPC_URL || `https://swell-mainnet.alt.technology`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1923,
    },
    swellchain_testnet: {
      url: process.env.SWELLCHAIN_TESTNET_RPC_URL || `https://swell-testnet.alt.technology`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1924,
    },
  },
  etherscan: {
    apiKey: {
      moksha: process.env.MOKSHA_ETHERSCAN_API_KEY || "dummy",
      vana: process.env.ETHERSCAN_API_KEY || "dummy",
      sepolia: process.env.ETHERSCAN_API_KEY,
      mainnet: process.env.ETHERSCAN_API_KEY,
      
      swellchain: process.env.SWELLCHAIN_ETHERSCAN_API_KEY || "dummy",
      swellchain_testnet: process.env.SWELLCHAIN_TESTNET_ETHERSCAN_API_KEY || "dummy",
    },
    customChains: [
      {
        network: "moksha",
        chainId: 14800,
        urls: {
          apiURL: "https://moksha.vanascan.io/api",
          browserURL: "https://moksha.vanascan.io"
        }
      },
      {
        network: "vana",
        chainId: 1480,
        urls: {
          apiURL: "https://rpc.vana.org",
          browserURL: "https://vanascan.io"
        }
      },
      {
        network: "swellchain",
        chainId: 1923,
        urls: {
          // SwellChain uses Etherscan-compatible API at swellchainscan.io
          apiURL: "https://swellchainscan.io/api",
          browserURL: "https://swellchainscan.io"
        }
      },
      {
        network: "swellchain_testnet",
        chainId: 1924,
        urls: {
          // SwellChain testnet also uses Etherscan-compatible API
          apiURL: "https://sepolia.swellchainscan.io/api",
          browserURL: "https://sepolia.swellchainscan.io"
        }
      }
    ]
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
};