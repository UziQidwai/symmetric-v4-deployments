// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

import "@balancer-labs/v3-interfaces/contracts/vault/IVault.sol";

/**
 * @title Gyro2CLPPoolFactory
 * @notice Minimal Gyro 2CLP Pool Factory for subgraph compatibility
 * @dev This is a simplified version for deployment artifacts and subgraph indexing
 */
contract Gyro2CLPPoolFactory {
    IVault public immutable vault;
    
    constructor(IVault _vault, uint32, string memory) {
        vault = _vault;
    }
    
    // Minimal implementation for artifact generation and subgraph compatibility
    function getVault() external view returns (IVault) {
        return vault;
    }
}
