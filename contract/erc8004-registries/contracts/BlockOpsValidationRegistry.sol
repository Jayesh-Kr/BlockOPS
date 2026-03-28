// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./BlockOpsIdentityRegistry.sol";

/**
 * @title BlockOpsValidationRegistry
 * @dev Implementation of the ERC-8004 Validation Registry.
 * Provides a permanent record of whether an agent's actions were successful.
 */
contract BlockOpsValidationRegistry is Ownable {
    BlockOpsIdentityRegistry public identityRegistry;

    struct ValidationRequest {
        address validator;   // The address of the validator
        uint256 agentId;     // The ID of the agent being validated
        string proofURI;     // URI containing proof data (IPFS/Arweave)
        bytes32 requestHash; // Unique hash of the validation request
        uint8 status;        // 0: pending, 1: validated, 2: rejected
        uint256 timestamp;
    }

    // Mapping from requestHash to ValidationRequest
    mapping(bytes32 => ValidationRequest) public validationRequests;
    
    // Mapping from agentId to all its validation requests
    mapping(uint256 => bytes32[]) public agentValidations;

    event ValidationRequested(
        bytes32 indexed requestHash, 
        uint256 indexed agentId, 
        address indexed validator, 
        string proofURI
    );
    
    event ValidationStatusUpdated(
        bytes32 indexed requestHash, 
        uint256 indexed agentId, 
        uint8 status
    );

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Initializes the registry with the Identity Registry address.
     * @param _identityRegistry The address of the Identity Registry.
     */
    function initialize(address _identityRegistry) external onlyOwner {
        identityRegistry = BlockOpsIdentityRegistry(_identityRegistry);
    }

    /**
     * @dev Submits a validation request for an agent's execution.
     * @param validator The address expected to validate the proof.
     * @param agentId The ID of the agent that executed the task.
     * @param proofURI The metadata URI for the execution proof.
     * @param requestHash Unique identifier for the validation request.
     */
    function validationRequest(
        address validator,
        uint256 agentId,
        string memory proofURI,
        bytes32 requestHash
    ) public {
        require(identityRegistry.exists(agentId), "Agent does not exist");
        require(validationRequests[requestHash].timestamp == 0, "Request already exists");

        validationRequests[requestHash] = ValidationRequest({
            validator: validator,
            agentId: agentId,
            proofURI: proofURI,
            requestHash: requestHash,
            status: 0,
            timestamp: block.timestamp
        });

        agentValidations[agentId].push(requestHash);

        emit ValidationRequested(requestHash, agentId, validator, proofURI);
    }

    /**
     * @dev Updates the status of a validation request (only by validator or owner).
     * @param requestHash The unique hash of the request.
     * @param status The new status (1: validated, 2: rejected).
     */
    function updateValidationStatus(bytes32 requestHash, uint8 status) public {
        ValidationRequest storage req = validationRequests[requestHash];
        require(req.timestamp > 0, "Request not found");
        require(msg.sender == req.validator || msg.sender == owner(), "Not authorized");
        require(status == 1 || status == 2, "Invalid status");

        req.status = status;

        emit ValidationStatusUpdated(requestHash, req.agentId, status);
    }

    /**
     * @dev Gets all validation request hashes for an agent.
     * @param agentId The ID of the agent.
     */
    function getAgentValidations(uint256 agentId) public view returns (bytes32[] memory) {
        return agentValidations[agentId];
    }
}
