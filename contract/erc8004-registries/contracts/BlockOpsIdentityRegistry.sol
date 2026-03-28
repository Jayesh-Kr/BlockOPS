// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
/**
 * @title BlockOpsIdentityRegistry
 * @dev Implementation of the ERC-8004 Identity Registry.
 * Every agent is registered as a unique NFT (ERC-721).
 */
contract BlockOpsIdentityRegistry is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    event AgentRegistered(uint256 indexed agentId, address indexed owner, string agentURI);

    constructor() ERC721("BlockOps Agent Identity", "BOID") Ownable(msg.sender) {}

    /**
     * @dev Registers a new agent.
     * @param owner The address that will own the agent NFT.
     * @param agentURI The metadata URI for the agent (usually IPFS).
     * @return The new agent ID.
     */
    function registerAgent(address owner, string memory agentURI) public returns (uint256) {
        uint256 newItemId = ++_nextTokenId;

        _mint(owner, newItemId);
        _setTokenURI(newItemId, agentURI);

        emit AgentRegistered(newItemId, owner, agentURI);
        return newItemId;
    }

    /**
     * @dev Checks if an agent exists.
     * @param agentId The ID of the agent to check.
     */
    function exists(uint256 agentId) public view returns (bool) {
        return _ownerOf(agentId) != address(0);
    }
}
