// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

error InvalidSellerAccount(address account);
error InvalidStartingPrice(uint price);
error InvalidNftOwner();
error InvalidAuctionApproval();
error InvalidContractAddress();
error AuctionNotActive();
error AuctionNotActiveOrExpired();
error InsufficientValueSent();

contract Auction {
    uint private constant DURATION = 5670;

    IERC721 public immutable auctionItem;
    uint public immutable nftId;

    address payable public immutable seller;
    uint public immutable startingPrice;
    uint public immutable discountRate;
    uint public startAtBlock;
    uint public expiresAtBlock;
    bool private isActive;

    event AuctionStarted(uint startBlock, uint endBlock);
    event AuctionSuccessful(address buyer, uint price);
    event AuctionCancelled(address _sender);

    constructor(
        uint _startingPrice,
        uint _discountRate,
        address _contract,
        uint _nftId
    ) {
        if (_contract == address(0)) {
            revert InvalidContractAddress();
        }

        seller = payable(msg.sender);
        startingPrice = _startingPrice;
        discountRate = _discountRate;

        if (_startingPrice < _discountRate * DURATION) {
            revert InvalidStartingPrice(_startingPrice);
        }

        auctionItem = IERC721(_contract);
        nftId = _nftId;
    }

    function start() external {
        if (auctionItem.ownerOf(nftId) != msg.sender) {
            revert InvalidNftOwner();
        }

        if (auctionItem.getApproved(nftId) != address(this)) {
            revert InvalidAuctionApproval();
        }

        startAtBlock = block.number;
        expiresAtBlock = block.number + DURATION;
        isActive = true;
        emit AuctionStarted(startAtBlock, expiresAtBlock);
    }

    function getPrice() public view returns (uint) {
        if (!isActive) {
            revert AuctionNotActive();
        }

        uint blocksElapsed = block.number - startAtBlock;
        uint discount = discountRate * blocksElapsed;
        return discount >= startingPrice ? 0 : startingPrice - discount;
    }

    function buy() external payable {
        if (!isActive || block.number >= expiresAtBlock) {
            revert AuctionNotActiveOrExpired();
        }

        uint price = getPrice();
        if (msg.value < price) {
            revert InsufficientValueSent();
        }

        isActive = false;
        uint refundAmount = msg.value - price;
        auctionItem.transferFrom(seller, msg.sender, nftId);

        payable(seller).transfer(price);
        if (refundAmount > 0) {
            payable(msg.sender).transfer(refundAmount);
        }
        emit AuctionSuccessful(msg.sender, price);
    }

    function cancel() external {
        if (msg.sender != seller) {
            revert InvalidSellerAccount(msg.sender);
        }

        isActive = false;
        payable(seller).transfer(address(this).balance);
        emit AuctionCancelled(msg.sender);
    }
}
