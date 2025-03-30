
import { ethers } from 'ethers';
import TXShieldABI from '@/contracts/abis/TXShield.json';
import ThreatRegistryABI from '@/contracts/abis/ThreatRegistry.json';


const CONTRACT_ADDRESSES = {
  TXShield: {
    1: '0x0000000000000000000000000000000000000000', 
    5: '0x0000000000000000000000000000000000000000', 
    11155111: '0xc076D95F95021D1fBBfe2BDB9692d656B7ddc846', 
    59144: '0xB31A5CdC928Ee7A3Ac915D5d196B733eb2C1b17B', 
  },
  ThreatRegistry: {
    1: '0x0000000000000000000000000000000000000000', 
    5: '0x0000000000000000000000000000000000000000', 
    11155111: '0xE6597458679e0d8ca9AD31B7dA118E77560028e6', 
    59144: '0x963Cd3E7231fEc38cb658D23279dF9d25203b8f8', 
  }
};

export const NETWORK_NAMES = {
  1: 'Ethereum',
  5: 'Goerli',
  11155111: 'Sepolia',
  59144: 'Linea', 
};

export const DEFAULT_CHAIN_ID = 59144; 

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

export async function checkAddressThreat(address) {
  try {
    
    if (process.env.NODE_ENV === 'development' && !window.ethereum) {
      
      const mockThreats = [
        '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
        '0x4648a43b2c14da09fdf38bb7cf8ff5ba58f95b9f'
      ];
      return mockThreats.includes(address.toLowerCase());
    }
    
    
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

export async function executeSecureTransaction(to, value, data, threatLevel) {
  try {
    if (!window.ethereum) {
      throw new Error('MetaMask not detected');
    }
    
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const txShield = await getTXShieldContract(provider);
    
    
    const valueWei = ethers.utils.parseEther(value);
    
    
    const fee = valueWei.mul(10).div(10000);
    const totalValue = valueWei.add(fee);
    
    
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

export async function getUserTransactionHistory() {
  try {
    if (!window.ethereum) {
      throw new Error('MetaMask not detected');
    }
    
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const txShield = await getTXShieldContract(provider);
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    
    
    const history = await txShield.getUserTransactionHistory(address, 0, 10);
    return history;
  } catch (error) {
    console.error('Error getting transaction history:', error);
    return [];
  }
}

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

export async function safeApprove(tokenAddress, spenderAddress, amount) {
  try {
    if (!window.ethereum) {
      throw new Error('MetaMask not detected');
    }
    
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const txShield = await getTXShieldContract(provider);
    
    
    const amountWei = ethers.utils.parseUnits(amount, 18); 
    
    const tx = await txShield.safeApprove(tokenAddress, spenderAddress, amountWei);
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    console.error('Error performing safe approval:', error);
    throw error;
  }
}