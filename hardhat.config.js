/**
 * @type import('hardhat/config').HardhatUserConfig
 */

require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");
let { urlAlchemy } = require("./secrets.json");

module.exports = {
  solidity: "0.8.0",
  networks: {
    hardhat: {
      forking: {
        url: urlAlchemy,
        block: 13006453
      }
    }
  }
};