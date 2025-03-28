// app/lib/blockchain/contracts.ts
import { ethers } from 'ethers';
import TXShieldABI from '@/contracts/abis/TXShield.json';
import ThreatRegistryABI from '@/contracts/abis/ThreatRegistry.json';

// Deployed contract addresses - replace with your actual deployed addresses
const CONTRACT_ADDRESSES = {
  TXShield: {
    1: '0x0000000000000000000000000000000000000000', // Mainnet (placeholder)
    5: '0x0000000000000000000000000000000000000000', // Goerli (placeholder)
    11155111: '0xc076D95F95021D1fBBfe2BDB9692d656B7ddc846', // Sepolia - REPLACE WITH YOUR DEPLOYED ADDRESS
  },
  ThreatRegistry: {
    1: '0x0000000000000000000000000000000000000000', // Mainnet (placeholder)
    5: '0x0000000000000000000000000000000000000000', // Goerli (placeholder)
    11155111: '0xE6597458679e0d8ca9AD31B7dA118E77560028e6', // Sepolia - REPLACE WITH YOUR DEPLOYED ADDRESS
  }
};

export const NETWORK_NAMES = {
  1: 'Ethereum',
  5: 'Goerli',
  11155111: 'Sepolia',
};

export const DEFAULT_CHAIN_ID = 11155111; // Sepolia

/**
 * Get contract instance for TXShield
 */
export async function getTXShieldContract(provider) {
  try {
    const signer = provider.getSigner();
    const { chainId } = await provider.getNetwork();
    
    const contractAddress = CONTRACT_ADDRESSES.TXShield[chainId];
    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error(`TXShield not deployed on network with chainId ${chainId}`);
    }
    
    return new ethers.Contract(contractAddress, TXShieldABI, signer);
  } catch (error) {
    console.error('Error getting TXShield contract:', error);
    throw error;
  }
}

/**
 * Get contract instance for ThreatRegistry
 */
export async function getThreatRegistryContract(provider) {
  try {
    const signer = provider.getSigner();
    const { chainId } = await provider.getNetwork();
    
    const contractAddress = CONTRACT_ADDRESSES.ThreatRegistry[chainId];
    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error(`ThreatRegistry not deployed on network with chainId ${chainId}`);
    }
    
    return new ethers.Contract(contractAddress, ThreatRegistryABI, signer);
  } catch (error) {
    console.error('Error getting ThreatRegistry contract:', error);
    throw error;
  }
}

/**
 * Check if an address is flagged as a threat
 */
export async function checkAddressThreat(address) {
  try {
    // For testing without provider, return mock data
    if (process.env.NODE_ENV === 'development' && !window.ethereum) {
      // Mock threat addresses for testing
      const mockThreats = [
        '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
        '0x4648a43b2c14da09fdf38bb7cf8ff5ba58f95b9f'
      ];
      return mockThreats.includes(address.toLowerCase());
    }
    
    // Use real contract in production with connected wallet
    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const threatRegistry = await getThreatRegistryContract(provider);
      return await threatRegistry.isThreat(address);
    }
    
    return false;
  } catch (error) {
    console.error('Error checking address threat:', error);
    return false;
  }
}

/**
 * Execute a transaction securely through the TXShield contract
 */
export async function executeSecureTransaction(to, value, data, threatLevel) {
  try {
    if (!window.ethereum) {
      throw new Error('MetaMask not detected');
    }
    
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const txShield = await getTXShieldContract(provider);
    
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
    
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    console.error('Error executing secure transaction:', error);
    throw error;
  }
}

/**
 * Get transaction history for the current user
 */
export async function getUserTransactionHistory() {
  try {
    if (!window.ethereum) {
      throw new Error('MetaMask not detected');
    }
    
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const txShield = await getTXShieldContract(provider);
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    
    // Get transaction history (first 10 transactions)
    const history = await txShield.getUserTransactionHistory(address, 0, 10);
    return history;
  } catch (error) {
    console.error('Error getting transaction history:', error);
    return [];
  }
}

/**
 * Set user security settings
 */
export async function updateSecuritySettings(settings) {
  try {
    if (!window.ethereum) {
      throw new Error('MetaMask not detected');
    }
    
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const txShield = await getTXShieldContract(provider);
    
    const tx = await txShield.updateSettings(settings);
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    console.error('Error updating security settings:', error);
    throw error;
  }
}

/**
 * Perform a safe token approval with limits
 */
export async function safeApprove(tokenAddress, spenderAddress, amount) {
  try {
    if (!window.ethereum) {
      throw new Error('MetaMask not detected');
    }
    
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const txShield = await getTXShieldContract(provider);
    
    // Convert amount to wei
    const amountWei = ethers.utils.parseUnits(amount, 18); // Assuming 18 decimals, adjust as needed
    
    const tx = await txShield.safeApprove(tokenAddress, spenderAddress, amountWei);
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    console.error('Error performing safe approval:', error);
    throw error;
  }
}