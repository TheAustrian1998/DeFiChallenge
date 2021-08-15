//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface ISwapperUNIV2 {
    function swap(uint256 deadline) external;
}

interface IKeep3r {
    function receipt(address credit, address keeper, uint amount) external;
}

contract SwapperJob {

    uint256 public lastExecution;
    ISwapperUNIV2 public SwapperUNIV2;
    IKeep3r public Keep3r;
    address public Keep3rAddress;

    constructor (address _ISwapperUNIV2, address _IKeep3r) {
        SwapperUNIV2 = ISwapperUNIV2(_ISwapperUNIV2);
        Keep3r = IKeep3r(_IKeep3r);
        Keep3rAddress = _IKeep3r;
    }

    function workable() public view returns (bool){
        if (lastExecution + 10 minutes <= block.timestamp){
            return true;
        }
        return false;
    }

    function work(uint256 deadline) public {
        require(workable(), "You can't execute now");
        SwapperUNIV2.swap(deadline);
        Keep3r.receipt(Keep3rAddress, msg.sender, 1 * 10 ** 18);
    }

}