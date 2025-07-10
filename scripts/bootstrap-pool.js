// scripts/bootstrap-pool.js
const { ethers } = require("hardhat");

async function main() {
  console.log("\n=== Phase 6: Bootstrap Pool (INIT-join) ===\n");

  // ── CONFIG ──
  const routerAddress = "0xc456DC2f222BB0ff32a76f2bea3Be8faB4dAA7C9";
  const poolAddress   = "0x7e19d5b14c7242f4d01e08236b5d378d380e43c7";

  // tokens must be sorted ascending by address
  const tokens       = [
    "0x94a9d9ac8a22534e3faca9f4e7f2e2cf85d5e4c8", // USDC (6)
    "0xf8fb3713d459d7c1018bd0a49d19b4c44290ebe5"  // LINK (18)
  ];
  const decimals     = [6, 18];
  const humanAmounts = ["1000.0", "1000.0"];

  console.log("Router:     ", routerAddress);
  console.log("Pool:       ", poolAddress);
  console.log("Tokens:     ", tokens);
  console.log("Decimals:   ", decimals);
  console.log("Amounts:    ", humanAmounts);

  // 1) parse units
  const amountsIn = humanAmounts.map((amt, i) =>
    ethers.parseUnits(amt, decimals[i])
  );
  console.log("Parsed amountsIn:", amountsIn.map(a => a.toString()));

  // 2) encode userData for INIT join (kind = 0)
  const INIT_KIND = 0;
  const abiCoder  = new ethers.AbiCoder();
  const userData  = abiCoder.encode(
    ["uint256","uint256[]"],
    [INIT_KIND, amountsIn]
  );
  console.log("Encoded userData:", userData);

  // 3) Approvals
  console.log("\nStep 1: Approvals");
  const [signer] = await ethers.getSigners();
  const erc20Abi = ["function approve(address,uint256) external"];
  for (let i = 0; i < tokens.length; i++) {
    const token = new ethers.Contract(tokens[i], erc20Abi, signer);
    console.log(`  Approving ${humanAmounts[i]} → ${tokens[i]}…`);
    await (await token.approve(routerAddress, amountsIn[i])).wait();
    console.log("   ✔ approved");
  }

  // 4) Dry-run
  console.log("\nStep 2: Dry-run initialize.staticCall()");
  const routerAbi = [
    "function initialize(address,address[],uint256[],uint256,bool,bytes) payable returns (uint256)"
  ];
  const router = await ethers.getContractAt(routerAbi, routerAddress);
  try {
    const result = await router.initialize.staticCall(
      poolAddress,
      tokens,
      amountsIn,
      0,      // minBPT
      false,  // wethIsEth
      userData
    );
    console.log("✅ Dry-run returned BPT out =", result.toString());
  } catch (err) {
    console.error("❌ Dry-run failed:", err);
    process.exit(1);
  }

  // 5) On-chain initialize
  console.log("\nStep 3: Sending initialize() on-chain…");
  const tx = await router
    .connect(signer)
    .initialize(poolAddress, tokens, amountsIn, 0, false, userData, {
      gasLimit: 600_000
    });
  console.log("   tx hash:", tx.hash);
  await tx.wait();
  console.log("✅ Pool initialized!");

  console.log("\n✔ Phase 6 Complete. Your pool is live.\n");
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ bootstrap-pool.js error:", err);
    process.exit(1);
  });
