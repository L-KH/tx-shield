
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';


export const CHAIN_ID = {
  MAINNET: 1,
  SEPOLIA: 11155111,
  POLYGON: 137,
  ARBITRUM: 42161,
  OPTIMISM: 10,
  LINEA: 59144, 
};


export const DEFAULT_CHAIN_ID = 
  process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID ? 
  parseInt(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID) : 
  CHAIN_ID.LINEA;

export const NETWORK_NAMES = {
  [CHAIN_ID.MAINNET]: 'Ethereum Mainnet',
  [CHAIN_ID.SEPOLIA]: 'Sepolia Testnet',
  [CHAIN_ID.POLYGON]: 'Polygon',
  [CHAIN_ID.ARBITRUM]: 'Arbitrum',
  [CHAIN_ID.OPTIMISM]: 'Optimism',
  [CHAIN_ID.LINEA]: 'Linea Mainnet', 
};

export const RPC_URLS = {
  [CHAIN_ID.MAINNET]: 'https://mainnet.infura.io/v3/',
  [CHAIN_ID.SEPOLIA]: 'https://sepolia.infura.io/v3/',
  [CHAIN_ID.POLYGON]: 'https://polygon-mainnet.infura.io/v3/',
  [CHAIN_ID.ARBITRUM]: 'https://arbitrum-mainnet.infura.io/v3/',
  [CHAIN_ID.OPTIMISM]: 'https://optimism-mainnet.infura.io/v3/',
  [CHAIN_ID.LINEA]: 'https://linea-mainnet.infura.io/v3/', 
};

export const BLOCK_EXPLORERS = {
  [CHAIN_ID.MAINNET]: 'https://etherscan.io',
  [CHAIN_ID.SEPOLIA]: 'https://sepolia.etherscan.io',
  [CHAIN_ID.POLYGON]: 'https://polygonscan.com',
  [CHAIN_ID.ARBITRUM]: 'https://arbiscan.io',
  [CHAIN_ID.OPTIMISM]: 'https://optimistic.etherscan.io',
  [CHAIN_ID.LINEA]: 'https://lineascan.build', 
};


export interface TransactionRequest {
  to: string;
  from: string;
  data: string;
  value: string;
  chainId: number;
}


export interface MetaMaskHookResult {
  account: string | null;
  chainId: number | null;
  isCorrectNetwork: boolean;
  networkName: string;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  switchNetwork: (chainId: number) => Promise<boolean>;
  switchToLinea: () => Promise<boolean>; 
  getProvider: () => ethers.providers.Web3Provider | null;
  getSigner: () => ethers.providers.JsonRpcSigner | null;
  interceptTransaction: () => Promise<TransactionRequest | null>;
  sendTransaction: (txData: TransactionRequest) => Promise<any>;
}

export function useMetaMask(): MetaMaskHookResult {
  
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  
  const isCorrectNetwork = chainId === DEFAULT_CHAIN_ID;
  
  
  const networkName = chainId ? NETWORK_NAMES[chainId] || 'Unknown Network' : 'Not Connected';
  
  
  const checkForMetaMask = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    return window.ethereum !== undefined;
  }, []);
  
  
  const handleAccountsChanged = useCallback((accounts: string[]) => {
    if (accounts.length === 0) {
      
      setAccount(null);
      setError('Please connect to MetaMask');
    } else {
      
      setAccount(ethers.utils.getAddress(accounts[0]));
      setError(null);
    }
  }, []);
  
  
  const handleChainChanged = useCallback((chainIdHex: string) => {
    
    const newChainId = parseInt(chainIdHex, 16);
    setChainId(newChainId);
    
    
    if (newChainId !== DEFAULT_CHAIN_ID) {
      setError(`Please switch to ${NETWORK_NAMES[DEFAULT_CHAIN_ID] || 'the correct network'}`);
    } else {
      setError(null);
    }
    
    
    
  }, []);
  
  
  useEffect(() => {
    if (!checkForMetaMask()) return;
    
    const init = async () => {
      try {
        
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          handleAccountsChanged(accounts);
          
          
          const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
          handleChainChanged(chainIdHex);
        }
      } catch (err) {
        console.error('Error initializing MetaMask connection:', err);
      }
    };
    
    
    init();
    
    
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [handleAccountsChanged, handleChainChanged, checkForMetaMask]);
  
  
  const connect = async (): Promise<boolean> => {
    if (!checkForMetaMask()) {
      setError('MetaMask not installed. Please install MetaMask to continue.');
      return false;
    }
    
    setIsConnecting(true);
    setError(null);
    
    try {
      
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      
      
      if (accounts.length > 0) {
        handleAccountsChanged(accounts);
        
        
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        handleChainChanged(chainIdHex);
        
        return true;
      } else {
        setError('No accounts found. Please create an account in MetaMask.');
        return false;
      }
    } catch (err: any) {
      
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
  
  
  const disconnect = () => {
    setAccount(null);
    
    
  };
  
  
  const switchNetwork = async (chainId: number): Promise<boolean> => {
    if (!checkForMetaMask() || !window.ethereum) {
      setError('MetaMask not installed');
      return false;
    }
    
    try {
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
      return true;
    } catch (err: any) {
      
      if (err.code === 4902) {
        return await addNetwork(chainId);
      }
      console.error('Error switching network:', err);
      setError(`Failed to switch network: ${err.message || 'Unknown error'}`);
      return false;
    }
  };
  
  
  const switchToLinea = () => switchNetwork(CHAIN_ID.LINEA);

  
  
  const addNetwork = async (chainId: number): Promise<boolean> => {
    if (!checkForMetaMask()) {
      setError('MetaMask not installed');
      return false;
    }
    
    
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
      [CHAIN_ID.LINEA]: {
        chainId: `0x${CHAIN_ID.LINEA.toString(16)}`,
        chainName: 'Linea Mainnet',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: [RPC_URLS[CHAIN_ID.LINEA]],
        blockExplorerUrls: [BLOCK_EXPLORERS[CHAIN_ID.LINEA]],
      },
      
    };
    
    try {
      
      if (!networks[chainId]) {
        throw new Error(`Network configuration for chain ID ${chainId} not available`);
      }
      
      
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
  
  
  const getProvider = () => {
    if (!checkForMetaMask()) return null;
    return new ethers.providers.Web3Provider(window.ethereum);
  };
  
  
  const getSigner = () => {
    const provider = getProvider();
    if (!provider) return null;
    return provider.getSigner();
  };
  
  
  const interceptTransaction = async (): Promise<TransactionRequest | null> => {
    if (!checkForMetaMask() || !account) {
      setError('MetaMask not connected');
      return null;
    }
    
    try {
      
      
      
      
      
      
      
      
      
      const currentChainId = chainId || DEFAULT_CHAIN_ID;
      
      
      
      const interceptedTx: TransactionRequest = {
        to: '', 
        from: account,
        data: '', 
        value: '0', 
        chainId: currentChainId
      };
      
      return interceptedTx;
    } catch (err: any) {
      console.error('Failed to intercept transaction:', err);
      setError(`Transaction interception failed: ${err.message || 'Unknown error'}`);
      return null;
    }
  };
  
  
  const sendTransaction = async (txData: TransactionRequest): Promise<any> => {
    if (!checkForMetaMask() || !account) {
      setError('MetaMask not connected');
      throw new Error('MetaMask not connected');
    }
    
    try {
      const signer = getSigner();
      if (!signer) {
        throw new Error('No signer available');
      }
      
      
      const tx = {
        to: txData.to,
        from: txData.from,
        data: txData.data,
        value: txData.value ? ethers.BigNumber.from(txData.value) : ethers.BigNumber.from(0),
        chainId: txData.chainId
      };
      
      
      return await signer.sendTransaction(tx);
    } catch (err: any) {
      console.error('Transaction failed:', err);
      setError(`Transaction failed: ${err.message || 'Unknown error'}`);
      throw err;
    }
  };
  
  
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
    switchToLinea, 
    getProvider,
    getSigner,
    interceptTransaction,
    sendTransaction
  };
}

export default useMetaMask;