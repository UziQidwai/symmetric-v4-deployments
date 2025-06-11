// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

// Import only the contracts we need for deployment
import "@balancer-labs/v3-vault/contracts/Vault.sol";
import "@balancer-labs/v3-vault/contracts/VaultAdmin.sol";
import "@balancer-labs/v3-vault/contracts/VaultExtension.sol";
import "@balancer-labs/v3-vault/contracts/ProtocolFeeController.sol";

// This contract exists only to ensure the above contracts are compiled
// We don't actually deploy this contract itself
contract VaultDeployment {
    // Empty - this is just to trigger compilation
}
