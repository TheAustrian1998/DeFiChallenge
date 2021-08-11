const { expect } = require("chai");

describe("Challenge 1.2", function () {

    let DAIAddress = "0x6b175474e89094c44da98b954eedeac495271d0f";
    let WETHAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
    let UniRouterAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    let whaleAddress = "0xb527a981e1d415AF696936B3174f2d7aC8D11369";
    let whaleSigner;

    before(async function(){
        this.accounts = await ethers.getSigners();
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [whaleAddress],
        });
        whaleSigner = await ethers.getSigner(whaleAddress);

        //Deploy
        this.GenericERC20 = await ethers.getContractFactory("GenericERC20");
        this.SwapperUNIV2 = await ethers.getContractFactory("SwapperUNIV2");
        this.swapperUNIV2 = await this.SwapperUNIV2.deploy(DAIAddress, WETHAddress, UniRouterAddress);
        await this.swapperUNIV2.deployed();
    });

    it("Should provide DAI successful...", async function(){
        let amountToDeposit = "400";
        await this.GenericERC20.attach(DAIAddress).connect(whaleSigner).approve(this.swapperUNIV2.address, ethers.utils.parseUnits("40000"));
        await this.swapperUNIV2.connect(whaleSigner).provide(ethers.utils.parseUnits(amountToDeposit), DAIAddress);
        let DAIbalance = ethers.utils.formatUnits(await this.swapperUNIV2.connect(whaleSigner).viewBalance(DAIAddress));
        expect(Number(DAIbalance)).equal(Number(amountToDeposit));
    });

    it("Should swap DAI for ETH successful...", async function(){
        let DAIbalanceBefore = ethers.utils.formatUnits(await this.swapperUNIV2.connect(whaleSigner).viewBalance(DAIAddress));
        let amountToSwap = "200";
        await this.swapperUNIV2.connect(whaleSigner).swap(ethers.utils.parseUnits(amountToSwap), DAIAddress, WETHAddress);
        let DAIbalancAfter = ethers.utils.formatUnits(await this.swapperUNIV2.connect(whaleSigner).viewBalance(DAIAddress));
        expect(Number(DAIbalancAfter)).equal(Number(DAIbalanceBefore) - Number(parseFloat(amountToSwap)));
    });

    it("Should withdraw ETH successful...", async function(){
        let amountToWithdraw = "0.01";
        let before = ethers.utils.formatUnits(await this.swapperUNIV2.connect(whaleSigner).viewBalance(WETHAddress));
        await this.swapperUNIV2.connect(whaleSigner).withdraw(ethers.utils.parseUnits(amountToWithdraw), WETHAddress);
        let after = ethers.utils.formatUnits(await this.swapperUNIV2.connect(whaleSigner).viewBalance(WETHAddress));
        expect(Number(after)).equal(Number(before) - Number(parseFloat(amountToWithdraw)));
    });
});