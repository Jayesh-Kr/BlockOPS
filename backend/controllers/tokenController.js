const { ethers } = require('ethers');
const { FACTORY_ABI, ERC20_TOKEN_ABI, ERC20_STANDARD_ABI } = require('../config/abis');
const { getChainConfig } = require('../config/constants');
const { getProvider, getContract } = require('../utils/blockchain');
const { 
  successResponse, 
  errorResponse, 
  validateRequiredFields, 
  getAddressExplorerUrl,
  logTransaction 
} = require('../utils/helpers');
const { fireEvent } = require('../services/webhookService');
const { deployErc20Contract } = require('../services/contractDeploymentService');
const { getChainFromRequest, getChainMetadata } = require('../utils/chains');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function isAddress(value) {
  return typeof value === 'string' && ethers.isAddress(value);
}

function hasFactoryConfigured(chain) {
  const config = getChainConfig(chain);
  return Boolean(config?.tokenFactoryAddress) && config.tokenFactoryAddress !== ZERO_ADDRESS;
}

function decodeBytes32Safe(value) {
  try {
    return ethers.decodeBytes32String(value);
  } catch (_error) {
    return value;
  }
}

function parseTokenId(value) {
  try {
    return BigInt(value);
  } catch (_error) {
    return null;
  }
}

/**
 * Deploy ERC20 token by directly deploying a chain-native contract
 */
async function deployToken(req, res) {
  try {
    const { privateKey, name, symbol, initialSupply, decimals = 18 } = req.body;
    const chain = getChainFromRequest(req);

    // Validate required fields
    const validationError = validateRequiredFields(req.body, ['privateKey', 'name', 'symbol', 'initialSupply']);
    if (validationError) {
      return res.status(400).json(validationError);
    }

    logTransaction('Deploy ERC20', { name, symbol, decimals, initialSupply, chain });

    const deployData = await deployErc20Contract({
      privateKey,
      name,
      symbol,
      initialSupply,
      decimals,
      chain
    });

    fireEvent(req.apiKey?.agentId || null, 'token.deployed', deployData);

    return res.json(successResponse({
      message: 'Token deployed successfully',
      ...deployData
    }));

  } catch (error) {
    console.error('Deploy token error:', error);
    const message = error.message || 'Failed to deploy token';
    const isClientError = /insufficient balance|invalid decimals|initial supply|required/i.test(message);
    return res.status(isClientError ? 400 : 500).json(
      errorResponse(message, error.reason || error.code)
    );
  }
}

/**
 * Get token information
 */
async function getTokenInfo(req, res) {
  try {
    const { tokenId } = req.params;
    const chain = getChainFromRequest(req);
    const chainMetadata = getChainMetadata(chain);
    const provider = getProvider(chain);

    if (isAddress(tokenId)) {
      const tokenContract = getContract(tokenId, ERC20_STANDARD_ABI, provider);
      const [name, symbol, decimalsResult, totalSupplyRaw] = await Promise.all([
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.decimals(),
        tokenContract.totalSupply()
      ]);

      let creator = null;
      try {
        creator = await tokenContract.creator();
      } catch (_error) {
        creator = null;
      }

      const decimals = Number(decimalsResult);

      return res.json(successResponse({
        tokenId,
        tokenAddress: tokenId,
        name,
        symbol,
        decimals,
        totalSupply: ethers.formatUnits(totalSupplyRaw, decimals),
        totalSupplyRaw: totalSupplyRaw.toString(),
        creator,
        explorerUrl: getAddressExplorerUrl(tokenId, chain),
        ...chainMetadata
      }));
    }

    if (!hasFactoryConfigured(chain)) {
      return res.status(400).json(
        errorResponse('Token factory is not configured on this chain. Pass a token contract address instead of tokenId.')
      );
    }

    const parsedTokenId = parseTokenId(tokenId);
    if (parsedTokenId === null) {
      return res.status(400).json(errorResponse('Invalid tokenId. Provide either a numeric tokenId or a token contract address.'));
    }

    const chainConfig = getChainConfig(chain);
    const factory = getContract(chainConfig.tokenFactoryAddress, FACTORY_ABI, provider);

    const [nameBytes, symbolBytes, decimalsResult, totalSupplyRaw, creator] = await factory.getTokenInfo(parsedTokenId);
    const decimals = Number(decimalsResult);

    return res.json(successResponse({
      tokenId,
      factoryAddress: chainConfig.tokenFactoryAddress,
      name: decodeBytes32Safe(nameBytes),
      symbol: decodeBytes32Safe(symbolBytes),
      decimals,
      totalSupply: ethers.formatUnits(totalSupplyRaw, decimals),
      totalSupplyRaw: totalSupplyRaw.toString(),
      creator,
      explorerUrl: getAddressExplorerUrl(chainConfig.tokenFactoryAddress, chain),
      ...chainMetadata
    }));
  } catch (error) {
    return res.status(500).json(errorResponse(error.message));
  }
}

/**
 * Get token balance
 */
async function getTokenBalance(req, res) {
  try {
    const { tokenId, ownerAddress } = req.params;
    const chain = getChainFromRequest(req);
    const chainMetadata = getChainMetadata(chain);
    const provider = getProvider(chain);

    if (isAddress(tokenId)) {
      const tokenContract = getContract(tokenId, ERC20_STANDARD_ABI, provider);
      const [balanceRaw, decimalsResult] = await Promise.all([
        tokenContract.balanceOf(ownerAddress),
        tokenContract.decimals()
      ]);

      const decimals = Number(decimalsResult);

      return res.json(successResponse({
        tokenId,
        tokenAddress: tokenId,
        ownerAddress,
        balance: ethers.formatUnits(balanceRaw, decimals),
        balanceRaw: balanceRaw.toString(),
        decimals,
        explorerUrl: getAddressExplorerUrl(tokenId, chain),
        ...chainMetadata
      }));
    }

    if (!hasFactoryConfigured(chain)) {
      return res.status(400).json(
        errorResponse('Token factory is not configured on this chain. Pass a token contract address instead of tokenId.')
      );
    }

    const parsedTokenId = parseTokenId(tokenId);
    if (parsedTokenId === null) {
      return res.status(400).json(errorResponse('Invalid tokenId. Provide either a numeric tokenId or a token contract address.'));
    }

    const chainConfig = getChainConfig(chain);
    const factory = getContract(chainConfig.tokenFactoryAddress, ERC20_TOKEN_ABI, provider);

    const balanceRaw = await factory.balanceOf(parsedTokenId, ownerAddress);
    let decimals = 18;
    try {
      const [, , decimalsResult] = await factory.getTokenInfo(parsedTokenId);
      decimals = Number(decimalsResult);
    } catch (_error) {
      decimals = 18;
    }

    return res.json(successResponse({
      tokenId,
      factoryAddress: chainConfig.tokenFactoryAddress,
      ownerAddress,
      balance: ethers.formatUnits(balanceRaw, decimals),
      balanceRaw: balanceRaw.toString(),
      decimals,
      explorerUrl: getAddressExplorerUrl(chainConfig.tokenFactoryAddress, chain),
      ...chainMetadata
    }));
  } catch (error) {
    return res.status(500).json(errorResponse(error.message));
  }
}

module.exports = {
  deployToken,
  getTokenInfo,
  getTokenBalance
};
