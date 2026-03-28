const hre = require("hardhat");

async function main() {
  console.log("Deploying BlockOps ERC-8004 Registries...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Deploy Registry Factory
  const RegistryFactory = await hre.ethers.getContractFactory("BlockOpsRegistryFactory");
  const factory = await RegistryFactory.deploy();
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log("BlockOpsRegistryFactory deployed to:", factoryAddress);

  // Get individual registry addresses
  const [identityAddr, reputationAddr, validationAddr] = await factory.getRegistries();
  
  console.log("------------------------------------------");
  console.log("BlockOpsIdentityRegistry deployed to:  ", identityAddr);
  console.log("BlockOpsReputationRegistry deployed to:", reputationAddr);
  console.log("BlockOpsValidationRegistry deployed to:", validationAddr);
  console.log("------------------------------------------");

  console.log("Deployment complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
