//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract GenericERC20 is ERC20{
    constructor () ERC20("Name", "ERC20") {

    }
}