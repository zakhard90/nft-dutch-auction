// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Blazer is ERC721, Ownable {

    uint256 private _nextId = 1;
    constructor() ERC721("Blazer", "BLZ") Ownable(msg.sender) {}

    function safeMint(address to) public onlyOwner {
        _safeMint(to, _nextId);
        _nextId++;
    }
}