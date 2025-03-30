// lib/blockchain/enhancedContractService.ts
import { ethers } from 'ethers';
import { CHAIN_ID, NETWORK_NAMES, RPC_URLS, BLOCK_EXPLORERS } from './network';
import TXShieldABI from '@/contracts/abis/TXShield.json';
import ThreatRegistryABI from '@/contracts/abis/ThreatRegistry.json';
import ERC20ABI from '@/contracts/abis/ERC20.json';

// Enhanced contract addresses with support for multiple networks
export const CONTRACT_ADDRESSES = {
  TXShield: {
    [CHAIN_ID.MAINNET]: '0x0000000000000000000000000000000000000000', // Update when deployed to mainnet
    [CHAIN_ID.SEPOLIA]: '0xc076D95F95021D1fBBfe2BDB9692d656B7ddc846',
    [CHAIN_ID.POLYGON]: '0x0000000000000000000000000000000000000000', // Update when deployed to Polygon
    [CHAIN_ID.ARBITRUM]: '0x0000000000000000000000000000000000000000', // Update when deployed to Arbitrum
    [CHAIN_ID.LINEA]: '0xB31A5CdC928Ee7A3Ac915D5d196B733eb2C1b17B', // Linea Mainnet - REPLACE WITH YOUR ACTUAL DEPLOYED ADDRESS
  },
  ThreatRegistry: {
    [CHAIN_ID.MAINNET]: '0x0000000000000000000000000000000000000000', // Update when deployed to mainnet
    [CHAIN_ID.SEPOLIA]: '0xE6597458679e0d8ca9AD31B7dA118E77560028e6',
    [CHAIN_ID.POLYGON]: '0x0000000000000000000000000000000000000000', // Update when deployed to Polygon
    [CHAIN_ID.ARBITRUM]: '0x0000000000000000000000000000000000000000', // Update when deployed to Arbitrum
    [CHAIN_ID.LINEA]: '0x963Cd3E7231fEc38cb658D23279dF9d25203b8f8', // Linea Mainnet - REPLACE WITH YOUR ACTUAL DEPLOYED ADDRESS
  },
};

// 3. Update TOKEN_ADDRESSES in contractService.ts with Linea tokens
export const TOKEN_ADDRESSES = {
  // Mainnet
  [CHAIN_ID.MAINNET]: {
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  },
  // Sepolia
  [CHAIN_ID.SEPOLIA]: {
    WETH: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // Example Sepolia WETH
    USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Example Sepolia USDC
    DAI: '0x68194a729C2450ad26072b3D33ADaCbcef39D574', // Example Sepolia DAI
  },
  // Linea Mainnet
  [CHAIN_ID.LINEA]: {
    WETH: '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f', // Linea WETH
    USDC: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff', // Linea USDC
    USDT: '0xA219439258ca9da29E9Cc4cE5596924745e12B93', // Linea USDT
    DAI: '0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5', // Linea DAI
  },
  // Polygon
  [CHAIN_ID.POLYGON]: {
    WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
  },
  // Arbitrum
  [CHAIN_ID.ARBITRUM]: {
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  },
  // Optimism
};

// Interface for token metadata
export interface TokenMetadata {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

// Cache for contract instances to avoid recreating them
const contractInstances = new Map<string, ethers.Contract>();
const tokenMetadataCache = new Map<string, TokenMetadata>();

/**
 * Clears any cached contract instances and token metadata
 */
export function clearContractCache() {
  contractInstances.clear();
  tokenMetadataCache.clear();
}

/**
 * Gets the cached contract instance or creates a new one if not cached
 */
function getCachedContract(
  address: string, 
  abi: any, 
  signerOrProvider: ethers.Signer | ethers.providers.Provider
): ethers.Contract {
  const key = `${address}-${signerOrProvider instanceof ethers.Signer ? 'signer' : 'provider'}`;
  
  if (contractInstances.has(key)) {
    return contractInstances.get(key)!;
  }
  
  const contract = new ethers.Contract(address, abi, signerOrProvider);
  contractInstances.set(key, contract);
  return contract;
}

/**
 * Gets the TXShield contract instance for the specified chain
 */
export async function getTXShieldContract(
  providerOrSigner: ethers.providers.Provider | ethers.Signer,
  chainId: number
): Promise<ethers.Contract> {
  // Get contract address for the specified chain
  const contractAddress = CONTRACT_ADDRESSES.TXShield[chainId];
  if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
    throw new Error(`TXShield contract not deployed on ${NETWORK_NAMES[chainId]}`);
  }
  
  // If we got a provider, get a signer from it
  let signer: ethers.Signer;
  if (providerOrSigner instanceof ethers.providers.Provider) {
    if ('getSigner' in providerOrSigner) {
      try {
        signer = (providerOrSigner as ethers.providers.Web3Provider).getSigner();
      } catch {
        throw new Error('Provider does not have a signer. Please connect a wallet.');
      }
    } else {
      throw new Error('Provider does not have a signer. Please connect a wallet.');
    }
  } else {
    signer = providerOrSigner;
  }
  
  // Return the contract instance
  return getCachedContract(contractAddress, TXShieldABI, signer);
}

/**
 * Gets the ThreatRegistry contract instance for the specified chain
 */
export async function getThreatRegistryContract(
  providerOrSigner: ethers.providers.Provider | ethers.Signer,
  chainId: number
): Promise<ethers.Contract> {
  // Get contract address for the specified chain
  const contractAddress = CONTRACT_ADDRESSES.ThreatRegistry[chainId];
  if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
    throw new Error(`ThreatRegistry contract not deployed on ${NETWORK_NAMES[chainId]}`);
  }
  
  // Create a provider-backed contract if we're just reading data
  return getCachedContract(contractAddress, ThreatRegistryABI, providerOrSigner);
}

/**
 * Gets an ERC20 token contract instance
 */
export function getERC20Contract(
  tokenAddress: string,
  providerOrSigner: ethers.providers.Provider | ethers.Signer
): ethers.Contract {
  return getCachedContract(tokenAddress, ERC20ABI, providerOrSigner);
}

/**
 * Executes a transaction securely through the TXShield contract
 */
export async function executeSecureTransaction(
  to: string,
  value: string,
  data: string,
  threatLevel: string,
  chainId: number,
  signer: ethers.Signer
): Promise<ethers.ContractReceipt> {
  // Get TXShield contract
  const txShield = await getTXShieldContract(signer, chainId);
  
  // Convert ETH value to wei
  const valueWei = ethers.utils.parseEther(value);
  
  // Calculate fee (0.1% of transaction value)
  const fee = valueWei.mul(10).div(10000);
  const totalValue = valueWei.add(fee);
  
  // Execute transaction through TXShield contract
  const tx = await txShield.secureExecute(
    to,
    valueWei,
    data,
    threatLevel,
    { value: totalValue }
  );
  
  return await tx.wait();
}

/**
 * Gets the transaction history for a user from the TXShield contract
 */
export async function getUserTransactionHistory(
  userAddress: string,
  chainId: number,
  providerOrSigner: ethers.providers.Provider | ethers.Signer,
  page = 0,
  pageSize = 10
): Promise<any[]> {
  try {
    const txShield = await getTXShieldContract(providerOrSigner, chainId);
    return await txShield.getUserTransactionHistory(userAddress, page * pageSize, pageSize);
  } catch (error) {
    console.error('Error getting transaction history:', error);
    return [];
  }
}

/**
 * Creates an ethers provider for the specified chain
 */
export function getProviderForChain(chainId: number): ethers.providers.Provider {
  const rpcUrl = RPC_URLS[chainId];
  if (!rpcUrl) {
    throw new Error(`No RPC URL configured for chain ${chainId}`);
  }
  
  return new ethers.providers.JsonRpcProvider(rpcUrl);
}

/**
 * Check if an address is flagged as a threat
 */
export async function checkAddressThreat(
  address: string,
  chainId: number,
  providerOrSigner?: ethers.providers.Provider | ethers.Signer
): Promise<boolean> {
  try {
    // For testing without provider, return mock data
    if (typeof window === 'undefined' || !window.ethereum) {
      // Mock threat addresses for testing
      const mockThreats = [
        '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
        '0x4648a43b2c14da09fdf38bb7cf8ff5ba58f95b9f'
      ];
      return mockThreats.includes(address.toLowerCase());
    }
    
    // Use provided provider/signer or create one
    const provider = providerOrSigner || 
      new ethers.providers.Web3Provider(window.ethereum as any);
    
    // Get the threat registry contract and check
    const threatRegistry = await getThreatRegistryContract(provider, chainId);
    return await threatRegistry.isThreat(address);
  } catch (error) {
    console.error('Error checking address threat:', error);
    return false;
  }
}

/**
 * Perform a safe token approval with limits
 */
export async function safeApprove(
  tokenAddress: string,
  spenderAddress: string,
  amount: string,
  chainId: number,
  signer: ethers.Signer
): Promise<ethers.ContractReceipt> {
  try {
    // Get TXShield contract
    const txShield = await getTXShieldContract(signer, chainId);
    
    // Convert amount to wei (assumes token has 18 decimals, adjust as needed)
    const amountWei = ethers.utils.parseUnits(amount, 18);
    
    // Approve through TXShield
    const tx = await txShield.safeApprove(tokenAddress, spenderAddress, amountWei);
    return await tx.wait();
  } catch (error) {
    console.error('Error performing safe approval:', error);
    throw error;
  }
}

/**
 * Fetch token metadata and cache it
 */
export async function getTokenMetadata(
  tokenAddress: string,
  chainId: number,
  providerOrSigner: ethers.providers.Provider | ethers.Signer
): Promise<TokenMetadata> {
  const cacheKey = `${chainId}-${tokenAddress.toLowerCase()}`;
  
  // Check cache first
  if (tokenMetadataCache.has(cacheKey)) {
    return tokenMetadataCache.get(cacheKey)!;
  }
  
  try {
    // Get token contract
    const tokenContract = getERC20Contract(tokenAddress, providerOrSigner);
    
    // Fetch token details
    const [symbol, name, decimals] = await Promise.all([
      tokenContract.symbol(),
      tokenContract.name(),
      tokenContract.decimals(),
    ]);
    
    // Create metadata
    const metadata: TokenMetadata = {
      address: tokenAddress,
      symbol,
      name,
      decimals,
      logoURI: `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${tokenAddress}/logo.png`,
    };
    
    // Cache it
    tokenMetadataCache.set(cacheKey, metadata);
    
    return metadata;
  } catch (error) {
    console.error(`Error fetching token metadata for ${tokenAddress}:`, error);
    
    // Return default metadata
    const defaultMetadata: TokenMetadata = {
      address: tokenAddress,
      symbol: 'UNKNOWN',
      name: 'Unknown Token',
      decimals: 18,
    };
    
    return defaultMetadata;
  }
}

/**
 * Get token balance for a user
 */
export async function getTokenBalance(
  tokenAddress: string,
  userAddress: string,
  providerOrSigner: ethers.providers.Provider | ethers.Signer
): Promise<string> {
  try {
    const tokenContract = getERC20Contract(tokenAddress, providerOrSigner);
    const decimals = await tokenContract.decimals();
    const balance = await tokenContract.balanceOf(userAddress);
    
    // Format with proper decimal places
    return ethers.utils.formatUnits(balance, decimals);
  } catch (error) {
    console.error('Error getting token balance:', error);
    return '0';
  }
}

/**
 * Get ETH balance for a user
 */
export async function getETHBalance(
  userAddress: string,
  providerOrSigner: ethers.providers.Provider | ethers.Signer
): Promise<string> {
  try {
    let provider: ethers.providers.Provider;
    
    if (providerOrSigner instanceof ethers.Signer) {
      provider = providerOrSigner.provider!;
    } else {
      provider = providerOrSigner;
    }
    
    const balance = await provider.getBalance(userAddress);
    return ethers.utils.formatEther(balance);
  } catch (error) {
    console.error('Error getting ETH balance:', error);
    return '0';
  }
}

/**
 * Check if a user has approval for a token
 */
export async function getTokenAllowance(
  tokenAddress: string,
  ownerAddress: string,
  spenderAddress: string,
  providerOrSigner: ethers.providers.Provider | ethers.Signer
): Promise<string> {
  try {
    const tokenContract = getERC20Contract(tokenAddress, providerOrSigner);
    const decimals = await tokenContract.decimals();
    const allowance = await tokenContract.allowance(ownerAddress, spenderAddress);
    
    return ethers.utils.formatUnits(allowance, decimals);
  } catch (error) {
    console.error('Error getting token allowance:', error);
    return '0';
  }
}

/**
 * Check if allowance is unlimited (or very high)
 */
export function isUnlimitedAllowance(allowance: string, decimals: number = 18): boolean {
  // Check if allowance is greater than 10^9 tokens
  const unlimitedThreshold = ethers.utils.parseUnits('1000000000', decimals);
  return ethers.BigNumber.from(allowance).gte(unlimitedThreshold);
}