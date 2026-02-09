const { ethers } = require('ethers');
const { FACTORY_ADDRESS } = require('../config/constants');
const { FACTORY_ABI, ERC20_TOKEN_ABI } = require('../config/abis');
const { getProvider, getWallet, getContract, parseEventFromReceipt } = require('../utils/blockchain');
const { 
  successResponse, 
  errorResponse, 
  validateRequiredFields, 
  getTxExplorerUrl, 
  getAddressExplorerUrl,
  logTransaction 
} = require('../utils/helpers');

/**
 * Deploy ERC20 Token via Stylus TokenFactory
 */
async function deployToken(req, res) {
  try {
    const { privateKey, name, symbol, initialSupply, decimals = 18 } = req.body;

    // Validate required fields
    const validationError = validateRequiredFields(req.body, ['privateKey', 'name', 'symbol', 'initialSupply']);
    if (validationError) {
      return res.status(400).json(validationError);
    }

    // Check if factory is configured
    if (FACTORY_ADDRESS === '0x0000000000000000000000000000000000000000') {
      return res.status(500).json(
        errorResponse('TokenFactory contract address not configured. Please set TOKEN_FACTORY_ADDRESS in environment variables.')
      );
    }

    const provider = getProvider();
    const wallet = getWallet(privateKey, provider);

    // Check balance for gas
    const balance = await provider.getBalance(wallet.address);
    logTransaction('Deploy Token', { name, symbol, decimals, initialSupply, balance: ethers.formatEther(balance) });
    
    if (balance === 0n) {
      return res.status(400).json(
        errorResponse('Insufficient balance for gas fees', 'Please fund your wallet with ETH on Arbitrum Sepolia')
      );
    }

    // Connect to factory
    const factory = getContract(FACTORY_ADDRESS, FACTORY_ABI, wallet);

    // Convert values to BigInt
    const decimalsBigInt = BigInt(decimals.toString());
    const initialSupplyBigInt = BigInt(initialSupply.toString());

    // Estimate gas
    let gasEstimate;
    let estimatedCost = null;
    try {
      gasEstimate = await factory.create_token.estimateGas(name, symbol, decimalsBigInt, initialSupplyBigInt);
      
      const feeData = await provider.getFeeData();
      if (feeData.gasPrice) {
        const estimatedCostWei = gasEstimate * feeData.gasPrice;
        estimatedCost = ethers.formatEther(estimatedCostWei);
        
        // Check if balance is sufficient
        const gasBuffer = estimatedCostWei * 12n / 10n;
        if (balance < gasBuffer) {
          return res.status(400).json(
            errorResponse('Insufficient balance for gas fees', {
              balance: ethers.formatEther(balance),
              estimatedCost: estimatedCost,
              required: ethers.formatEther(gasBuffer)
            })
          );
        }
      }
    } catch (estimateError) {
      console.warn('Gas estimation failed:', estimateError.message);
    }

    // Create token
    const tx = gasEstimate 
      ? await factory.create_token(name, symbol, decimalsBigInt, initialSupplyBigInt, { gasLimit: gasEstimate * 12n / 10n })
      : await factory.create_token(name, symbol, decimalsBigInt, initialSupplyBigInt);

    console.log('Transaction sent:', tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log('Transaction confirmed in block:', receipt.blockNumber);

    // Parse event to get token address
    const factoryInterface = new ethers.Interface(FACTORY_ABI);
    const eventArgs = parseEventFromReceipt(receipt, factoryInterface, 'TokenCreated');
    
    if (!eventArgs) {
      throw new Error('Failed to parse TokenCreated event from receipt');
    }

    const newTokenAddress = eventArgs.token_address;
    console.log('Token created at:', newTokenAddress);

    // Get token info
    const tokenContract = getContract(newTokenAddress, ERC20_TOKEN_ABI, provider);
    let tokenInfo = { name, symbol, decimals, totalSupply: initialSupply };

    try {
      const creatorAddress = await tokenContract.creator();
      const actualSupply = await tokenContract.total_supply();
      tokenInfo.creator = creatorAddress;
      tokenInfo.actualTotalSupply = actualSupply.toString();
    } catch (error) {
      console.warn('Could not fetch token info:', error.message);
    }

    return res.json(
      successResponse({
        message: 'Token deployed successfully via Stylus TokenFactory',
        tokenAddress: newTokenAddress,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        estimatedCost: estimatedCost,
        creator: wallet.address,
        tokenInfo: tokenInfo,
        explorerUrl: getAddressExplorerUrl(newTokenAddress),
        transactionUrl: getTxExplorerUrl(receipt.hash)
      })
    );

  } catch (error) {
    console.error('Deploy token error:', error);
    return res.status(500).json(
      errorResponse(error.message, error.reason || error.code)
    );
  }
}

/**
 * Get token information
 */
async function getTokenInfo(req, res) {
  try {
    const { tokenAddress } = req.params;
    const provider = getProvider();
    const tokenContract = getContract(tokenAddress, ERC20_TOKEN_ABI, provider);
    
    const name = await tokenContract.name();
    const symbol = await tokenContract.symbol();
    const decimals = await tokenContract.decimals();
    const totalSupply = await tokenContract.total_supply();
    const creator = await tokenContract.creator();
    
    return res.json(
      successResponse({
        tokenAddress: tokenAddress,
        name: name,
        symbol: symbol,
        decimals: Number(decimals),
        totalSupply: ethers.formatUnits(totalSupply, Number(decimals)),
        totalSupplyRaw: totalSupply.toString(),
        creator: creator,
        network: 'Arbitrum Sepolia'
      })
    );
  } catch (error) {
    return res.status(500).json(errorResponse(error.message));
  }
}

/**
 * Get token balance
 */
async function getTokenBalance(req, res) {
  try {
    const { tokenAddress, ownerAddress } = req.params;
    const provider = getProvider();
    const tokenContract = getContract(tokenAddress, ERC20_TOKEN_ABI, provider);
    
    const balance = await tokenContract.balance_of(ownerAddress);
    let decimals = 18;
    
    try {
      const decimalsResult = await tokenContract.decimals();
      decimals = Number(decimalsResult);
    } catch (e) {
      console.log('Could not get decimals, using 18');
    }
    
    return res.json(
      successResponse({
        tokenAddress: tokenAddress,
        ownerAddress: ownerAddress,
        balance: ethers.formatUnits(balance, decimals),
        balanceRaw: balance.toString(),
        decimals: decimals,
        network: 'Arbitrum Sepolia'
      })
    );
  } catch (error) {
    return res.status(500).json(errorResponse(error.message));
  }
}

module.exports = {
  deployToken,
  getTokenInfo,
  getTokenBalance
};
