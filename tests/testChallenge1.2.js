const { expect } = require("chai");

describe("Challenge 1.2", function () {

    let DAIAddress = "0x6b175474e89094c44da98b954eedeac495271d0f";
    let WETHAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
    let UniRouterAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

    let whaleAddress = "0xb527a981e1d415AF696936B3174f2d7aC8D11369";
    let whaleAddress1 = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B";
    let whaleAddress2 = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

    let whaleSigner;
    let whaleSigner1;
    let whaleSigner2;

    before(async function () {
        
        this.accounts = await ethers.getSigners();

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [whaleAddress],
        });
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [whaleAddress1],
        });
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [whaleAddress2],
        });

        whaleSigner = await ethers.getSigner(whaleAddress);
        whaleSigner1 = await ethers.getSigner(whaleAddress1);
        whaleSigner2 = await ethers.getSigner(whaleAddress2);

        //Deploy library
        this.IterableMapping = await ethers.getContractFactory("IterableMapping");
        this.iterableMapping = await this.IterableMapping.deploy();

        //Deploy
        this.GenericERC20 = await ethers.getContractFactory("GenericERC20");
        this.SwapperUNIV2 = await ethers.getContractFactory("SwapperUNIV2", {
            libraries: {
                IterableMapping: this.iterableMapping.address,
            }
        });
        this.swapperUNIV2 = await this.SwapperUNIV2.deploy(DAIAddress, WETHAddress, UniRouterAddress);
        await this.swapperUNIV2.deployed();

    });

    it("Should provide ETH (not wrapped) successfully...", async function () {

        async function provide(whale, swapperUNIV2) {
            const amounts = ["3", "4", "5", "6", "8"]; //Pick random amount
            const random = Math.floor(Math.random() * amounts.length);
            let amountToProvide = amounts[random];
            let poolWETHBeforeBalance = ethers.utils.formatUnits(await swapperUNIV2.connect(whale).viewBalance(WETHAddress));
            await swapperUNIV2.connect(whale).provide(0, true, { value: ethers.utils.parseUnits(amountToProvide) });
            let poolWETHAfterBalance = ethers.utils.formatUnits(await swapperUNIV2.connect(whale).viewBalance(WETHAddress));
            expect(Number(poolWETHAfterBalance)).equal(Number(amountToProvide) + Number(poolWETHBeforeBalance));
        }

        //Provide with 3 accounts
        await provide(whaleSigner, this.swapperUNIV2);
        await provide(whaleSigner1, this.swapperUNIV2);
        await provide(whaleSigner2, this.swapperUNIV2);

    });

    it("Should swap wETH for DAI successfully...", async function () {

        await this.swapperUNIV2.connect(whaleSigner).swap((Date.now() * 1000) + 900); //Deadline setted in 15 min
        let WETHBalanceAfterSwap = ethers.utils.formatUnits(await this.swapperUNIV2.connect(whaleSigner).viewBalance(WETHAddress));
        expect(Number(WETHBalanceAfterSwap)).equal(0);

    });

    it("Should withdraw DAI successfully...", async function () {

        async function withdraw(whale, swapperUNIV2) {
            const amounts = ["2100", "2200", "2500", "2600", "2800"]; //Pick random amount
            const random = Math.floor(Math.random() * amounts.length);
            let amountToWithdraw = amounts[random];
            let DAIBalanceBeforeWithdraw = ethers.utils.formatUnits(await swapperUNIV2.connect(whale).viewBalance(DAIAddress));
            await swapperUNIV2.connect(whale).withdraw(ethers.utils.parseUnits(amountToWithdraw));
            let DAIBalanceAfterWithdraw = ethers.utils.formatUnits(await swapperUNIV2.connect(whale).viewBalance(DAIAddress));
            expect(Number(DAIBalanceAfterWithdraw)).equal(Number(DAIBalanceBeforeWithdraw) - Number(parseFloat(amountToWithdraw)));
        }

        //Withdraw with 3 accounts
        await withdraw(whaleSigner, this.swapperUNIV2);
        await withdraw(whaleSigner1, this.swapperUNIV2);
        await withdraw(whaleSigner2, this.swapperUNIV2);

    });

});