const { expect } = require("chai");

describe("Challenge 1.1", function () {

    let STABLE1Address = "0x4fabb145d64652a948d72533023f6e7a623c7c53";
    let STABLE2Address = "0x111111111117dc0aa78b770fa6a738034120c302";
    let whaleAddress = "0xF977814e90dA44bFA03b6295A0616a897441aceC";
    let whaleSigner;

    before(async function(){
        this.accounts = await ethers.getSigners();
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [whaleAddress],
        });
        whaleSigner = await ethers.getSigner(whaleAddress);

        //Deploy library
        this.IterableMapping = await ethers.getContractFactory("IterableMapping");
        this.iterableMapping = await this.IterableMapping.deploy();

        //Deploy contracts
        this.GenericERC20 = await ethers.getContractFactory("GenericERC20");
        this.Swapper = await ethers.getContractFactory("Swapper", {
            libraries: {
                IterableMapping: this.iterableMapping.address,
            }
        });
        this.swapper = await this.Swapper.deploy(STABLE1Address, STABLE2Address);
        await this.swapper.deployed();

        //Transfer some tokens to the pool, simulating previous liquidity
        await this.GenericERC20.attach(STABLE2Address).connect(whaleSigner).transfer(this.swapper.address, ethers.utils.parseUnits("40000"));
    });

    it("Should provide STABLE1 successful...", async function(){
        let amountToProvide = "400";
        let balanceBeforeProvideSTABLE1 = ethers.utils.formatUnits(await this.GenericERC20.attach(STABLE1Address).connect(whaleSigner).balanceOf(whaleSigner.address));
        let balanceBeforeProvide = ethers.utils.formatUnits(await this.swapper.connect(whaleSigner).viewBalanceFromToken());
        await this.GenericERC20.attach(STABLE1Address).connect(whaleSigner).approve(this.swapper.address, ethers.utils.parseUnits("40000"));
        await this.swapper.connect(whaleSigner).provide(ethers.utils.parseUnits(amountToProvide));
        let balanceAfterProvideSTABLE1 = ethers.utils.formatUnits(await this.GenericERC20.attach(STABLE1Address).connect(whaleSigner).balanceOf(whaleSigner.address));
        let balanceAfterProvide = ethers.utils.formatUnits(await this.swapper.connect(whaleSigner).viewBalanceFromToken());
        expect(Number(balanceAfterProvide)).equal(Number(balanceBeforeProvide)+Number(amountToProvide));
        expect(Number(balanceAfterProvideSTABLE1)).equal(Number(balanceBeforeProvideSTABLE1)-Number(amountToProvide));
    });

    it("Should swap STABLE1 for STABLE2 successful...", async function(){
        let balanceBeforeSwapFromToken = ethers.utils.formatUnits(await this.swapper.connect(whaleSigner).viewBalanceFromToken());
        await this.swapper.connect(whaleSigner).swap();
        let balanceAfterSwapFromToken = ethers.utils.formatUnits(await this.swapper.connect(whaleSigner).viewBalanceFromToken());
        let balanceAfterSwapToToken = ethers.utils.formatUnits(await this.swapper.connect(whaleSigner).viewBalanceToToken());
        expect(Number(balanceAfterSwapFromToken)).equal(0);
        expect(Number(balanceAfterSwapToToken)).equal(Number(balanceBeforeSwapFromToken));
    });

    it("Should withdraw STABLE2 successful...", async function(){
        let amountToWithdraw = "200";
        let balanceBeforeWithdrawSTABLE2 = ethers.utils.formatUnits(await this.GenericERC20.attach(STABLE2Address).connect(whaleSigner).balanceOf(whaleSigner.address));
        let balanceBeforeToToken = ethers.utils.formatUnits(await this.swapper.connect(whaleSigner).viewBalanceToToken());
        await this.swapper.connect(whaleSigner).withdraw(ethers.utils.parseUnits(amountToWithdraw));
        let balanceAfterWithdrawSTABLE2 = ethers.utils.formatUnits(await this.GenericERC20.attach(STABLE2Address).connect(whaleSigner).balanceOf(whaleSigner.address));
        let balanceAfterToToken = ethers.utils.formatUnits(await this.swapper.connect(whaleSigner).viewBalanceToToken());
        expect(Number(balanceAfterToToken)).equal(Number(balanceBeforeToToken)-Number(amountToWithdraw));
        expect(Number(balanceAfterWithdrawSTABLE2)).equal(Number(balanceBeforeWithdrawSTABLE2)+Number(amountToWithdraw));
    });

});