// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./BlockOpsIdentityRegistry.sol";

/**
 * @title BlockOpsReputationRegistry
 * @dev Implementation of the ERC-8004 Reputation Registry.
 * Allows users to provide feedback on agents registered in the Identity Registry.
 */
contract BlockOpsReputationRegistry is Ownable {
    BlockOpsIdentityRegistry public identityRegistry;

    struct Feedback {
        uint8 value;         // Trust value (e.g., 0-100)
        uint256 weight;      // Weight of feedback (e.g., payment amount)
        string tag;          // Feedback tag (e.g., "successRate")
        string context;      // Context (e.g., "deploy-erc20")
        bytes32 proofHash;   // Hash of proof (e.g., x402 payment tx)
        uint256 timestamp;
        address reviewer;
    }

    // Mapping from agentId to tag to reviewer to feedback
    mapping(uint256 => mapping(string => mapping(address => Feedback))) public feedbacks;
    
    // Total reputation per agent and tag
    mapping(uint256 => mapping(string => uint256)) public totalValue;
    mapping(uint256 => mapping(string => uint256)) public feedbackCount;

    event FeedbackGiven(
        uint256 indexed agentId, 
        address indexed reviewer, 
        string tag, 
        uint8 value, 
        uint256 weight,
        bytes32 proofHash
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
     * @dev Gives feedback on an agent.
     * @param agentId The ID of the agent to rate.
     * @param value The reputation value (0-100).
     * @param weight The weight of this feedback (e.g., payment amount).
     * @param tag The tag for this feedback (e.g., "successRate").
     * @param context Additional context for the feedback.
     * @param proofHash Hash of proof of execution/payment.
     */
    function giveFeedback(
        uint256 agentId,
        uint8 value,
        uint256 weight,
        string memory tag,
        string memory context,
        bytes32 proofHash
    ) public {
        require(identityRegistry.exists(agentId), "Agent does not exist");
        require(value <= 100, "Value must be between 0 and 100");

        Feedback storage fb = feedbacks[agentId][tag][msg.sender];
        
        // If this is a new feedback for this tag, increment count
        if (fb.timestamp == 0) {
            feedbackCount[agentId][tag]++;
        } else {
            // Subtract old value from total if updating
            totalValue[agentId][tag] -= fb.value;
        }

        fb.value = value;
        fb.weight = weight;
        fb.tag = tag;
        fb.context = context;
        fb.proofHash = proofHash;
        fb.timestamp = block.timestamp;
        fb.reviewer = msg.sender;

        totalValue[agentId][tag] += value;

        emit FeedbackGiven(agentId, msg.sender, tag, value, weight, proofHash);
    }

    /**
     * @dev Gets the summary reputation for an agent and tag.
     * @param agentId The ID of the agent.
     * @param tag The tag for the reputation score.
     * @return count Total number of feedbacks.
     * @return summaryValue Total sum of reputation values.
     */
    function getSummary(uint256 agentId, string memory tag) 
        public 
        view 
        returns (uint256 count, uint256 summaryValue) 
    {
        return (feedbackCount[agentId][tag], totalValue[agentId][tag]);
    }

    /**
     * @dev Calculates the average reputation for an agent and tag.
     * @param agentId The ID of the agent.
     * @param tag The tag for the reputation score.
     * @return The average reputation score (0-100).
     */
    function getAverageScore(uint256 agentId, string memory tag) public view returns (uint256) {
        uint256 count = feedbackCount[agentId][tag];
        if (count == 0) return 0;
        return totalValue[agentId][tag] / count;
    }
}
