// scripts/add-liquidity.js
const { ethers } = require("hardhat");

async function main() {
  // ◀ EDIT THESE ▼
  const routerAddress = "0xda5f9629a171b1D4d5EDBec5973A4F0A6e8c64ca";
  const poolAddress   = "0x7e19d5b14c7242f4d01e08236b5d378d380e43c7";

  // token addresses + decimals
  const tokens   = [
    "0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5", // LINK (18)
    "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8"  // USDC (6)
  ];
  const decimals = [18, 6];

  // how much you want to add (human-readably)
  const humanAmounts = ["1000.0", "1000.0"];
  // ▶️ FIXED: use ethers.parseUnits in v6
  const amountsIn = humanAmounts.map((amt, i) =>
    ethers.parseUnits(amt, decimals[i])
  );

  const minBptAmountOut = 0;
  const wethIsEth       = false;
  const userData        = "0x";

  const [signer] = await ethers.getSigners();
  console.log("▶️  Adding liquidity with", signer.address);

  // 1) Approve
  const erc20Abi = ["function approve(address spender, uint256 amount) external returns (bool)"];
  for (let i = 0; i < tokens.length; i++) {
    const token = new ethers.Contract(tokens[i], erc20Abi, signer);
    console.log(`   Approving ${humanAmounts[i]} (decimals ${decimals[i]})…`);
    await (await token.approve(routerAddress, amountsIn[i])).wait();
  }

  // 2) Add liquidity
  const routerAbi = [
    "function addLiquidityUnbalanced(address pool, uint256[] exactAmountsIn, uint256 minBptAmountOut, bool wethIsEth, bytes userData) payable returns (uint256)"
  ];
  const router = new ethers.Contract(routerAddress, routerAbi, signer);

  console.log("▶️  Calling addLiquidityUnbalanced()…");
  const tx = await router.addLiquidityUnbalanced(
    poolAddress,
    amountsIn,
    minBptAmountOut,
    wethIsEth,
    userData,
    { gasLimit: 600_000 }
  );
  console.log("   tx hash:", tx.hash);
  const receipt = await tx.wait();

  // parse returned BPT
  const bptOut = receipt.logs[receipt.logs.length - 1].data; 
  console.log("✅ Liquidity added; raw BPT out:", bptOut);
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ error:", err);
    process.exit(1);
  });
