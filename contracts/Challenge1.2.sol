//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./IUniswapV2Router02.sol";
import "./IWETH.sol";
import "./IterableMap.sol";

contract SwapperUNIV2 is ReentrancyGuard {

    using IterableMapping for IterableMapping.Map;

    address public DAI;
    address public WETH;
    IUniswapV2Router02 public UniswapV2Router;
    IterableMapping.Map private DAIBalances;
    IterableMapping.Map private WETHBalances;

    constructor (address _DAI, address _WETH, address _UniswapV2Router) {
        DAI = _DAI;
        WETH = _WETH;
        UniswapV2Router = IUniswapV2Router02(_UniswapV2Router);
        //Unilimited approve
        IERC20(WETH).approve(_UniswapV2Router, type(uint).max);
    }

    function _swap(uint256 relPrice) internal {
        //Swap all tokens
        for (uint i = 0; i < WETHBalances.size(); i++) {
            address key = WETHBalances.getKeyAtIndex(i);
            uint256 balanceWETH = WETHBalances.get(key);

            if (balanceWETH > 0) {
                WETHBalances.set(key, 0);
                uint256 balanceDAI = DAIBalances.get(key);
                DAIBalances.set(key, balanceDAI + (balanceWETH * relPrice));
            }
        }
    }

    function _getAllWETHBalance() internal view returns (uint256) {
        uint256 count = 0;
        for (uint i = 0; i < WETHBalances.size(); i++) {
            address key = WETHBalances.getKeyAtIndex(i);
            uint256 balance = WETHBalances.get(key);
            count += balance;
        }
        return count;
    }

    function provide(uint256 amount, bool isNativeETH) external payable {
        //Deposit ETH or wETH
        if (isNativeETH == true) {
            //Need to wrap some ETH
            IWETH(WETH).deposit{ value:msg.value }();
            amount = uint(msg.value);
        }else{
            IERC20(WETH).transferFrom(msg.sender, address(this), amount);
        }
        uint256 WETHbalance = WETHBalances.get(msg.sender);
        WETHBalances.set(msg.sender, WETHbalance + amount);
    }

    function swap(uint256 deadline) external nonReentrant {
        //WETH -> DAI

        //Swap on UNI
        address[] memory path = new address[](2);
        path[0] = WETH;
        path[1] = DAI;
        uint256 totalWETHAmount = _getAllWETHBalance();
        uint256[] memory amountsOut = UniswapV2Router.getAmountsOut(totalWETHAmount, path);
        uint256 maxAmount = amountsOut[1] - (amountsOut[1] * 1 / 100); // 1% slippage
        uint256[] memory amounts = UniswapV2Router.swapExactTokensForTokens(totalWETHAmount, maxAmount, path, address(this), deadline);
        
        //Update balances
        uint256 relPrice = amounts[1] / amounts[0];
        _swap(relPrice);
    }

    function withdraw(uint256 amount) external nonReentrant {
        //Withdraw "DAI"
        uint256 DAIBalance = DAIBalances.get(msg.sender);
        require(DAIBalance >= amount, "Not enough balance");
        DAIBalances.set(msg.sender, DAIBalance - amount);
        IERC20(DAI).transfer(msg.sender, amount);
    }

    function viewBalance(address tokenToView) public view returns (uint256){
        //Show user balance in contract
        uint256 balance = 0;

        if (tokenToView == DAI) {
            balance = DAIBalances.get(msg.sender);
        }

        if (tokenToView == WETH) {
            balance = WETHBalances.get(msg.sender);
        }

        return balance;
    }

}