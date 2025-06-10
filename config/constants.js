const { ethers } = require("hardhat");

// Time constants
const WEEK = 7 * 24 * 60 * 60;
const MONTH = 30 * 24 * 60 * 60;

// Default deployment parameters
const DEFAULT_PAUSE_WINDOW_DURATION = 90 * 24 * 60 * 60; // 90 days
const DEFAULT_BUFFER_PERIOD_DURATION = 30 * 24 * 60 * 60; // 30 days

// Protocol fee constants
const MAX_YIELD_VALUE = ethers.parseEther("0.5"); // 50%
const MAX_AUM_VALUE = ethers.parseEther("0.5"); // 50%

// Pool constants
const DEFAULT_SWAP_FEE = ethers.parseEther("0.003"); // 0.3%
const MAX_SWAP_FEE = ethers.parseEther("0.1"); // 10%

// Zero address
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

module.exports = {
  WEEK,
  MONTH,
  DEFAULT_PAUSE_WINDOW_DURATION,
  DEFAULT_BUFFER_PERIOD_DURATION,
  MAX_YIELD_VALUE,
  MAX_AUM_VALUE,
  DEFAULT_SWAP_FEE,
  MAX_SWAP_FEE,
  ZERO_ADDRESS,
};
