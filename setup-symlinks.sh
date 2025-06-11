#!/bin/bash

echo "Setting up symlinks for Symmetric V4 deployment..."

# Create @balancer-labs directory
mkdir -p node_modules/@balancer-labs

# Set up Balancer symlinks
cd node_modules/@balancer-labs
rm -f v3-*
ln -s ../../contracts/symmetric-v4/pkg/interfaces v3-interfaces
ln -s ../../contracts/symmetric-v4/pkg/solidity-utils v3-solidity-utils
ln -s ../../contracts/symmetric-v4/pkg/vault v3-vault
ln -s ../../contracts/symmetric-v4/pkg/pool-weighted v3-pool-weighted
ln -s ../../contracts/symmetric-v4/pkg/pool-stable v3-pool-stable
ln -s ../../contracts/symmetric-v4/pkg/pool-utils v3-pool-utils
ln -s ../../contracts/symmetric-v4/pkg/pool-hooks v3-pool-hooks
ln -s ../../contracts/symmetric-v4/pkg/governance-scripts v3-governance-scripts
cd ../..

# Ensure permit2 exists
if [ ! -d "node_modules/permit2" ]; then
    echo "Cloning permit2..."
    cd node_modules
    git clone https://github.com/Uniswap/permit2.git
    cd ..
fi

echo "✅ All symlinks set up successfully!"
echo "Balancer packages:"
ls -la node_modules/@balancer-labs/
echo "Permit2:"
ls -la node_modules/permit2/src/interfaces/ | head -3
