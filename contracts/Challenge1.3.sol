//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface ISwapperUNIV2 {
    function swap(uint256 amount, address tokenIn, address tokenOut) external;
}

contract SwapperJob {

    uint256 public lastExecution;

    constructor () {

    }



    function workable() internal view returns (bool){
        if (lastExecution + 10 minutes <= block.timestamp){
            return true;
        }
        return false;
    }

    function work() public {
        require(workable(), "You can't execute now");

    }

}