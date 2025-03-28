// lib/blockchain/useMetaMask.ts
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

// Chain IDs for different networks
export const CHAIN_ID = {
  MAINNET: 1,
  SEPOLIA: 11155111,
  POLYGON: 137,
  ARBITRUM: 42161,
  OPTIMISM: 10,
};

// Default to Sepolia for testing
export const DEFAULT_CHAIN_ID = 
  process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID ? 
  parseInt(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID) : 
  CHAIN_ID.SEPOLIA;

// Network names for display
export const NETWORK_NAMES = {
  [CHAIN_ID.MAINNET]: 'Ethereum Mainnet',
  [CHAIN_ID.SEPOLIA]: 'Sepolia Testnet',
  [CHAIN_ID.POLYGON]: 'Polygon',
  [CHAIN_ID.ARBITRUM]: 'Arbitrum',
  [CHAIN_ID.OPTIMISM]: 'Optimism',
};

// RPC URLs for each network
export const RPC_URLS = {
  [CHAIN_ID.MAINNET]: 'https://mainnet.infura.io/v3/',
  [CHAIN_ID.SEPOLIA]: process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.infura.io/v3/',
  [CHAIN_ID.POLYGON]: 'https://polygon-mainnet.infura.io/v3/',
  [CHAIN_ID.ARBITRUM]: 'https://arbitrum-mainnet.infura.io/v3/',
  [CHAIN_ID.OPTIMISM]: 'https://optimism-mainnet.infura.io/v3/',
};

// Block explorer URLs
export const BLOCK_EXPLORERS = {
  [CHAIN_ID.MAINNET]: 'https://etherscan.io',
  [CHAIN_ID.SEPOLIA]: 'https://sepolia.etherscan.io',
  [CHAIN_ID.POLYGON]: 'https://polygonscan.com',
  [CHAIN_ID.ARBITRUM]: 'https://arbiscan.io',
  [CHAIN_ID.OPTIMISM]: 'https://optimistic.etherscan.io',
};

// Define the return type of the useMetaMask hook
export interface MetaMaskHookResult {
  account: string | null;
  chainId: number | null;
  isCorrectNetwork: boolean;
  networkName: string;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<boolean>;
  disconnect: () => void; // Added disconnect method to the interface
  switchNetwork: (chainId: number) => Promise<boolean>;
  switchToSepolia: () => Promise<boolean>;
  getProvider: () => ethers.providers.Web3Provider | null;
  getSigner: () => ethers.providers.JsonRpcSigner | null;
}

/**
 * Custom hook for MetaMask integration
 * Handles wallet connection, network switching, and account tracking
 */
export function useMetaMask(): MetaMaskHookResult {
  // State variables
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Check if the current network is the expected one (Sepolia by default)
  const isCorrectNetwork = chainId === DEFAULT_CHAIN_ID;
  
  // Get the current network name
  const networkName = chainId ? NETWORK_NAMES[chainId] || 'Unknown Network' : 'Not Connected';
  
  // Utility to check for MetaMask
  const checkForMetaMask = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    return window.ethereum !== undefined;
  }, []);
  
  // Handle account changes
  const handleAccountsChanged = useCallback((accounts: string[]) => {
    if (accounts.length === 0) {
      // User has disconnected all accounts
      setAccount(null);
      setError('Please connect to MetaMask');
    } else {
      // Use the first account
      setAccount(ethers.utils.getAddress(accounts[0]));
      setError(null);
    }
  }, []);
  
  // Handle chain/network changes
  const handleChainChanged = useCallback((chainIdHex: string) => {
    // Convert hex chainId to number
    const newChainId = parseInt(chainIdHex, 16);
    setChainId(newChainId);
    
    // Show a warning if not on the expected network
    if (newChainId !== DEFAULT_CHAIN_ID) {
      setError(`Please switch to ${NETWORK_NAMES[DEFAULT_CHAIN_ID] || 'the correct network'}`);
    } else {
      setError(null);
    }
    
    // MetaMask recommends reloading the page on chain change
    // But for a better UX, we'll just update the state
  }, []);
  
  // Initialize and set up event listeners
  useEffect(() => {
    if (!checkForMetaMask()) return;
    
    const init = async () => {
      try {
        // Check if already connected
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          handleAccountsChanged(accounts);
          
          // Get current chain
          const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
          handleChainChanged(chainIdHex);
        }
      } catch (err) {
        console.error('Error initializing MetaMask connection:', err);
      }
    };
    
    // Run initialization
    init();
    
    // Set up event listeners
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      // Clean up event listeners when component unmounts
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [handleAccountsChanged, handleChainChanged, checkForMetaMask]);
  
  // Connect to MetaMask
  const connect = async (): Promise<boolean> => {
    if (!checkForMetaMask()) {
      setError('MetaMask not installed. Please install MetaMask to continue.');
      return false;
    }
    
    setIsConnecting(true);
    setError(null);
    
    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      
      // Update account state
      if (accounts.length > 0) {
        handleAccountsChanged(accounts);
        
        // Get and set current chain ID
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        handleChainChanged(chainIdHex);
        
        return true;
      } else {
        setError('No accounts found. Please create an account in MetaMask.');
        return false;
      }
    } catch (err: any) {
      // Handle user rejection
      if (err.code === 4001) {
        setError('Please connect to MetaMask');
      } else {
        console.error('Error connecting to MetaMask:', err);
        setError(`Failed to connect: ${err.message || 'Unknown error'}`);
      }
      return false;
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Disconnect (clear state)
  const disconnect = () => {
    setAccount(null);
    // Note: MetaMask doesn't support programmatic disconnection
    // This just clears our local state
  };
  
  // Switch to a different network
  const switchNetwork = async (chainId: number): Promise<boolean> => {
    if (!checkForMetaMask() || !window.ethereum) {
      setError('MetaMask not installed');
      return false;
    }
    
    try {
      // Request network switch
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
      return true;
    } catch (err: any) {
      // Error code 4902 means the chain is not added to MetaMask
      if (err.code === 4902) {
        return await addNetwork(chainId);
      }
      console.error('Error switching network:', err);
      setError(`Failed to switch network: ${err.message || 'Unknown error'}`);
      return false;
    }
  };
  
  // Switch specifically to Sepolia testnet
  const switchToSepolia = () => switchNetwork(CHAIN_ID.SEPOLIA);
  
  // Add a new network to MetaMask if it doesn't exist
  const addNetwork = async (chainId: number): Promise<boolean> => {
    if (!checkForMetaMask()) {
      setError('MetaMask not installed');
      return false;
    }
    
    // Network configurations
    const networks = {
      [CHAIN_ID.SEPOLIA]: {
        chainId: `0x${CHAIN_ID.SEPOLIA.toString(16)}`,
        chainName: 'Sepolia Test Network',
        nativeCurrency: {
          name: 'Sepolia Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: [RPC_URLS[CHAIN_ID.SEPOLIA]],
        blockExplorerUrls: [BLOCK_EXPLORERS[CHAIN_ID.SEPOLIA]],
      },
      // Add other networks here if needed
    };
    
    try {
      // Exit early if network config is not available
      if (!networks[chainId]) {
        throw new Error(`Network configuration for chain ID ${chainId} not available`);
      }
      
      // Add the network to MetaMask
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [networks[chainId]],
      });
      return true;
    } catch (err: any) {
      console.error('Error adding network to MetaMask:', err);
      setError(`Failed to add network: ${err.message || 'Unknown error'}`);
      return false;
    }
  };
  
  // Get Ethereum provider
  const getProvider = () => {
    if (!checkForMetaMask()) return null;
    return new ethers.providers.Web3Provider(window.ethereum);
  };
  
  // Get signer for sending transactions
  const getSigner = () => {
    const provider = getProvider();
    if (!provider) return null;
    return provider.getSigner();
  };
  
  // Return the hook interface
  return {
    account,
    chainId,
    isCorrectNetwork,
    networkName,
    isConnecting,
    error,
    connect,
    disconnect,
    switchNetwork,
    switchToSepolia,
    getProvider,
    getSigner,
  };
}

export default useMetaMask;