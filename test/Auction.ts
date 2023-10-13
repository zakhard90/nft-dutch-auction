import {
  time,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";

import { ethers } from "hardhat";

describe("Auction", function () {
  async function deployOneYearAuctionFixture() {
    const ONE_DAY_BLOCKS = 5670;
    const ETH = 10**18;
    const startingPrice = 0.2 * ETH;
    const minPrice = startingPrice / 10;
    const decreaseRate = (startingPrice - minPrice) / ONE_DAY_BLOCKS
    const [owner, otherAccount] = await ethers.getSigners();
    const Blazer = await ethers.getContractFactory("Blazer");
    const nft = await Blazer.deploy(owner.address);
    const Auction = await ethers.getContractFactory("Auction");    
    
    const auction = await Auction.deploy(startingPrice, decreaseRate, nft.getAddress(), 1);
    return { auction, startingPrice, decreaseRate, nft, owner, otherAccount };
  }
});
