# symmetric-v4-deployments

## Build and Deploy
Steps to run. Tested using Node v20.x

Clone repo with --recursive flag since the repo includes the Symmetric-v4-monorepo contract repo.

```
git clone --recursive git@github.com:centfinance/symmetric-v4-deployments.git
```

Install dependencies.

```
npm install
```

Create a .env file, remembering to then edit the file with your private key.
```
cp .env.example .env
```

Setup symbolic links to allow us to use the Balancer package but mapping back to the Symmetric-v4-monorepo.

```
./setup-symlinks.sh
```

Copy additional contracts.

```
HARDHAT_NETWORK=moksha
./setup-subgraph-contracts.sh moksha
```

## Verify deployed contracts

Verify deployed contracts using the verify-all.js script.

```
npx hardhat run scripts/verify-all.js --network moksha
```

Note however that we are deploying contracts with the following compiler settings:

* Solidity 0.8.24
* viaIR: true (needed to squeeze two large contracts under the 24 576-byte Spurious Dragon limit)
* evmVersion: cancun (TLOAD / TSTORE enabled)

This requires the verification image to support IR + Cancún byte-code, which Blockscout added IR + Cancún support in May 2025:

* smart-contract-verifier v1.10.0 (tagged v1.0.22-ir-cancun)
* Bundled from explorer tag blockscout/blockscout:v5.1.1-maker onward (any v5.1.2 or v6.x also fine).

Therefore this script is included for when IR + Cancún support is rolled out to the Moksha (and mainnet) Blockscout stack.

## Deployed contracts

🔍 Moksha

  * VaultAdmin: 0x754d6578811b545e9F42e11d11fbfe6e05e6Db71
  * VaultExtension: 0x0674C9224B31D366BDfF0B3bF318BfD3118B9BF1
  * ProtocolFeeController: 0x11bb04A44e88Bb950b6b8c64396a5D3F5fD291A0
  * Vault: 0xA8575572f108C57F70Ad5A42dc1d457dd678C34f
  * Router: 0xe7c8b113C383660b695198080A1dee2e965ce4cc
  * BatchRouter: 0x6EE44Db8e24D8Cd1416fbEEe44506AECe9Bbe5d4
  * WeightedPoolFactory: 0xC889F43501DDf3Bd30a3821C3B40123ac64fD797
  * StablePoolFactory: 0xb8Cb89074BF463F7B4d70ED2aCA1277EC9e6107e
  * ReClammPoolFactory: 0x18edcEF2A786253DA2252E1B151fD3Efb26B5906
  * Gyro2CLPPoolFactory: 0x43b9C153649755C9b54f6FFAaF889FB49daFe904
  * GyroECLPPoolFactory: 0xB4a1C3888Afc187Ea198632851ea5B3308fD8e68
  * LBPoolFactory: 0x7053A37c5ae36338cFb743B973998abC4DF10668
  * QuantAMMWeightedPoolFactory: 0x078737a05a3Cc2A5A708D9ae829ecCbFC41C1DB1
