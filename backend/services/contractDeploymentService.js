const { ethers } = require('ethers');
const solc = require('solc');
const { getChainConfig } = require('../config/constants');
const { getChainMetadata, normalizeChainId } = require('../utils/chains');
const { getProvider, getWallet } = require('../utils/blockchain');
const { getAddressExplorerUrl, getTxExplorerUrl } = require('../utils/helpers');

const ERC20_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BlockOpsERC20 {
    string public name;
    string public symbol;
    uint8 public immutable decimals;
    address public immutable creator;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory name_, string memory symbol_, uint8 decimals_, uint256 initialSupply_) {
        require(bytes(name_).length > 0, "ERC20: empty name");
        require(bytes(symbol_).length > 0, "ERC20: empty symbol");

        name = name_;
        symbol = symbol_;
        decimals = decimals_;
        creator = msg.sender;
        _mint(msg.sender, initialSupply_);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowedAmount = allowance[from][msg.sender];
        require(allowedAmount >= amount, "ERC20: insufficient allowance");

        if (allowedAmount != type(uint256).max) {
            allowance[from][msg.sender] = allowedAmount - amount;
            emit Approval(from, msg.sender, allowance[from][msg.sender]);
        }

        _transfer(from, to, amount);
        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue) external returns (bool) {
        uint256 newAllowance = allowance[msg.sender][spender] + addedValue;
        allowance[msg.sender][spender] = newAllowance;
        emit Approval(msg.sender, spender, newAllowance);
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool) {
        uint256 currentAllowance = allowance[msg.sender][spender];
        require(currentAllowance >= subtractedValue, "ERC20: decreased allowance below zero");

        uint256 newAllowance = currentAllowance - subtractedValue;
        allowance[msg.sender][spender] = newAllowance;
        emit Approval(msg.sender, spender, newAllowance);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "ERC20: transfer from zero address");
        require(to != address(0), "ERC20: transfer to zero address");

        uint256 senderBalance = balanceOf[from];
        require(senderBalance >= amount, "ERC20: insufficient balance");

        unchecked {
            balanceOf[from] = senderBalance - amount;
        }
        balanceOf[to] += amount;

        emit Transfer(from, to, amount);
    }

    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: mint to zero address");

        totalSupply += amount;
        balanceOf[account] += amount;
        emit Transfer(address(0), account, amount);
    }
}
`;

const ERC721_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BlockOpsERC721 {
    string private _name;
    string private _symbol;
    string private _baseTokenURI;

    address public immutable creator;

    uint256 private _nextTokenId = 1;
    uint256 private _totalSupply;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    modifier onlyCreator() {
        require(msg.sender == creator, "Only creator");
        _;
    }

    constructor(string memory name_, string memory symbol_, string memory baseURI_) {
        require(bytes(name_).length > 0, "ERC721: empty name");
        require(bytes(symbol_).length > 0, "ERC721: empty symbol");

        _name = name_;
        _symbol = symbol_;
        _baseTokenURI = baseURI_;
        creator = msg.sender;
    }

    function name() public view returns (string memory) {
        return _name;
    }

    function symbol() public view returns (string memory) {
        return _symbol;
    }

    function baseURI() public view returns (string memory) {
        return _baseTokenURI;
    }

    function base_uri() external view returns (string memory) {
        return _baseTokenURI;
    }

    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function total_supply() external view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address owner) public view returns (uint256) {
        require(owner != address(0), "ERC721: zero address");
        return _balances[owner];
    }

    function balance_of(address owner) external view returns (uint256) {
        return balanceOf(owner);
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "ERC721: invalid token ID");
        return owner;
    }

    function owner_of(uint256 tokenId) external view returns (address) {
        return ownerOf(tokenId);
    }

    function tokenURI(uint256 tokenId) public view returns (string memory) {
        ownerOf(tokenId);
        return string(abi.encodePacked(_baseTokenURI, _toString(tokenId)));
    }

    function token_uri(uint256 tokenId) external view returns (string memory) {
        return tokenURI(tokenId);
    }

    function getApproved(uint256 tokenId) public view returns (address) {
        ownerOf(tokenId);
        return _tokenApprovals[tokenId];
    }

    function get_approved(uint256 tokenId) external view returns (address) {
        return getApproved(tokenId);
    }

    function isApprovedForAll(address owner, address operator) public view returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function is_approved_for_all(address owner, address operator) external view returns (bool) {
        return isApprovedForAll(owner, operator);
    }

    function approve(address to, uint256 tokenId) public {
        address owner = ownerOf(tokenId);
        require(msg.sender == owner || isApprovedForAll(owner, msg.sender), "ERC721: approve caller is not owner nor approved");

        _tokenApprovals[tokenId] = to;
        emit Approval(owner, to, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) public {
        require(operator != msg.sender, "ERC721: approve to caller");

        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function set_approval_for_all(address operator, bool approved) external returns (bool) {
        setApprovalForAll(operator, approved);
        return true;
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        address owner = ownerOf(tokenId);
        require(owner == from, "ERC721: transfer from incorrect owner");
        require(to != address(0), "ERC721: transfer to zero address");
        require(_isApprovedOrOwner(msg.sender, tokenId), "ERC721: caller is not owner nor approved");

        _approve(address(0), tokenId);

        unchecked {
            _balances[from] -= 1;
        }
        _balances[to] += 1;
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    function transfer_from(address from, address to, uint256 tokenId) external returns (bool) {
        transferFrom(from, to, tokenId);
        return true;
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) public {
        transferFrom(from, to, tokenId);
    }

    function safe_transfer_from(address from, address to, uint256 tokenId) external returns (bool) {
        safeTransferFrom(from, to, tokenId);
        return true;
    }

    function mint(address to) external onlyCreator returns (uint256) {
        require(to != address(0), "ERC721: mint to zero address");

        uint256 tokenId = _nextTokenId;
        _nextTokenId += 1;

        _owners[tokenId] = to;
        _balances[to] += 1;
        _totalSupply += 1;

        emit Transfer(address(0), to, tokenId);
        return tokenId;
    }

    function burn(uint256 tokenId) external returns (bool) {
        address owner = ownerOf(tokenId);
        require(_isApprovedOrOwner(msg.sender, tokenId), "ERC721: caller is not owner nor approved");

        _approve(address(0), tokenId);

        unchecked {
            _balances[owner] -= 1;
        }
        delete _owners[tokenId];
        _totalSupply -= 1;

        emit Transfer(owner, address(0), tokenId);
        return true;
    }

    function _approve(address to, uint256 tokenId) internal {
        _tokenApprovals[tokenId] = to;
        emit Approval(ownerOf(tokenId), to, tokenId);
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address owner = ownerOf(tokenId);
        return spender == owner || getApproved(tokenId) == spender || isApprovedForAll(owner, spender);
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }

        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }

        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }

        return string(buffer);
    }
}
`;

const STANDARD_ERC20_READ_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)'
];

const STANDARD_ERC721_READ_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function baseURI() view returns (string)',
  'function base_uri() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function total_supply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function balance_of(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function owner_of(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function token_uri(uint256 tokenId) view returns (string)',
  'function mint(address to) returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
];

let compiledArtifacts = null;

function compileContracts() {
  if (compiledArtifacts) {
    return compiledArtifacts;
  }

  const input = {
    language: 'Solidity',
    sources: {
      'BlockOpsERC20.sol': { content: ERC20_SOURCE },
      'BlockOpsERC721.sol': { content: ERC721_SOURCE }
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object']
        }
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (Array.isArray(output.errors)) {
    const fatalErrors = output.errors.filter((entry) => entry.severity === 'error');
    if (fatalErrors.length > 0) {
      const details = fatalErrors.map((entry) => entry.formattedMessage || entry.message).join('\n');
      throw new Error(`Contract compilation failed:\n${details}`);
    }
  }

  const erc20 = output.contracts?.['BlockOpsERC20.sol']?.BlockOpsERC20;
  const erc721 = output.contracts?.['BlockOpsERC721.sol']?.BlockOpsERC721;

  if (!erc20?.evm?.bytecode?.object || !erc721?.evm?.bytecode?.object) {
    throw new Error('Compiled bytecode for ERC20/ERC721 contracts is missing.');
  }

  compiledArtifacts = {
    erc20: {
      abi: erc20.abi,
      bytecode: `0x${erc20.evm.bytecode.object}`
    },
    erc721: {
      abi: erc721.abi,
      bytecode: `0x${erc721.evm.bytecode.object}`
    }
  };

  return compiledArtifacts;
}

function normalizeDecimals(decimals) {
  const parsed = Number(decimals);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 255) {
    throw new Error('Invalid decimals value. Expected an integer between 0 and 255.');
  }
  return parsed;
}

function normalizeSupply(initialSupply) {
  const raw = String(initialSupply ?? '').trim().replace(/,/g, '');
  if (!raw) {
    throw new Error('Initial supply is required.');
  }

  if (!/^\d+(\.\d+)?$/.test(raw)) {
    throw new Error('Initial supply must be a positive numeric value.');
  }

  return raw;
}

function calculateEstimatedCost(receipt) {
  const gasUsed = receipt?.gasUsed;
  const gasPrice = receipt?.effectiveGasPrice ?? receipt?.gasPrice;

  if (!gasUsed || !gasPrice) {
    return null;
  }

  return ethers.formatEther(gasUsed * gasPrice);
}

async function getDeploymentContext(privateKey, chain) {
  const selectedChain = normalizeChainId(chain);
  const provider = getProvider(selectedChain);
  const wallet = getWallet(privateKey, provider, selectedChain);
  const chainConfig = getChainConfig(selectedChain);

  const balance = await provider.getBalance(wallet.address);
  if (balance <= 0n) {
    throw new Error(
      `Insufficient balance for gas fees. Fund wallet with ${chainConfig.nativeCurrency.symbol} on ${chainConfig.name}.`
    );
  }

  return {
    selectedChain,
    provider,
    wallet,
    chainConfig,
    chainMetadata: getChainMetadata(selectedChain)
  };
}

async function deployErc20Contract({ privateKey, name, symbol, initialSupply, decimals = 18, chain }) {
  const { erc20 } = compileContracts();
  const { selectedChain, wallet, chainMetadata } = await getDeploymentContext(privateKey, chain);

  const normalizedDecimals = normalizeDecimals(decimals);
  const normalizedSupply = normalizeSupply(initialSupply);
  const initialSupplyRaw = ethers.parseUnits(normalizedSupply, normalizedDecimals);

  const factory = new ethers.ContractFactory(erc20.abi, erc20.bytecode, wallet);
  const contract = await factory.deploy(name, symbol, normalizedDecimals, initialSupplyRaw);
  await contract.waitForDeployment();

  const deploymentTx = contract.deploymentTransaction();
  const receipt = deploymentTx ? await deploymentTx.wait() : null;

  const tokenAddress = await contract.getAddress();
  const txHash = deploymentTx?.hash || receipt?.hash || null;

  return {
    ...chainMetadata,
    contractAddress: tokenAddress,
    tokenAddress,
    transactionHash: txHash,
    blockNumber: receipt?.blockNumber ?? null,
    gasUsed: receipt?.gasUsed ? receipt.gasUsed.toString() : null,
    estimatedCost: calculateEstimatedCost(receipt),
    creator: wallet.address,
    tokenInfo: {
      name,
      symbol,
      decimals: normalizedDecimals,
      totalSupply: normalizedSupply,
      totalSupplyRaw: initialSupplyRaw.toString(),
      initialSupply: normalizedSupply,
      initialSupplyRaw: initialSupplyRaw.toString()
    },
    explorerUrl: getAddressExplorerUrl(tokenAddress, selectedChain),
    transactionUrl: txHash ? getTxExplorerUrl(txHash, selectedChain) : null
  };
}

async function deployErc721Contract({ privateKey, name, symbol, baseURI, chain }) {
  const { erc721 } = compileContracts();
  const { selectedChain, wallet, chainMetadata } = await getDeploymentContext(privateKey, chain);

  const factory = new ethers.ContractFactory(erc721.abi, erc721.bytecode, wallet);
  const contract = await factory.deploy(name, symbol, baseURI);
  await contract.waitForDeployment();

  const deploymentTx = contract.deploymentTransaction();
  const receipt = deploymentTx ? await deploymentTx.wait() : null;

  const collectionAddress = await contract.getAddress();
  const txHash = deploymentTx?.hash || receipt?.hash || null;

  return {
    ...chainMetadata,
    contractAddress: collectionAddress,
    collectionAddress,
    transactionHash: txHash,
    blockNumber: receipt?.blockNumber ?? null,
    gasUsed: receipt?.gasUsed ? receipt.gasUsed.toString() : null,
    estimatedCost: calculateEstimatedCost(receipt),
    creator: wallet.address,
    collectionInfo: {
      name,
      symbol,
      baseURI
    },
    explorerUrl: getAddressExplorerUrl(collectionAddress, selectedChain),
    transactionUrl: txHash ? getTxExplorerUrl(txHash, selectedChain) : null
  };
}

module.exports = {
  deployErc20Contract,
  deployErc721Contract,
  STANDARD_ERC20_READ_ABI,
  STANDARD_ERC721_READ_ABI
};
