const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BlockOps ERC-8004 Registries", function () {
  let factory;
  let identity;
  let reputation;
  let validation;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const RegistryFactory = await ethers.getContractFactory("BlockOpsRegistryFactory");
    factory = await RegistryFactory.deploy();
    await factory.waitForDeployment();

    const [identityAddr, reputationAddr, validationAddr] = await factory.getRegistries();
    
    identity = await ethers.getContractAt("BlockOpsIdentityRegistry", identityAddr);
    reputation = await ethers.getContractAt("BlockOpsReputationRegistry", reputationAddr);
    validation = await ethers.getContractAt("BlockOpsValidationRegistry", validationAddr);
  });

  describe("Identity Registry", function () {
    it("Should register an agent NFT", async function () {
      const agentURI = "ipfs://QmAgentMetadata";
      await identity.registerAgent(user1.address, agentURI);
      
      expect(await identity.ownerOf(1)).to.equal(user1.address);
      expect(await identity.tokenURI(1)).to.equal(agentURI);
      expect(await identity.exists(1)).to.equal(true);
    });

    it("Should increment agent IDs", async function () {
      await identity.registerAgent(user1.address, "uri1");
      await identity.registerAgent(user2.address, "uri2");
      
      expect(await identity.ownerOf(1)).to.equal(user1.address);
      expect(await identity.ownerOf(2)).to.equal(user2.address);
    });
  });

  describe("Reputation Registry", function () {
    beforeEach(async function () {
      await identity.registerAgent(user1.address, "uri1");
    });

    it("Should allow giving feedback", async function () {
      const agentId = 1;
      const value = 95;
      const weight = 1000n;
      const tag = "successRate";
      const context = "deploy-erc20";
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("proof"));

      await reputation.connect(user2).giveFeedback(
        agentId, value, weight, tag, context, proofHash
      );

      const summary = await reputation.getSummary(agentId, tag);
      expect(summary.count).to.equal(1n);
      expect(summary.summaryValue).to.equal(BigInt(value));
      expect(await reputation.getAverageScore(agentId, tag)).to.equal(BigInt(value));
    });

    it("Should calculate average score correctly", async function () {
      const agentId = 1;
      const tag = "successRate";

      await reputation.connect(user1).giveFeedback(agentId, 100, 0, tag, "", ethers.ZeroHash);
      await reputation.connect(user2).giveFeedback(agentId, 50, 0, tag, "", ethers.ZeroHash);

      expect(await reputation.getAverageScore(agentId, tag)).to.equal(75n);
    });
  });

  describe("Validation Registry", function () {
    beforeEach(async function () {
      await identity.registerAgent(user1.address, "uri1");
    });

    it("Should submit and update validation request", async function () {
      const agentId = 1;
      const proofURI = "ipfs://QmProof";
      const requestHash = ethers.keccak256(ethers.toUtf8Bytes("request1"));

      await validation.validationRequest(owner.address, agentId, proofURI, requestHash);
      
      let req = await validation.validationRequests(requestHash);
      expect(req.agentId).to.equal(BigInt(agentId));
      expect(req.status).to.equal(0); // Pending

      await validation.updateValidationStatus(requestHash, 1); // Validated
      req = await validation.validationRequests(requestHash);
      expect(req.status).to.equal(1);
    });
  });
});
