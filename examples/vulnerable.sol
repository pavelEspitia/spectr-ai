// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Intentionally vulnerable contract for testing spectr-ai
contract VulnerableVault {
    mapping(address => uint256) public balances;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    // Vulnerability: reentrancy — external call before state update
    function withdraw() public {
        uint256 amount = balances[msg.sender];
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        balances[msg.sender] = 0;
    }

    // Vulnerability: no access control
    function drain() public {
        payable(owner).transfer(address(this).balance);
    }

    // Vulnerability: tx.origin for auth
    function transferOwnership(address newOwner) public {
        require(tx.origin == owner, "Not owner");
        owner = newOwner;
    }

    // Gas issue: unbounded loop
    function batchTransfer(address[] memory recipients, uint256 amount) public {
        for (uint256 i = 0; i < recipients.length; i++) {
            payable(recipients[i]).transfer(amount);
        }
    }
}
