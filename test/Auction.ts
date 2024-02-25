import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture, mine } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Auction", function () {
    async function deployAuctionFixture() {
        const oneDay = 5670n;
        const startingPrice = BigInt(0.2 * 10 ** 18);
        const minPrice = startingPrice / 10n;
        const decreaseRate = (startingPrice - minPrice) / oneDay;
        const [owner, seller, buyer, ...otherAccounts] = await ethers.getSigners();
        const BlazerFactory = await ethers.getContractFactory("Blazer");
        const Blazer = await BlazerFactory.deploy();
        const AuctionFactory = await ethers.getContractFactory("Auction");
        const nftId = 1;
        await Blazer.safeMint(seller.address);
        const Auction = await AuctionFactory.connect(seller).deploy(startingPrice, decreaseRate, Blazer.getAddress(), 1);
        await Blazer.connect(seller).approve(Auction.getAddress(), nftId);
        await Auction.connect(seller).start();
        const startAtBlock = await Auction.startAtBlock();

        const calculateLastPrice = async () => {
            var block = await ethers.provider.getBlock("latest");
            if (block == null) throw new Error("Block is null");
            var blockNumber = BigInt(block.number.toString());
            var blocksElapsed = blockNumber - startAtBlock;
            var discount = decreaseRate * blocksElapsed;
            return startingPrice - discount;
        };

        const calculateNextPrice = async () => {
            var block = await ethers.provider.getBlock("latest");
            if (block == null) throw new Error("Block is null");
            var blockNumber = BigInt(block.number.toString());
            var blocksElapsed = blockNumber - startAtBlock;
            var discount = decreaseRate * (blocksElapsed + 1n);
            return startingPrice - discount;
        };

        return {
            nftId,
            startingPrice,
            decreaseRate,
            Auction,
            Blazer,
            owner,
            seller,
            buyer,
            otherAccounts,
            oneDay,
            minPrice,
            calculateLastPrice,
            calculateNextPrice,
        };
    }
    describe("Initial", function () {
        it("Should set initial NFT balance", async function () {
            const { Blazer, seller, nftId } = await loadFixture(deployAuctionFixture);
            expect(await Blazer.ownerOf(nftId)).to.equal(seller.address);
            expect(await Blazer.balanceOf(seller.address)).to.equal(1);
        });

        it("Should set correct auction values ", async function () {
            const { Auction, Blazer, seller, startingPrice, decreaseRate, nftId } = await loadFixture(deployAuctionFixture);
            expect(await Auction.seller()).to.be.equal(seller.address);
            expect(await Auction.nftId()).to.be.equal(nftId);
            expect(await Auction.auctionItem()).to.be.equal(await Blazer.getAddress());
            expect(await Auction.startingPrice()).to.be.equal(startingPrice);
            expect(await Auction.discountRate()).to.be.equal(decreaseRate);
        });

        it("Should set correct auction duration ", async function () {
            const { Auction, oneDay } = await loadFixture(deployAuctionFixture);
            expect(await Auction.startAtBlock()).to.be.equal((await Auction.expiresAtBlock()) - oneDay);
        });

        it("Should get correct auction price ", async function () {
            const { Auction, calculateLastPrice } = await loadFixture(deployAuctionFixture);
            await mine(250);
            expect(await Auction.getPrice()).to.be.equal(await calculateLastPrice());
        });

        it("Should reach min auction price", async function () {
            const { Auction, minPrice, oneDay } = await loadFixture(deployAuctionFixture);
            await mine(oneDay + 1n);
            expect(await Auction.getPrice()).to.be.lessThanOrEqual(minPrice);
        });
    });

    describe("Auction", function () {
        it("Should buy with exact price", async function () {
            const { Auction, Blazer, seller, buyer, nftId, calculateNextPrice } = await loadFixture(deployAuctionFixture);
            await mine(100n);
            const nextPrice = await calculateNextPrice();
            const sentValue = nextPrice;
            const currentPrice = await Auction.getPrice();
            const discount = await Auction.discountRate();
            const expectedPrice = currentPrice - discount;
            expect(sentValue).to.be.equal(expectedPrice);
            await expect(Auction.connect(buyer).buy({ value: sentValue }))
                .to.emit(Blazer, "Transfer")
                .withArgs(seller.address, buyer.address, nftId);
        });

        it("Should buy with higher price", async function () {
            const { Auction, Blazer, seller, buyer, nftId, calculateNextPrice } = await loadFixture(deployAuctionFixture);
            await mine(100n);
            const nextPrice = await calculateNextPrice();
            const sentValue = nextPrice + 10n;
            const currentPrice = await Auction.getPrice();
            const discount = await Auction.discountRate();
            const expectedPrice = currentPrice - discount;
            expect(sentValue).to.be.greaterThan(expectedPrice);
            await expect(Auction.connect(buyer).buy({ value: sentValue }))
                .to.emit(Blazer, "Transfer")
                .withArgs(seller.address, buyer.address, nftId);
        });

        it("Seller should be able to cancel the auction", async function () {
            const { Auction, seller } = await loadFixture(deployAuctionFixture);
            await mine(10n);
            await expect(Auction.connect(seller).cancel()).to.emit(Auction, "AuctionCancelled");
        });

        it("Non seller should not be able to cancel the auction", async function () {
            const { Auction, otherAccounts } = await loadFixture(deployAuctionFixture);
            await mine(10n);
            await expect(Auction.connect(otherAccounts[0]).cancel()).to.be.revertedWith("Only seller is allowed to cancel");
        });
    });

    describe("Challenge", function () {
        it("Should revert on buy if auction not active", async function () {
            const { Auction, Blazer, seller, buyer, nftId, calculateNextPrice } = await loadFixture(deployAuctionFixture);
            const price = await calculateNextPrice();
            await expect(Auction.connect(buyer).buy({ value: price }))
                .to.emit(Blazer, "Transfer")
                .withArgs(seller.address, buyer.address, nftId);
            await mine(10n);            
            await expect(Auction.connect(buyer).buy()).to.be.revertedWith("Auction ended");
        });

        it("Should revert on buy after expiry", async function () {
            const { Auction, buyer, oneDay } = await loadFixture(deployAuctionFixture);
            await mine(oneDay + 1n);
            await expect(Auction.connect(buyer).buy()).to.be.revertedWith("Auction ended");
        });

        it("Should revert on buy with insufficient value", async function () {
            const { Auction, owner, seller, buyer, otherAccounts, calculateNextPrice } = await loadFixture(deployAuctionFixture);
            await mine(100n);
            const nextPrice = await calculateNextPrice();
            const sentValue = nextPrice - 1n;
            const currentPrice = await Auction.getPrice();
            const discount = await Auction.discountRate();
            const expectedPrice = currentPrice - discount;
            expect(sentValue).to.be.lessThan(expectedPrice);
            await expect(Auction.connect(buyer).buy({ value: sentValue })).to.be.revertedWith("ETH not sufficient to buy the item");
        });

        it("Only owner should mint", async function () {
            const { Blazer, buyer } = await loadFixture(deployAuctionFixture);
            expect(Blazer.connect(buyer).safeMint(buyer.address)).to.be.revertedWithCustomError;
        });
    });
});
