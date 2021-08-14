//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./IterableMap.sol";

contract Swapper is ReentrancyGuard {

    using IterableMapping for IterableMapping.Map;

    IERC20 public fromToken;
    IERC20 public toToken;
    IterableMapping.Map private fromTokenBalances;
    IterableMapping.Map private toTokenBalances;

    constructor (address _fromToken, address _toToken) {
        fromToken = IERC20(_fromToken);
        toToken = IERC20(_toToken);
    }

    function _swap() internal {
        //Swap all tokens
        for (uint i = 0; i < fromTokenBalances.size(); i++) {
            address key = fromTokenBalances.getKeyAtIndex(i);
            uint256 balanceFromToken = fromTokenBalances.get(key);

            if (balanceFromToken > 0) {
                fromTokenBalances.set(key, 0);
                uint256 balanceToToken = fromTokenBalances.get(key);
                toTokenBalances.set(key, balanceToToken + balanceFromToken);
            }
        }
    }

    function provide(uint256 amount) external {
        //Deposit "fromToken"
        fromToken.transferFrom(msg.sender, address(this), amount);
        uint256 balance = fromTokenBalances.get(msg.sender);
        fromTokenBalances.set(msg.sender, balance + amount);
    }

    function swap() external nonReentrant {
        //unidirectional | fromToken -> toToken
        _swap();
    }

    function withdraw(uint256 amount) external nonReentrant {
        //Withdraw "toToken"
        require(toTokenBalances.get(msg.sender) >= amount);
        uint256 balance = toTokenBalances.get(msg.sender);
        toTokenBalances.set(msg.sender, balance - amount);
        toToken.transfer(msg.sender, amount);
    }

    function viewBalanceFromToken() public view returns (uint256){
        //Show user balance "fromToken"
        return fromTokenBalances.get(msg.sender);
    }

    function viewBalanceToToken() public view returns (uint256){
        //Show user balance "toToken"
        return toTokenBalances.get(msg.sender);
    }

}