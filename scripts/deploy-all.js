// scripts/deploy-all.js
// One-step orchestrator: runs your complete deployment script in a single call
// Usage: npx hardhat run scripts/deploy-all.js --network sepolia

const { execSync } = require('child_process');
const path = require('path');

async function main() {
  console.log('=== 🚀 Starting full Balancer V3 deployment workflow ===\n');

  // Path to your main deploy script
  const fullDeploy = path.join('scripts', 'deploy-complete.js');

  console.log(`--- ✨ Invoking full deploy: npx hardhat run ${fullDeploy} --network sepolia ---`);
  try {
    execSync(
      `npx hardhat run ${fullDeploy} --network sepolia`,
      { stdio: 'inherit' }
    );
    console.log('\n🎉 Full deployment complete! Your contracts and pool are live.');
  } catch (err) {
    console.error('❌ deploy-all.js encountered an error:');
    console.error(err);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ deploy-all.js unexpected error:', err);
  process.exit(1);
});
