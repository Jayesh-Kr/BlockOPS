const { ethers } = require('ethers');
const { ERC20_TOKEN_ABI } = require('../config/abis');
const { getChainConfig } = require('../config/constants');
const { getProvider, getWallet, getContract } = require('../utils/blockchain');
const { 
  successResponse, 
  errorResponse, 
  validateRequiredFields, 
  getTxExplorerUrl,
  logTransaction 
} = require('../utils/helpers');
const { getChainFromRequest, getChainMetadata, isArbitrumChain } = require('../utils/chains');
const { fireEvent } = require('../services/webhookService')

const STANDARD_ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

/**
 * Transfer native ETH or ERC20 tokens
 * LEGACY: Uses private key (server-side signing) - Use prepareTransfer for MetaMask
 */
async function transfer(req, res) {
  try {
    const { privateKey, toAddress, amount, tokenId, tokenAddress } = req.body;
    const chain = getChainFromRequest(req);
    const chainMetadata = getChainMetadata(chain);

    // Validate required fields
    const validationError = validateRequiredFields(req.body, ['privateKey', 'toAddress', 'amount']);
    if (validationError) {
      return res.status(400).json(validationError);
    }

    const provider = getProvider(chain);
    const wallet = getWallet(privateKey, provider, chain);

    const agentId = req.apiKey?.agentId || null;

    if (tokenAddress && ethers.isAddress(tokenAddress)) {
      return await transferStandardERC20(res, wallet, tokenAddress, toAddress, amount, chain, chainMetadata, agentId);
    }

    // If tokenId is provided, transfer ERC20 tokens
    if (tokenId !== undefined && tokenId !== null) {
      if (!isArbitrumChain(chain)) {
        return res.status(400).json(errorResponse('Factory token transfers are available on Arbitrum Sepolia only.'));
      }
      return await transferERC20(res, wallet, tokenId, toAddress, amount, chain, chainMetadata, agentId);
    }

    // Transfer native ETH
    return await transferNative(res, wallet, provider, toAddress, amount, chain, chainMetadata, agentId);

  } catch (error) {
    console.error('Transfer error:', error);
    return res.status(500).json(
      errorResponse(error.message, error.reason || error.code)
    );
  }
}

/**
 * Prepare transfer transaction for MetaMask signing (client-side)
 * Returns transaction data for user to sign with their wallet
 */
async function prepareTransfer(req, res) {
  try {
    const { fromAddress, toAddress, amount, tokenId, tokenAddress } = req.body;
    const chain = getChainFromRequest(req);
    const chainMetadata = getChainMetadata(chain);

    // Validate required fields
    const validationError = validateRequiredFields(req.body, ['fromAddress', 'toAddress', 'amount']);
    if (validationError) {
      return res.status(400).json(validationError);
    }

    const provider = getProvider(chain);

    if (tokenAddress && ethers.isAddress(tokenAddress)) {
      return await prepareStandardERC20Transfer(res, provider, fromAddress, tokenAddress, toAddress, amount, chain, chainMetadata);
    }

    // If tokenId is provided, prepare ERC20 transfer
    if (tokenId !== undefined && tokenId !== null) {
      if (!isArbitrumChain(chain)) {
        return res.status(400).json(errorResponse('Factory token transfers are available on Arbitrum Sepolia only.'));
      }
      return await prepareERC20Transfer(res, provider, fromAddress, tokenId, toAddress, amount, chain, chainMetadata);
    }

    // Prepare native ETH transfer
    return await prepareNativeTransfer(res, provider, fromAddress, toAddress, amount, chain, chainMetadata);

  } catch (error) {
    console.error('Prepare transfer error:', error);
    return res.status(500).json(
      errorResponse(error.message, error.reason || error.code)
    );
  }
}

/**
 * Transfer ERC20 tokens
 */
async function transferERC20(res, wallet, tokenId, toAddress, amount, chain, chainMetadata, agentId = null) {
  const { FACTORY_ADDRESS } = require('../config/constants');
  
  logTransaction('Transfer ERC20', { tokenId, toAddress, amount, chain });
  
  const factory = getContract(FACTORY_ADDRESS, ERC20_TOKEN_ABI, wallet);
  const tokenIdBigInt = BigInt(tokenId);
  
  // Get token info and decimals
  let decimals = 18;
  let tokenName = 'Unknown';
  let tokenSymbol = 'UNKNOWN';
  try {
    const [nameBytes, symbolBytes, decimalsResult] = await factory.getTokenInfo(tokenIdBigInt);
    decimals = Number(decimalsResult);
    tokenName = ethers.decodeBytes32String(nameBytes);
    tokenSymbol = ethers.decodeBytes32String(symbolBytes);
  } catch (error) {
    console.log('Could not get token info, defaulting to 18 decimals');
  }
  
  const amountInWei = ethers.parseUnits(amount.toString(), decimals);
  
  // Check balance
  const balance = await factory.balanceOf(tokenIdBigInt, wallet.address);
  console.log('Token balance:', ethers.formatUnits(balance, decimals));
  
  if (balance < amountInWei) {
    return res.status(400).json(
      errorResponse('Insufficient token balance', {
        balance: ethers.formatUnits(balance, decimals),
        required: amount.toString()
      })
    );
  }
  
  // Execute transfer
  const tx = await factory.transfer(tokenIdBigInt, toAddress, amountInWei);
  console.log('Transaction sent:', tx.hash);
  
  const receipt = await tx.wait();

  const txData = {
    type: 'erc20',
    transactionHash: receipt.hash,
    from: wallet.address,
    to: toAddress,
    amount: amount,
    tokenId: tokenId,
    factoryAddress: FACTORY_ADDRESS,
    tokenName: tokenName,
    tokenSymbol: tokenSymbol,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    explorerUrl: getTxExplorerUrl(receipt.hash, chain),
    ...chainMetadata
  };

  fireEvent(agentId, 'tx.confirmed', txData);

  return res.json(successResponse(txData));
}

/**
 * Transfer native ETH
 */
async function transferNative(res, wallet, provider, toAddress, amount, chain, chainMetadata, agentId = null) {
  logTransaction('Transfer Native Token', { toAddress, amount, chain });
  
  const balance = await provider.getBalance(wallet.address);
  const amountInWei = ethers.parseEther(amount.toString());

  if (balance < amountInWei) {
    return res.status(400).json(
      errorResponse('Insufficient balance', {
        balance: ethers.formatEther(balance),
        required: amount.toString()
      })
    );
  }

  const tx = {
    to: toAddress,
    value: amountInWei,
  };

  const transactionResponse = await wallet.sendTransaction(tx);
  const receipt = await transactionResponse.wait();

  const txData = {
    type: 'native',
    transactionHash: receipt.hash,
    from: wallet.address,
    to: toAddress,
    amount: amount,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    explorerUrl: getTxExplorerUrl(receipt.hash, chain),
    ...chainMetadata
  };

  fireEvent(agentId, 'tx.confirmed', txData);

  return res.json(successResponse(txData));
}

/**
 * Get native ETH balance
 */
async function getBalance(req, res) {
  try {
    const { address } = req.params;
    const chain = getChainFromRequest(req);
    const provider = getProvider(chain);
    const balance = await provider.getBalance(address);
    const chainMetadata = getChainMetadata(chain);
    
    return res.json(
      successResponse({
        address: address,
        balance: ethers.formatEther(balance),
        balanceWei: balance.toString(),
        ...chainMetadata
      })
    );
  } catch (error) {
    return res.status(500).json(errorResponse(error.message));
  }
}

/**
 * Prepare ERC20 transfer transaction for client-side signing
 */
async function prepareERC20Transfer(res, provider, fromAddress, tokenId, toAddress, amount, chain, chainMetadata) {
  const { FACTORY_ADDRESS } = require('../config/constants');
  
  logTransaction('Prepare ERC20 Transfer', { fromAddress, tokenId, toAddress, amount, chain });
  
  const factory = getContract(FACTORY_ADDRESS, ERC20_TOKEN_ABI, provider);
  const tokenIdBigInt = BigInt(tokenId);
  
  // Get token info and decimals
  let decimals = 18;
  let tokenName = 'Unknown';
  let tokenSymbol = 'UNKNOWN';
  try {
    const [nameBytes, symbolBytes, decimalsResult] = await factory.getTokenInfo(tokenIdBigInt);
    decimals = Number(decimalsResult);
    tokenName = ethers.decodeBytes32String(nameBytes);
    tokenSymbol = ethers.decodeBytes32String(symbolBytes);
  } catch (error) {
    console.log('Could not get token info, defaulting to 18 decimals');
  }
  
  const amountInWei = ethers.parseUnits(amount.toString(), decimals);
  
  // Check balance
  const balance = await factory.balanceOf(tokenIdBigInt, fromAddress);
  console.log('Token balance:', ethers.formatUnits(balance, decimals));
  
  if (balance < amountInWei) {
    return res.status(400).json(
      errorResponse('Insufficient token balance', {
        balance: ethers.formatUnits(balance, decimals),
        required: amount.toString()
      })
    );
  }
  
  // Prepare transaction data
  const data = factory.interface.encodeFunctionData('transfer', [tokenIdBigInt, toAddress, amountInWei]);
  
  return res.json(
    successResponse({
      type: 'erc20',
      requiresMetaMask: true,
      transaction: {
        to: FACTORY_ADDRESS,
        from: fromAddress,
        data: data,
        value: '0x0'
      },
      details: {
        tokenId: tokenId,
        tokenName: tokenName,
        tokenSymbol: tokenSymbol,
        amount: amount,
        toAddress: toAddress,
        fromAddress: fromAddress,
        ...chainMetadata
      },
      ...chainMetadata
    })
  );
}

/**
 * Prepare native ETH transfer transaction for client-side signing
 */
async function prepareNativeTransfer(res, provider, fromAddress, toAddress, amount, chain, chainMetadata) {
  logTransaction('Prepare Native Transfer', { fromAddress, toAddress, amount, chain });
  
  const balance = await provider.getBalance(fromAddress);
  const amountInWei = ethers.parseEther(amount.toString());

  if (balance < amountInWei) {
    return res.status(400).json(
      errorResponse('Insufficient balance', {
        balance: ethers.formatEther(balance),
        required: amount.toString()
      })
    );
  }

  // Return transaction object for MetaMask
  return res.json(
    successResponse({
      type: 'native',
      requiresMetaMask: true,
      transaction: {
        to: toAddress,
        from: fromAddress,
        value: amountInWei.toString()
      },
      details: {
        amount: amount,
        toAddress: toAddress,
        fromAddress: fromAddress,
        ...chainMetadata
      },
      ...chainMetadata
    })
  );
}

async function transferStandardERC20(res, wallet, tokenAddress, toAddress, amount, chain, chainMetadata, agentId = null) {
  logTransaction('Transfer Standard ERC20', { tokenAddress, toAddress, amount, chain });

  const token = new ethers.Contract(tokenAddress, STANDARD_ERC20_ABI, wallet);

  let decimals = 18;
  let tokenName = 'Unknown';
  let tokenSymbol = 'TOKEN';
  try {
    decimals = Number(await token.decimals());
    tokenName = await token.name().catch(() => tokenName);
    tokenSymbol = await token.symbol().catch(() => tokenSymbol);
  } catch (_) {}

  const amountInWei = ethers.parseUnits(amount.toString(), decimals);
  const balance = await token.balanceOf(wallet.address);

  if (balance < amountInWei) {
    return res.status(400).json(
      errorResponse('Insufficient token balance', {
        balance: ethers.formatUnits(balance, decimals),
        required: amount.toString(),
        tokenSymbol
      })
    );
  }

  const tx = await token.transfer(toAddress, amountInWei);
  const receipt = await tx.wait();

  const txData = {
    type: 'erc20',
    transactionHash: receipt.hash,
    from: wallet.address,
    to: toAddress,
    amount,
    tokenAddress,
    tokenName,
    tokenSymbol,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    explorerUrl: getTxExplorerUrl(receipt.hash, chain),
    ...chainMetadata
  };

  fireEvent(agentId, 'tx.confirmed', txData);

  return res.json(successResponse(txData));
}

async function prepareStandardERC20Transfer(res, provider, fromAddress, tokenAddress, toAddress, amount, chain, chainMetadata) {
  logTransaction('Prepare Standard ERC20 Transfer', { fromAddress, tokenAddress, toAddress, amount, chain });

  const token = new ethers.Contract(tokenAddress, STANDARD_ERC20_ABI, provider);

  let decimals = 18;
  let tokenName = 'Unknown';
  let tokenSymbol = 'TOKEN';
  try {
    decimals = Number(await token.decimals());
    tokenName = await token.name().catch(() => tokenName);
    tokenSymbol = await token.symbol().catch(() => tokenSymbol);
  } catch (_) {}

  const amountInWei = ethers.parseUnits(amount.toString(), decimals);
  const balance = await token.balanceOf(fromAddress);

  if (balance < amountInWei) {
    return res.status(400).json(
      errorResponse('Insufficient token balance', {
        balance: ethers.formatUnits(balance, decimals),
        required: amount.toString(),
        tokenSymbol
      })
    );
  }

  const data = token.interface.encodeFunctionData('transfer', [toAddress, amountInWei]);

  return res.json(
    successResponse({
      type: 'erc20',
      requiresMetaMask: true,
      transaction: {
        to: tokenAddress,
        from: fromAddress,
        data,
        value: '0x0'
      },
      details: {
        tokenAddress,
        tokenName,
        tokenSymbol,
        amount,
        toAddress,
        fromAddress,
        ...chainMetadata
      },
      ...chainMetadata
    })
  );
}

module.exports = {
  transfer,
  prepareTransfer,
  getBalance
};
