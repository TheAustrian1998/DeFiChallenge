//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Swapper is ReentrancyGuard {

    IERC20 public fromToken;
    IERC20 public toToken;
    mapping(address => uint256) public fromTokenBalances;
    mapping(address => uint256) public toTokenBalances;

    constructor (address _fromToken, address _toToken) {
        fromToken = IERC20(_fromToken);
        toToken = IERC20(_toToken);
    }

    function provide(uint256 amount) external {
        //Deposit "fromToken"
        fromToken.transferFrom(msg.sender, address(this), amount);
        fromTokenBalances[msg.sender] += amount;
    }

    function swap(uint256 amount) external nonReentrant {
        //unidirectional | fromToken -> toToken
        require(toToken.balanceOf(address(this)) >= amount, "Not enough toToken liquidity in pool");
        require(fromTokenBalances[msg.sender] >= amount, "Not enough fromTokens in user balance");
        fromTokenBalances[msg.sender] -= amount;
        toTokenBalances[msg.sender] += amount;
    }

    function withdraw(uint256 amount) external nonReentrant {
        //Withdraw "toToken"
        require(toTokenBalances[msg.sender] >= amount);
        toTokenBalances[msg.sender] -= amount;
        toToken.transfer(msg.sender, amount);
    }

}