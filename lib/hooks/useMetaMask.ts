// app/lib/hooks/useMetaMask.ts
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { NETWORK_NAMES, DEFAULT_CHAIN_ID } from '@/lib/blockchain/network';

// Hook for MetaMask integration
export default function useMetaMask() {
  const [account, setAccount] = useState('');
  const [chainId, setChainId] = useState(DEFAULT_CHAIN_ID);
  const [networkName, setNetworkName] = useState(NETWORK_NAMES[DEFAULT_CHAIN_ID] || 'Unknown');
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [provider, setProvider] = useState(null);
  const [pendingTransaction, setPendingTransaction] = useState(null);

  // Initialize web3
  useEffect(() => {
    const init = async () => {
      // Check if MetaMask is installed
      if (window.ethereum) {
        try {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          setProvider(provider);
          
          // Check if already connected
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            setAccount(accounts[0]);
          }
          
          // Get network info
          const network = await provider.getNetwork();
          setChainId(network.chainId);
          setNetworkName(NETWORK_NAMES[network.chainId] || `Chain ${network.chainId}`);
          setIsCorrectNetwork(isSupportedNetwork(network.chainId));
        } catch (error) {
          console.error('Error initializing web3:', error);
        }
      }
    };
    
    init();
    
    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount('');
        }
      });
      
      // Listen for chain changes
      window.ethereum.on('chainChanged', (chainIdHex) => {
        const chainId = parseInt(chainIdHex, 16);
        setChainId(chainId);
        setNetworkName(NETWORK_NAMES[chainId] || `Chain ${chainId}`);
        setIsCorrectNetwork(isSupportedNetwork(chainId));
      });
    }
    
    return () => {
      // Clean up listeners
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);
  
  // Connect wallet
  const connect = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask to use this feature');
      return false;
    }
    
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      return false;
    }
  };
  
  // Switch to Sepolia network
  const switchToSepolia = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask to use this feature');
      return false;
    }
    
    try {
      // Sepolia chainId in hex
      const sepoliaChainId = '0xaa36a7'; // 11155111
      
      try {
        // Try to switch to Sepolia
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: sepoliaChainId }]
        });
      } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: sepoliaChainId,
              chainName: 'Sepolia',
              nativeCurrency: {
                name: 'Sepolia ETH',
                symbol: 'ETH',
                decimals: 18
              },
              rpcUrls: ['https://rpc.sepolia.org'],
              blockExplorerUrls: ['https://sepolia.etherscan.io']
            }]
          });
        } else {
          throw switchError;
        }
      }
      
      // Update chain info
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();
      setChainId(network.chainId);
      setNetworkName(NETWORK_NAMES[network.chainId] || `Chain ${network.chainId}`);
      setIsCorrectNetwork(isSupportedNetwork(network.chainId));
      
      return true;
    } catch (error) {
      console.error('Error switching network:', error);
      return false;
    }
  };
  
  // Check if network is supported
  const isSupportedNetwork = (chainId) => {
    // Supported networks (Sepolia for testing, Mainnet for production)
    return [1, 11155111].includes(chainId);
  };
  
  // Intercept transaction before sending
  const interceptTransaction = useCallback(async () => {
    if (!window.ethereum || !account) {
      alert('Please connect your wallet first');
      return null;
    }
    
    try {
      alert('TX Shield will attempt to capture your next transaction for analysis. Please initiate a transaction in another tab or DApp.');
      
      // Mock transaction for demo purposes
      const mockTransactions = [
        {
          // Token approval (USDC to Uniswap router)
          to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC token address
          data: '0x095ea7b30000000000000000000000007a250d5630b4cf539739df2c5dacb4c659f2488dffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', // Approve unlimited
          value: '0',
          description: 'USDC approval to Uniswap V2 Router (unlimited)'
        },
        {
          // Token swap (ETH to USDC)
          to: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap Router
          data: '0x38ed17390000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000009c40000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000a58950f05fed3d160fb591f9e8bbd1820a6c3720000000000000000000000000000000000000000000000000000000006432d40000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 
          value: '100000000000000000', // 0.1 ETH
          description: 'Swap 0.1 ETH for USDC on Uniswap'
        }
      ];
      
      // Let user select transaction type
      const transactionIndex = prompt(
        `Choose a transaction type to analyze (enter 1-${mockTransactions.length}):\n\n` +
        mockTransactions.map((tx, i) => `${i+1}. ${tx.description}`).join('\n')
      );
      
      if (!transactionIndex) return null;
      
      const index = parseInt(transactionIndex) - 1;
      if (index < 0 || index >= mockTransactions.length) {
        alert('Invalid selection');
        return null;
      }
      
      const selectedTx = mockTransactions[index];
      
      // Create transaction object
      const transaction = {
        from: account,
        to: selectedTx.to,
        data: selectedTx.data,
        value: selectedTx.value,
        chainId
      };
      
      setPendingTransaction(transaction);
      return transaction;
    } catch (error) {
      console.error('Error intercepting transaction:', error);
      return null;
    }
  }, [account, chainId]);
  
  // Send transaction using ethers
  const sendTransaction = async (transaction) => {
    if (!window.ethereum || !account) {
      alert('Please connect your wallet first');
      return null;
    }
    
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      const tx = await signer.sendTransaction({
        to: transaction.to,
        data: transaction.data,
        value: transaction.value ? ethers.BigNumber.from(transaction.value) : undefined
      });
      
      return tx;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  };
  
  return {
    account,
    chainId,
    networkName,
    isCorrectNetwork,
    provider,
    connect,
    switchToSepolia,
    pendingTransaction,
    interceptTransaction,
    sendTransaction
  };
}