import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture, mine } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Auction", function () {
  async function deployAuctionFixture() {
    const oneDay = 5670n;
    const startingPrice = BigInt(0.2 * (10 ** 18));
    const minPrice = startingPrice / 10n;
    const decreaseRate = (startingPrice - minPrice) / oneDay
    const [owner, account1, account2] = await ethers.getSigners();
    const BlazerFactory = await ethers.getContractFactory("Blazer");
    const Blazer = await BlazerFactory.deploy();
    const AuctionFactory = await ethers.getContractFactory("Auction");  
    const nftId = 1;  
    await Blazer.safeMint(account1.address);

    const Auction = await AuctionFactory
    .connect(account1)
    .deploy(
      startingPrice, 
      decreaseRate, 
      Blazer.getAddress(), 
      1);

    const startAtBlock = await Auction.startAtBlock();

    const calculatePrice = async () => {
      var block = await ethers.provider.getBlock("latest");
      if(block == null)
        throw(new Error("Block is null"));
      var blockNumber = BigInt(block.number.toString());
      var blocksElapsed =  blockNumber - startAtBlock;
      var discount = decreaseRate * blocksElapsed;
      return startingPrice - discount;
    }

    return { 
      nftId, 
      startingPrice, 
      decreaseRate, 
      Auction, 
      Blazer, 
      owner, 
      account1, 
      account2,
      oneDay, 
      minPrice, 
      calculatePrice };
  }
  describe("Initial", function () {
    it("Should set initial balance", async function () {
      const {Blazer, account1, nftId} = await loadFixture(deployAuctionFixture);
      expect(await Blazer.ownerOf(nftId)).to.equal(account1.address);
      expect(await Blazer.balanceOf(account1.address)).to.equal(1);
    });

    it("Should set correct auction values ", async function () {
      const {Auction, Blazer, account1, startingPrice, decreaseRate, nftId} = await loadFixture(deployAuctionFixture);
      expect(await Auction.seller()).to.be.equal(account1.address);
      expect(await Auction.nftId()).to.be.equal(nftId);
      expect(await Auction.auctionItem()).to.be.equal(await Blazer.getAddress());
      expect(await Auction.startingPrice()).to.be.equal(startingPrice);
      expect(await Auction.discountRate()).to.be.equal(decreaseRate);
    });

    it("Should get correct auction price ", async function () {
      const {Auction, calculatePrice} = await loadFixture(deployAuctionFixture);
      mine(250);
      expect(await Auction.getPrice()).to.be.equal(await calculatePrice());
    });

    it("Should reach min auction price", async function () {
      const {Auction, minPrice, oneDay} = await loadFixture(deployAuctionFixture);
      mine(oneDay + 1n);
      expect(await Auction.getPrice()).to.be.lessThanOrEqual(minPrice);
    });

    it("Should revert on buy after expiry", async function () {
      const {Auction, account2, oneDay} = await loadFixture(deployAuctionFixture);
      mine(oneDay + 1n);
      await expect(Auction.connect(account2).buy()).to.be.revertedWith("Auction ended");
    });
  });
});
