// lib/blockchain/contracts.ts
// Smart contract interaction functions for Sepolia testnet

import { ethers } from 'ethers';
import { getProvider } from './network';

// Basic ABIs for our contracts
// You may want to generate these from your compiled contracts
const TXShieldABI = [
  // Main functions we'll use
  "function safeApprove(address token, address spender, uint256 amount) external returns (bool)",
  "function secureExecute(address target, uint256 value, bytes calldata data, string calldata threatLevelSignature) external payable returns (bytes memory)",
  "function safeSwap(address router, bytes calldata swapData, uint256 minOutput, address outputToken) external payable",
  "function getUserTransactionHistory(address user, uint256 offset, uint256 limit) external view returns (tuple(address user, address target, uint256 value, bytes data, uint256 timestamp, bool success, string threatLevel)[] memory)"
];

const ThreatRegistryABI = [
  "function isThreat(address target) external view returns (bool)",
  "function isSignatureThreat(bytes32 signatureHash) external view returns (bool)",
  "function analyzeCalldata(bytes calldata data) external pure returns (bool isThreatening, string memory patternMatch)"
];

// Get contract instances
export function getTXShieldContract(signerOrProvider: ethers.Signer | ethers.providers.Provider = getProvider()) {
  const contractAddress = process.env.NEXT_PUBLIC_TXSHIELD_CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.warn('NEXT_PUBLIC_TXSHIELD_CONTRACT_ADDRESS not set in environment variables');
    return null;
  }
  
  return new ethers.Contract(contractAddress, TXShieldABI, signerOrProvider);
}

export function getThreatRegistryContract(signerOrProvider: ethers.Signer | ethers.providers.Provider = getProvider()) {
  const contractAddress = process.env.NEXT_PUBLIC_THREAT_REGISTRY_ADDRESS;
  if (!contractAddress) {
    console.warn('NEXT_PUBLIC_THREAT_REGISTRY_ADDRESS not set in environment variables');
    return null;
  }
  
  return new ethers.Contract(contractAddress, ThreatRegistryABI, signerOrProvider);
}

// Function to check if an address is a known threat
export async function checkAddressThreat(address: string): Promise<boolean> {
  const threatRegistry = getThreatRegistryContract();
  if (!threatRegistry) return false;
  
  try {
    return await threatRegistry.isThreat(address);
  } catch (error) {
    console.error('Error checking address threat:', error);
    return false;
  }
}

// Function to analyze transaction calldata for threats
export async function analyzeCalldata(data: string): Promise<{isThreatening: boolean, patternMatch: string}> {
  const threatRegistry = getThreatRegistryContract();
  if (!threatRegistry) {
    return { isThreatening: false, patternMatch: 'Registry not available' };
  }
  
  try {
    return await threatRegistry.analyzeCalldata(data);
  } catch (error) {
    console.error('Error analyzing calldata:', error);
    return { isThreatening: false, patternMatch: 'Analysis failed' };
  }
}

// Function to execute a secure transaction through TXShield
export async function executeSecureTransaction(
  target: string,
  value: string, // in ETH
  data: string,
  threatLevel: string
): Promise<ethers.providers.TransactionResponse | null> {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const txShield = getTXShieldContract(signer);
  
  if (!txShield) {
    throw new Error('TXShield contract not configured');
  }
  
  try {
    const valueWei = ethers.utils.parseEther(value);
    
    return await txShield.secureExecute(
      target,
      valueWei,
      data,
      threatLevel,
      { value: valueWei }
    );
  } catch (error) {
    console.error('Error executing secure transaction:', error);
    throw error;
  }
}