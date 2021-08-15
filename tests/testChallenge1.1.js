const { expect } = require("chai");

describe("Challenge 1.1", function () {

    //These are not stablecoins, but for simplicity i assume that are equal to 1$
    let STABLE1Address = "0x4fabb145d64652a948d72533023f6e7a623c7c53";
    let STABLE2Address = "0x111111111117dc0aa78b770fa6a738034120c302";

    let whaleAddress = "0xF977814e90dA44bFA03b6295A0616a897441aceC";
    let whaleAddress1 = "0x6ec88a2Cb932eb46dfda0280c0eadB93b6eCa13B";
    let whaleAddress2 = "0x5132d0a2fC15FBA4a9a64EA714854270BEc382FB";

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

        //Transfer some tokens to other whales
        await this.GenericERC20.attach(STABLE1Address).connect(whaleSigner).transfer(whaleAddress1, ethers.utils.parseUnits("5000"));
        await this.GenericERC20.attach(STABLE2Address).connect(whaleSigner).transfer(whaleAddress1, ethers.utils.parseUnits("5000"));
        await this.GenericERC20.attach(STABLE1Address).connect(whaleSigner).transfer(whaleAddress2, ethers.utils.parseUnits("5000"));
        await this.GenericERC20.attach(STABLE2Address).connect(whaleSigner).transfer(whaleAddress2, ethers.utils.parseUnits("5000"));
        
    });

    it("Should provide STABLE1 successfully...", async function () {

        async function provide(whale, swapper, GenericERC20) {
            const amounts = ["300", "400", "500", "600", "800"]; //Pick random amount
            const random = Math.floor(Math.random() * amounts.length);
            let amountToProvide = amounts[random];
            let balanceBeforeProvideSTABLE1 = ethers.utils.formatUnits(await GenericERC20.attach(STABLE1Address).connect(whale).balanceOf(whale.address));
            let balanceBeforeProvide = ethers.utils.formatUnits(await swapper.connect(whale).viewBalanceFromToken());
            await GenericERC20.attach(STABLE1Address).connect(whale).approve(swapper.address, ethers.utils.parseUnits("40000"));
            await swapper.connect(whale).provide(ethers.utils.parseUnits(amountToProvide));
            let balanceAfterProvideSTABLE1 = ethers.utils.formatUnits(await GenericERC20.attach(STABLE1Address).connect(whale).balanceOf(whale.address));
            let balanceAfterProvide = ethers.utils.formatUnits(await swapper.connect(whale).viewBalanceFromToken());
            expect(Number(balanceAfterProvide)).equal(Number(balanceBeforeProvide) + Number(amountToProvide));
            expect(Number(balanceAfterProvideSTABLE1)).equal(Number(balanceBeforeProvideSTABLE1) - Number(amountToProvide));
        }

        await provide(whaleSigner, this.swapper, this.GenericERC20);
        await provide(whaleSigner1, this.swapper, this.GenericERC20);
        await provide(whaleSigner2, this.swapper, this.GenericERC20);

    });

    it("Should swap STABLE1 for STABLE2 successfully...", async function () {

        let balanceBeforeSwapFromToken = ethers.utils.formatUnits(await this.swapper.connect(whaleSigner).viewBalanceFromToken());
        await this.swapper.connect(whaleSigner).swap();
        let balanceAfterSwapFromToken = ethers.utils.formatUnits(await this.swapper.connect(whaleSigner).viewBalanceFromToken());
        let balanceAfterSwapToToken = ethers.utils.formatUnits(await this.swapper.connect(whaleSigner).viewBalanceToToken());
        expect(Number(balanceAfterSwapFromToken)).equal(0);
        expect(Number(balanceAfterSwapToToken)).equal(Number(balanceBeforeSwapFromToken));

    });

    it("Should withdraw STABLE2 successfully...", async function () {

        async function withdraw(whale, swapper, GenericERC20) {
            let amountToWithdraw = "300";
            let balanceBeforeWithdrawSTABLE2 = ethers.utils.formatUnits(await GenericERC20.attach(STABLE2Address).connect(whale).balanceOf(whale.address));
            let balanceBeforeToToken = ethers.utils.formatUnits(await swapper.connect(whale).viewBalanceToToken());
            await swapper.connect(whale).withdraw(ethers.utils.parseUnits(amountToWithdraw));
            let balanceAfterWithdrawSTABLE2 = ethers.utils.formatUnits(await GenericERC20.attach(STABLE2Address).connect(whale).balanceOf(whale.address));
            let balanceAfterToToken = ethers.utils.formatUnits(await swapper.connect(whale).viewBalanceToToken());
            expect(Number(balanceAfterToToken)).equal(Number(balanceBeforeToToken) - Number(amountToWithdraw));
            expect(Number(balanceAfterWithdrawSTABLE2)).equal(Number(balanceBeforeWithdrawSTABLE2) + Number(amountToWithdraw));
        }

        await withdraw(whaleSigner, this.swapper, this.GenericERC20);
        await withdraw(whaleSigner1, this.swapper, this.GenericERC20);
        await withdraw(whaleSigner2, this.swapper, this.GenericERC20);
    });

});