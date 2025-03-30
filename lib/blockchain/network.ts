


import { ethers } from 'ethers';

export const CHAIN_ID = {
  MAINNET: 1,
  SEPOLIA: 11155111,
  POLYGON: 137,
  ARBITRUM: 42161,
  LINEA: 59144, 
};


export const DEFAULT_CHAIN_ID = CHAIN_ID.LINEA; 

export const NETWORK_NAMES = {
  [CHAIN_ID.MAINNET]: 'Ethereum Mainnet',
  [CHAIN_ID.SEPOLIA]: 'Sepolia Testnet',
  [CHAIN_ID.POLYGON]: 'Polygon',
  [CHAIN_ID.ARBITRUM]: 'Arbitrum',
  [CHAIN_ID.LINEA]: 'Linea Mainnet', 
};

export const RPC_URLS = {
  [CHAIN_ID.MAINNET]: 'https://mainnet.infura.io/v3/your_infura_key',
  [CHAIN_ID.SEPOLIA]: process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.infura.io/v3/05d4ee46c0344087bdf6444ac21cc894',
  [CHAIN_ID.POLYGON]: 'https://polygon-mainnet.infura.io/v3/your_infura_key',
  [CHAIN_ID.ARBITRUM]: 'https://arbitrum-mainnet.infura.io/v3/05d4ee46c0344087bdf6444ac21cc894',
  [CHAIN_ID.LINEA]: 'https://linea-mainnet.infura.io/v3/05d4ee46c0344087bdf6444ac21cc894', 
};

export const BLOCK_EXPLORERS = {
  [CHAIN_ID.MAINNET]: 'https://etherscan.io',
  [CHAIN_ID.SEPOLIA]: 'https://sepolia.etherscan.io',
  [CHAIN_ID.POLYGON]: 'https://polygonscan.com',
  [CHAIN_ID.ARBITRUM]: 'https://arbiscan.io',
  [CHAIN_ID.LINEA]: 'https://lineascan.build', 
};

export function getProvider() {
  
  if (typeof window !== 'undefined' && window.ethereum) {
    return new ethers.providers.Web3Provider(window.ethereum);
  }
  
  
  return new ethers.providers.JsonRpcProvider(RPC_URLS[DEFAULT_CHAIN_ID]);
}


export async function switchToNetwork(chainId: number) {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not available');
  }
  
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
  } catch (error: any) {
    
    if (error.code === 4902) {
      await addNetwork(chainId);
    } else {
      throw error;
    }
  }
}


export async function addNetwork(chainId: number) {
  if (chainId !== CHAIN_ID.SEPOLIA) {
    throw new Error('Only Sepolia is supported for adding to MetaMask');
  }
  
  await window.ethereum.request({
    method: 'wallet_addEthereumChain',
    params: [
      {
        chainId: `0x${CHAIN_ID.SEPOLIA.toString(16)}`,
        chainName: NETWORK_NAMES[CHAIN_ID.SEPOLIA],
        nativeCurrency: {
          name: 'Sepolia ETH',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: [RPC_URLS[CHAIN_ID.SEPOLIA]],
        blockExplorerUrls: [BLOCK_EXPLORERS[CHAIN_ID.SEPOLIA]],
      },
    ],
  });
}