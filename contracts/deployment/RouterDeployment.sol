// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

// Import only the router contracts we need
import "@balancer-labs/v3-vault/contracts/Router.sol";
import "@balancer-labs/v3-vault/contracts/BatchRouter.sol";

// This contract exists only to ensure the above contracts are compiled
contract RouterDeployment {
    // Empty - this is just to trigger compilation
}
