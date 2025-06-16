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

Build the contract assets.

```
npx hardhat run scripts/deploy-all-enhanced.js --network moksha
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
