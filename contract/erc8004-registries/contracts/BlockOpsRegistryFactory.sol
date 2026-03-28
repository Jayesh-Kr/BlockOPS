// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BlockOpsIdentityRegistry.sol";
import "./BlockOpsReputationRegistry.sol";
import "./BlockOpsValidationRegistry.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BlockOpsRegistryFactory
 * @dev Factory contract to deploy and initialize all ERC-8004 registries for BlockOps.
 */
contract BlockOpsRegistryFactory is Ownable {
    BlockOpsIdentityRegistry   public identityRegistry;
    BlockOpsReputationRegistry public reputationRegistry;
    BlockOpsValidationRegistry public validationRegistry;

    event RegistriesDeployed(
        address identity,
        address reputation,
        address validation
    );

    constructor() Ownable(msg.sender) {
        // Deploy all three registries
        identityRegistry   = new BlockOpsIdentityRegistry();
        reputationRegistry = new BlockOpsReputationRegistry();
        validationRegistry = new BlockOpsValidationRegistry();

        // Initialize reputation and validation registries with identity registry address
        reputationRegistry.initialize(address(identityRegistry));
        validationRegistry.initialize(address(identityRegistry));

        // Transfer ownership of deployed registries to the factory owner
        identityRegistry.transferOwnership(msg.sender);
        reputationRegistry.transferOwnership(msg.sender);
        validationRegistry.transferOwnership(msg.sender);

        emit RegistriesDeployed(
            address(identityRegistry),
            address(reputationRegistry),
            address(validationRegistry)
        );
    }

    /**
     * @dev Gets the addresses of all deployed registries.
     */
    function getRegistries() public view returns (address identity, address reputation, address validation) {
        return (
            address(identityRegistry),
            address(reputationRegistry),
            address(validationRegistry)
        );
    }
}
