/**
 * scripts/verify-all.js
 *
 * Batch‑verifies every contract that was deployed by `scripts/deploy-all.js`
 * to the Moksha explorer (https://moksha.vanascan.io).
 *
 * Prerequisites
 * -------------
 * 1. Add `MOKSHA_ETHERSCAN_API_KEY` to your .env file or export it in the shell.
 * 2. Ensure deployments/<network>.json exists (it is written automatically
 *    by DeploymentManager.saveDeployments()).
 *
 * Usage
 * -----
 * $ npx hardhat run scripts/verify-all.js --network moksha
 *
 * The script can be invoked against mainnet as well – just change --network.
 */
const hre  = require("hardhat");
const fs   = require("fs");
const path = require("path");

/**
 * Reads deployments/<network>.json that is produced by DeploymentManager.
 * The JSON shape is:
 * {
 *   "timestamp": "...",
 *   "contracts": {
 *      "ContractName": {
 *          "address": "0x…",
 *          "constructorArgs": [ ... ],
 *          "txHash": "0x…"
 *      },
 *      …
 *   }
 * }
 */
function loadDeployments(network) {
  const file = path.join(__dirname, `../deployments/${network}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(
      `Deployment file not found: ${file}\n` +
      `⇢ Make sure you have run deploy-all.js on the '${network}' network first.`
    );
  }
  return JSON.parse(fs.readFileSync(file, "utf8")).contracts || {};
}

async function verify(name, address, args) {
  try {
    console.log(`🔍  Verifying ${name} at ${address}`);
    await hre.run("verify:verify", {
      address,
      constructorArguments: args,
    });

    console.log(`✅  ${name} verified`);
  } catch (err) {
    const msg = (err.message || "").toLowerCase();
    if (msg.includes("already verified")) {
      console.log(`ℹ️  ${name} already verified – skipping`);
    } else {
      console.warn(`⚠️  Verification failed for ${name}: ${err.message}`);
    }
  }
}

async function main() {
  const network = hre.network.name;
  const deployments = loadDeployments(network);

  const names = Object.keys(deployments);
  if (!names.length) {
    console.log(`No contracts found in deployments/${network}.json`);
    return;
  }

  // Verify sequentially to avoid hitting explorer rate‑limits.
  for (const name of names) {
    const { address, constructorArgs = [] } = deployments[name];
    await verify(name, address, constructorArgs);
  }
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
