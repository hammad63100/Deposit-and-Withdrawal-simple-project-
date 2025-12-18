// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Karnawallet {
    address public owner;

    mapping(address => uint256) public balances;

    event KarnaDeposit(address indexed user, uint256 amount);
    event KarnaWithdraw(address indexed user, uint256 amount);
    event KarnaOwnerWithdraw(uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // Deposit ETH into the contract
    function deposit() external payable {
        require(msg.value > 0, "Zero value");

        balances[msg.sender] += msg.value;

        emit KarnaDeposit(msg.sender, msg.value);
    }

    // Withdraw caller's ETH balance
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");

        balances[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);

        emit KarnaWithdraw(msg.sender, amount);
    }

    // Owner can withdraw ETH from contract balance
    function ownerWithdraw(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient contract balance");

        payable(owner).transfer(amount);

        emit KarnaOwnerWithdraw(amount);
    }

    // Helper to get full contract ETH balance
    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
