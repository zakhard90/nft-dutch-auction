// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

error InvalidAccount(address account);

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

    event AuctionCancelled(address _sender);

    constructor(
        uint _startingPrice,
        uint _discountRate,
        address _contract,
        uint _nftId
    ) {
        seller = payable(msg.sender);
        startingPrice = _startingPrice;
        discountRate = _discountRate;

        require(
            _startingPrice >= _discountRate * DURATION,
            "Starting price not correct"
        );

        auctionItem = IERC721(_contract);        
        nftId = _nftId;
    }

    function start() external {
        require(
            auctionItem.ownerOf(nftId) == msg.sender,
            "Seller must own the auctioned item"
        ); 

        startAtBlock = block.number;
        expiresAtBlock = block.number + DURATION;        
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
        require(msg.value >= price, "ETH not sufficient to buy the item");

        isActive = false;
        auctionItem.transferFrom(seller, msg.sender, nftId);

        uint refund = msg.value - price;
        if (refund > 0) {
            payable(msg.sender).transfer(refund);
        }
    }

    function cancel() external {
        require(msg.sender == seller, "Only seller is allowed to cancel");
        isActive = false;
        payable(seller).transfer(address(this).balance);
        emit AuctionCancelled(msg.sender);
    }
}
