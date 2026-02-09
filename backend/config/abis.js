// TokenFactory ABI (Stylus contract)
const FACTORY_ABI = [
  "function initialize(address implementation) external",
  "function create_token(string name, string symbol, uint256 decimals, uint256 initial_supply) external returns (address)",
  "function get_implementation() external view returns (address)",
  "function get_token_count() external view returns (uint256)",
  "function get_token_by_id(uint256 token_id) external view returns (address)",
  "function get_token_id(address token_address) external view returns (uint256)",
  "function get_tokens(uint256 start, uint256 count) external view returns (address[])",
  "event TokenCreated(address indexed creator, address indexed token_address, string name, string symbol, uint256 initial_supply, uint256 token_id)"
];

// NFTFactory ABI (Stylus contract)
const NFT_FACTORY_ABI = [
  "function initialize(address implementation) external",
  "function create_collection(string name, string symbol, string base_uri) external returns (address)",
  "function get_implementation() external view returns (address)",
  "function get_collection_count() external view returns (uint256)",
  "function get_collection_by_id(uint256 collection_id) external view returns (address)",
  "function get_collection_id(address collection_address) external view returns (uint256)",
  "function get_collections(uint256 start, uint256 count) external view returns (address[])",
  "event CollectionCreated(address indexed creator, address indexed collection_address, string name, string symbol, string base_uri, uint256 collection_id)"
];

// ERC20 Token ABI (for interacting with deployed tokens from Stylus factory)
const ERC20_TOKEN_ABI = [
  "function initialize(string name, string symbol, uint256 decimals, uint256 initialSupply, address creator) external",
  "function creator() external view returns (address)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint256)",
  "function total_supply() external view returns (uint256)",
  "function balance_of(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function transfer_from(address from, address to, uint256 amount) external returns (bool)",
  "function increase_allowance(address spender, uint256 added_value) external returns (bool)",
  "function decrease_allowance(address spender, uint256 subtracted_value) external returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

// ERC721 Collection ABI (Stylus contract)
const ERC721_COLLECTION_ABI = [
  "function initialize(string name, string symbol, string base_uri, address creator) external",
  "function creator() external view returns (address)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function base_uri() external view returns (string)",
  "function token_uri(uint256 token_id) external view returns (string)",
  "function total_supply() external view returns (uint256)",
  "function balance_of(address owner) external view returns (uint256)",
  "function owner_of(uint256 token_id) external view returns (address)",
  "function mint(address to) external returns (uint256)",
  "function burn(uint256 token_id) external returns (bool)",
  "function transfer_from(address from, address to, uint256 token_id) external returns (bool)",
  "function safe_transfer_from(address from, address to, uint256 token_id) external returns (bool)",
  "function approve(address to, uint256 token_id) external returns (bool)",
  "function get_approved(uint256 token_id) external view returns (address)",
  "function set_approval_for_all(address operator, bool approved) external returns (bool)",
  "function is_approved_for_all(address owner, address operator) external view returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed token_id)",
  "event Approval(address indexed owner, address indexed approved, uint256 indexed token_id)",
  "event ApprovalForAll(address indexed owner, address indexed operator, bool approved)"
];

module.exports = {
  FACTORY_ABI,
  NFT_FACTORY_ABI,
  ERC20_TOKEN_ABI,
  ERC721_COLLECTION_ABI
};
