// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IERC721 {
    function ownerOf(
        uint _tokenId
    ) external view returns (address owner);
    function safeTransferFrom(
        address _from,
        address _to,
        uint _nftId
    ) external;
}

contract Auction {
    uint private constant DURATION = 5670;

    IERC721 public immutable auctionItem;
    uint public immutable nftId;

    address payable public immutable seller;
    uint public immutable startingPrice;
    uint public immutable discountRate;
    uint public immutable startAtBlock;
    uint public immutable expiresAtBlock;
    bool private isActive;

    constructor(
        uint _startingPrice,
        uint _discountRate,
        address _contract,
        uint _nftId
    ) {
        seller = payable(msg.sender);
        startingPrice = _startingPrice;
        discountRate = _discountRate;
        startAtBlock = block.number;
        expiresAtBlock = block.number + DURATION;

        require(_startingPrice >= _discountRate * DURATION, "Starting price not correct");

        auctionItem = IERC721(_contract);

        require(auctionItem.ownerOf(_nftId) == msg.sender, "Seller must own of the auction item");
        nftId = _nftId;
        isActive = true;
    }

    function getPrice() public view returns (uint) {
        uint blocksElapsed = block.number - startAtBlock;
        uint discount = discountRate * blocksElapsed;
        return startingPrice - discount;
    }

    function buy() external payable {
        require(isActive && block.number < expiresAtBlock, "Auction ended");

        uint price = getPrice();
        require(msg.value >= price, "Sent ETH is less than the price of the auction item");
        
        isActive = false;

        auctionItem.safeTransferFrom(seller, msg.sender, nftId);
        uint refund = msg.value - price;
        if (refund > 0) {
            payable(msg.sender).transfer(refund);
        }        
    }

    function cancel() external {
        require(msg.sender == seller, "Only seller is allowed to cancel");

        selfdestruct(seller);
    }
}