// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

// Import core contracts through symlinks
import "@balancer-labs/v3-vault/contracts/Vault.sol";
import "@balancer-labs/v3-vault/contracts/VaultAdmin.sol";
import "@balancer-labs/v3-vault/contracts/VaultExtension.sol";
import "@balancer-labs/v3-vault/contracts/ProtocolFeeController.sol";
import "@balancer-labs/v3-vault/contracts/Router.sol";
import "@balancer-labs/v3-vault/contracts/BatchRouter.sol";

// This contract just ensures compilation of the above
contract VaultDeployment {
    // Empty contract - just for compilation
}
