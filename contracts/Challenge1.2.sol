//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./IUniswapV2Router02.sol";
import "hardhat/console.sol";

contract SwapperUNIV2 is ReentrancyGuard {

    address public DAI;
    address public WETH;
    IUniswapV2Router02 public UniswapV2Router;
    mapping(address => uint256) public DAIBalances;
    mapping(address => uint256) public WETHBalances;

    constructor (address _DAI, address _WETH, address _UniswapV2Router) {
        DAI = _DAI;
        WETH = _WETH;
        UniswapV2Router = IUniswapV2Router02(_UniswapV2Router);
        IERC20(DAI).approve(_UniswapV2Router, type(uint).max);
        IERC20(WETH).approve(_UniswapV2Router, type(uint).max);
    }

    function provide(uint256 amount, address tokenToDeposit) external {
        //Deposit "tokenToDeposit"
        IERC20(tokenToDeposit).transferFrom(msg.sender, address(this), amount);
        if (tokenToDeposit == DAI) DAIBalances[msg.sender] += amount;
        if (tokenToDeposit == WETH) WETHBalances[msg.sender] += amount;
    }

    function swap(uint256 amount, address tokenIn, address tokenOut) external nonReentrant {
        //tokenIn -> tokenOut

        //Check balances
        if (tokenIn == DAI) { 
            require(DAIBalances[msg.sender] >= amount, "Not enough DAI balance");
        }
        if (tokenIn == WETH) { 
            require(WETHBalances[msg.sender] >= amount, "Not enough WETH balance");
        }

        //Swap on UNI
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        uint256[] memory amountsOut = UniswapV2Router.getAmountsOut(amount, path);
        uint256 deadline = block.timestamp + 20 minutes;
        uint256 maxAmount = amountsOut[1] - (amountsOut[1] * 1 / 100); // 1% slippage
        uint256[] memory amounts = UniswapV2Router.swapExactTokensForTokens(amount, maxAmount, path, address(this), deadline);
        
        //Update balances
        if (tokenIn == DAI) { 
            DAIBalances[msg.sender] -= amount;
            WETHBalances[msg.sender] += amounts[1];
        }
        if (tokenIn == WETH) { 
            WETHBalances[msg.sender] -= amount;
            DAIBalances[msg.sender] += amounts[1];
        }

    }

    function withdraw(uint256 amount, address tokenToWithdraw) external nonReentrant {
        //Withdraw "toToken"
        if (tokenToWithdraw == DAI) { 
            require(DAIBalances[msg.sender] >= amount);
            DAIBalances[msg.sender] -= amount;
        }
        if (tokenToWithdraw == WETH) { 
            require(WETHBalances[msg.sender] >= amount);
            WETHBalances[msg.sender] -= amount;
        }
        IERC20(tokenToWithdraw).transfer(msg.sender, amount);
    }

    function viewBalance(address tokenToView) public view returns (uint256){
        uint256 balance = 0;

        if (tokenToView == DAI) {
            balance = DAIBalances[msg.sender];
        }

        if (tokenToView == WETH) {
            balance = WETHBalances[msg.sender];
        }

        return balance;
    }

}