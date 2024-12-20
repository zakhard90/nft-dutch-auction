# Dutch Auction NFT selling contract

## Overview
This PoC smart contract project implements a Dutch auction mechanism for NFTs (Non-Fungible Tokens) on EVM-compatible blockchain networks. In a Dutch auction, the price starts high and gradually decreases over time until a buyer purchases the item or the auction expires.

## Features
- Linear price decay over time
- NFT integration (ERC721)
- Automatic refunds for excess payments
- Seller cancellation option
- Secure ownership and approval verification

## Installation

```bash
npm ci
```

## Testing

```bash
npm run test
```

## Contract Structure

### Main Components

1. **Constructor Parameters**
   - `_startingPrice`: Initial auction price in Wei
   - `_discountRate`: Rate at which price decreases per block
   - `_contract`: Address of the NFT contract
   - `_nftId`: Token ID of the NFT being auctioned

2. **Key Functions**
   ```solidity
   function start() external
   function getPrice() public view returns (uint)
   function buy() external payable
   function cancel() external
   ```

### Events
```solidity
event AuctionStarted(uint startBlock, uint endBlock)
event AuctionSuccessful(address buyer, uint price)
event AuctionCancelled(address _sender)
```

## Configuration

The contract includes a constant `DURATION` set to 5670 blocks (approximately 24 hours on Ethereum mainnet). This can be modified before deployment if a different auction duration is desired.

## License
This project is licensed under the MIT License - see the LICENSE file for details.