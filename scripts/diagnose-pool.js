// scripts/diagnose-pool.js
const { ethers } = require("hardhat");

async function main() {
  const routerAddress = "0xda5f9629a171b1D4d5EDBec5973A4F0A6e8c64ca";
  const poolAddress   = "0x7e19d5b14c7242f4d01e08236b5d378d380e43c7";

  // Lower-case, checksummed addresses
  const tokens = [
    "0xf8fb3713d459d7c1018bd0a49d19b4c44290ebe5", // LINK (18)
    "0x94a9d9ac8a22534e3faca9f4e7f2e2cf85d5e4c8"  // USDC (6)
  ];
  const decimals    = [18, 6];
  const humanAmts   = ["1000.0", "1000.0"];
  const amountsIn   = humanAmts.map((a,i) => ethers.parseUnits(a, decimals[i]));
  const minBptOut   = 0;
  const [signer]    = await ethers.getSigners();

  // Build the INIT userData
  const JoinKind    = 0;
  const abiCoder    = new ethers.AbiCoder();
  const userData    = abiCoder.encode(
    ["uint256","uint256[]"],
    [JoinKind, amountsIn]
  );

  // Use the built-in dry-run
  const RouterIface = [
    "function queryAddLiquidityCustom(address pool, uint256[] maxAmountsIn, uint256 minBptAmountOut, address sender, bytes userData) view returns (uint256[] amountsIn, uint256 bptOut, bytes returnData)"
  ];
  const router = new ethers.Contract(routerAddress, RouterIface, ethers.provider);

  console.log("▶️  Dry-run queryAddLiquidityCustom...");
  try {
    const [amtIn, bptOut, ret] = await router.callStatic.queryAddLiquidityCustom(
      poolAddress,
      amountsIn,
      minBptOut,
      signer.address,
      userData
    );
    console.log("✅ Dry-run success!", { amtIn, bptOut, ret });
  } catch (err) {
    console.error("❌ Dry-run reverted!");
    console.error(" Error data (hex):", err.data || err.error?.data);
    // Decode with the Vault’s custom errors
    const vaultErrors = new ethers.Interface([
      "error InputLengthMismatch(uint256 expected,uint256 actual)",
      "error SenderIsNotVault(address sender)",
      "error SwapDeadline()",
      "error AddressEmptyCode(address target)",
      "error FailedCall()",
      "error ReentrancyGuardReentrantCall()",
      "error InsufficientBalance(uint256 balance,uint256 needed)"
    ]);
    if (err.data || err.error?.data) {
      try {
        console.error(" Decoded:", vaultErrors.parseError(err.data || err.error.data));
      } catch {}
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
