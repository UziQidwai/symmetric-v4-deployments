const { ethers } = require("hardhat");

async function main() {
  const factory = await ethers.getContractAt(
    "WeightedPoolFactory",
    "0xa60347793e42E4E56cDa1E0BB77FA9A7A7696ACD"
  );
  
  const tokens = [
    ["0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8", 0, "0x0000000000000000000000000000000000000000", false],
    ["0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5", 0, "0x0000000000000000000000000000000000000000", false]
  ];
  
  const tx = await factory.create(
    "My Weighted Pool",
    "MWP",
    tokens,
    ["500000000000000000", "500000000000000000"],
    [
      "0x42337f97626A10bea84bB5cCF1e884F550228833",
      "0x42337f97626A10bea84bB5cCF1e884F550228833", 
      "0x0000000000000000000000000000000000000000"
    ],
    "1000000000000000",
    "0x0000000000000000000000000000000000000000",
    false,
    false,
    "0x0000000000000000000000000000000000000000000000000000000000000000"
  );
  
  console.log("Pool creation tx:", tx.hash);
  const receipt = await tx.wait();
  console.log("Pool created successfully!");
  console.log("Pool address:", receipt.contractAddress);
}

main().catch(console.error);
