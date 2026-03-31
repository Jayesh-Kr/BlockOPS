const { ethers } = require('ethers');
const { ERC721_COLLECTION_ABI } = require('../config/abis');
const { getProvider, getWallet, getContract, parseEventFromReceipt } = require('../utils/blockchain');
const { 
  successResponse, 
  errorResponse, 
  validateRequiredFields, 
  getTxExplorerUrl,
  logTransaction 
} = require('../utils/helpers');
const { fireEvent } = require('../services/webhookService');
const { deployErc721Contract } = require('../services/contractDeploymentService');
const { getChainFromRequest, getChainMetadata } = require('../utils/chains');

async function callFirst(contract, candidates) {
  for (const candidate of candidates) {
    const { method, args = [] } = candidate;
    if (typeof contract[method] !== 'function') {
      continue;
    }

    try {
      return await contract[method](...args);
    } catch (_error) {
      // Try next method variant
    }
  }

  throw new Error('No compatible contract method found.');
}

/**
 * Deploy NFT collection by directly deploying a chain-native contract
 */
async function deployNFTCollection(req, res) {
  try {
    const { privateKey, name, symbol, baseURI } = req.body;
    const chain = getChainFromRequest(req);

    // Validate required fields
    const validationError = validateRequiredFields(req.body, ['privateKey', 'name', 'symbol', 'baseURI']);
    if (validationError) {
      return res.status(400).json(validationError);
    }

    logTransaction('Deploy NFT Collection', { name, symbol, baseURI, chain });

    const deployData = await deployErc721Contract({
      privateKey,
      name,
      symbol,
      baseURI,
      chain
    });

    fireEvent(req.apiKey?.agentId || null, 'nft.deployed', deployData);

    return res.json(successResponse({
      message: 'NFT collection deployed successfully',
      ...deployData
    }));

  } catch (error) {
    console.error('Deploy NFT collection error:', error);
    const message = error.message || 'Failed to deploy NFT collection';
    const isClientError = /insufficient balance|required|invalid/i.test(message);
    return res.status(isClientError ? 400 : 500).json(
      errorResponse(message, error.reason || error.code)
    );
  }
}

/**
 * Mint NFT from collection
 */
async function mintNFT(req, res) {
  try {
    const { privateKey, collectionAddress, toAddress } = req.body;
    const chain = getChainFromRequest(req);
    const chainMetadata = getChainMetadata(chain);

    // Validate required fields
    const validationError = validateRequiredFields(req.body, ['privateKey', 'collectionAddress', 'toAddress']);
    if (validationError) {
      return res.status(400).json(validationError);
    }

    const provider = getProvider(chain);
    const wallet = getWallet(privateKey, provider, chain);

    logTransaction('Mint NFT', { collectionAddress, toAddress, chain });

    // Connect to NFT contract
    const nftContract = getContract(collectionAddress, ERC721_COLLECTION_ABI, wallet);

    // Mint NFT
    const tx = await nftContract.mint(toAddress);
    console.log('Mint transaction sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Mint confirmed in block:', receipt.blockNumber);

    // Parse Transfer event to get token ID
    const nftInterface = new ethers.Interface(ERC721_COLLECTION_ABI);
    const eventArgs = parseEventFromReceipt(receipt, nftInterface, 'Transfer');

    const parsedTokenId = eventArgs
      ? (eventArgs.token_id ?? eventArgs.tokenId ?? eventArgs[2])
      : null;
    const tokenId = parsedTokenId !== null && parsedTokenId !== undefined
      ? parsedTokenId.toString()
      : 'unknown';

    const mintData = {
      message: 'NFT minted successfully',
      tokenId: tokenId,
      collectionAddress: collectionAddress,
      owner: toAddress,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      explorerUrl: getTxExplorerUrl(tx.hash, chain),
      ...chainMetadata
    };

    fireEvent(req.apiKey?.agentId || null, 'nft.minted', mintData);

    return res.json(successResponse(mintData));

  } catch (error) {
    console.error('Mint NFT error:', error);
    return res.status(500).json(
      errorResponse(error.message, error.reason || error.code)
    );
  }
}

/**
 * Get NFT information
 */
async function getNFTInfo(req, res) {
  try {
    const { collectionAddress, tokenId } = req.params;
    const chain = getChainFromRequest(req);
    const chainMetadata = getChainMetadata(chain);
    const provider = getProvider(chain);
    const nftContract = getContract(collectionAddress, ERC721_COLLECTION_ABI, provider);

    let tokenIdBigInt;
    try {
      tokenIdBigInt = BigInt(tokenId);
    } catch (_error) {
      return res.status(400).json(errorResponse('Invalid tokenId. Expected a numeric token id.'));
    }

    const owner = await callFirst(nftContract, [
      { method: 'owner_of', args: [tokenIdBigInt] },
      { method: 'ownerOf', args: [tokenIdBigInt] }
    ]);

    const tokenURI = await callFirst(nftContract, [
      { method: 'token_uri', args: [tokenIdBigInt] },
      { method: 'tokenURI', args: [tokenIdBigInt] }
    ]);

    const name = await nftContract.name();
    const symbol = await nftContract.symbol();

    return res.json(
      successResponse({
        collectionAddress: collectionAddress,
        tokenId: tokenId,
        owner: owner,
        tokenURI: tokenURI,
        collectionName: name,
        collectionSymbol: symbol,
        ...chainMetadata
      })
    );
  } catch (error) {
    return res.status(500).json(errorResponse(error.message));
  }
}

module.exports = {
  deployNFTCollection,
  mintNFT,
  getNFTInfo
};
