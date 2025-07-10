// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRouter {
    function initialize(address vault, address weth, address permit2) external;
}
