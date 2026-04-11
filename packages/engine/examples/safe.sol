// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title SimpleStorage — a minimal, safe contract for testing
contract SimpleStorage {
    uint256 private _value;

    event ValueChanged(uint256 indexed newValue);

    function store(uint256 newValue) external {
        _value = newValue;
        emit ValueChanged(newValue);
    }

    function retrieve() external view returns (uint256) {
        return _value;
    }
}
