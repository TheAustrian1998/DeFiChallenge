const { expect } = require("chai");
const Keep3rABI = require("../ABI/Keep3rABI.json");

describe("Challenge 1.3", function () {

    let DAIAddress = "0x6b175474e89094c44da98b954eedeac495271d0f";
    let WETHAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
    let UniRouterAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    let keep3rAddress = "0x1cEB5cB57C4D4E2b2433641b95Dd330A33185A44";
    let governanceAddress = "0x0D5Dc686d0a2ABBfDaFDFb4D0533E886517d4E83";
    let randomKeeperAddress = "0x2D407dDb06311396fE14D4b49da5F0471447d45C";
    let whaleAddress = "0xb527a981e1d415AF696936B3174f2d7aC8D11369";
    let whaleAddress1 = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B";
    let keeperWhaleAddress = "0x07c2af75788814BA7e5225b2F5c951eD161cB589";

    before(async function () {
        
        this.accounts = await ethers.getSigners();

        //Governance
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [governanceAddress],
        });

        //Impersonate keeper
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [randomKeeperAddress],
        });

        //Whales
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
            params: [keeperWhaleAddress],
        });

        //Give governance some money
        await network.provider.send("hardhat_setBalance", [
            governanceAddress,
            "0x8AC7230489E80000",
        ]);

        whaleSigner = await ethers.getSigner(whaleAddress);
        whaleSigner1 = await ethers.getSigner(whaleAddress1);
        governanceSigner = await ethers.getSigner(governanceAddress);
        randomKeeperSigner = await ethers.getSigner(randomKeeperAddress);
        keeperWhaleSigner = await ethers.getSigner(keeperWhaleAddress);

        //Deploy library
        this.IterableMapping = await ethers.getContractFactory("IterableMapping");
        this.iterableMapping = await this.IterableMapping.deploy();

        //Deploy
        this.SwapperUNIV2 = await ethers.getContractFactory("SwapperUNIV2", {
            libraries: {
                IterableMapping: this.iterableMapping.address,
            }
        });
        this.swapperUNIV2 = await this.SwapperUNIV2.deploy(DAIAddress, WETHAddress, UniRouterAddress);
        await this.swapperUNIV2.deployed();

        this.SwapperJob = await ethers.getContractFactory("SwapperJob");
        this.swapperJob = await this.SwapperJob.deploy(this.swapperUNIV2.address, keep3rAddress);

        //Keep3r contract
        const keep3rContract = new ethers.Contract(keep3rAddress, Keep3rABI, ethers.provider);

        //Add job
        await keep3rContract.connect(governanceSigner).addJob(this.swapperJob.address);

        //Add credit (50 KP3R)
        let credit = ethers.utils.parseUnits("50");
        await keep3rContract.connect(keeperWhaleSigner).approve(keep3rAddress, credit);
        await keep3rContract.connect(keeperWhaleSigner).addCredit(keep3rAddress, this.swapperJob.address, credit);

    });

    it("Should provide ETH (not wrapped) succesful...", async function () {

        async function provide(whale, swapperUNIV2) {
            const amounts = ["3", "4", "5", "6", "8"]; //Pick random amount
            const random = Math.floor(Math.random() * amounts.length);
            let amountToProvide = amounts[random];
            let poolWETHBeforeBalance = ethers.utils.formatUnits(await swapperUNIV2.connect(whale).viewBalance(WETHAddress));
            await swapperUNIV2.connect(whale).provide(0, true, { value: ethers.utils.parseUnits(amountToProvide) });
            let poolWETHAfterBalance = ethers.utils.formatUnits(await swapperUNIV2.connect(whale).viewBalance(WETHAddress));
            expect(Number(poolWETHAfterBalance)).equal(Number(amountToProvide) + Number(poolWETHBeforeBalance));
        }

        //Provide with 2 accounts
        await provide(whaleSigner, this.swapperUNIV2);
        await provide(whaleSigner1, this.swapperUNIV2);

    });

    it("Should execute work() successfully...", async function () {

        const keep3rContract = new ethers.Contract(keep3rAddress, Keep3rABI, ethers.provider);
        let balanceBeforeWork = await keep3rContract.connect(keeperWhaleSigner).balanceOf(keeperWhaleSigner.address);
        let workable = await this.swapperJob.workable();
        if (workable) {
            await this.swapperJob.connect(randomKeeperSigner).work((Date.now() * 1000) + 900);
        }
        let balanceAfterWork = await keep3rContract.connect(keeperWhaleSigner).balanceOf(keeperWhaleSigner.address);
        //Check keeper received reward (1 KP3R)
        expect(Number(balanceAfterWork)).equal((Number(balanceBeforeWork) + 1));

    });
});