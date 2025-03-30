// lib/hooks/useBlockchainData.ts
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import useMetaMask from './useMetaMask';
import {
  getTokenBalance,
  getETHBalance,
  getUserTransactionHistory,
  getTokenMetadata,
  getTokenAllowance,
  TokenMetadata
} from '../blockchain/contractService';

// The structure for a token with balance
export interface TokenWithBalance {
  metadata: TokenMetadata;
  balance: string;
  balanceUSD: number | null;
  priceUSD: number | null;
}

// Interface for token prices
interface TokenPrices {
  [tokenSymbol: string]: number;
}

// Transaction structure
export interface Transaction {
  user: string;
  target: string;
  value: string;
  data: string;
  timestamp: number;
  success: boolean;
  threatLevel: string;
  hash?: string;
}

// Blockchain state interface
export interface BlockchainState {
  blockNumber: number | null;
  gasPrice: string | null;
  ethBalance: string | null;
  tokens: TokenWithBalance[];
  transactions: Transaction[];
  transactionsLoading: boolean;
  tokensLoading: boolean;
  error: string | null;
  allowances: Record<string, string>;
}

// Hook for accessing blockchain data
export default function useBlockchainData() {
  const { account, chainId, getProvider } = useMetaMask();
  const isConnected = !!account;
  
  // Get the provider instance
  const provider = getProvider();
  
  // Internal state
  const [state, setState] = useState<BlockchainState>({
    blockNumber: null,
    gasPrice: null,
    ethBalance: null,
    tokens: [],
    transactions: [],
    transactionsLoading: false,
    tokensLoading: false,
    error: null,
    allowances: {},
  });
  
  // Token prices (in a real app, would come from an API)
  const [tokenPrices, setTokenPrices] = useState<TokenPrices>({
    'ETH': 1800,
    'WETH': 1800,
    'USDC': 1,
    'USDT': 1,
    'DAI': 1,
  });
  
  // Fetch the current block number and gas price
  const fetchBlockchainInfo = useCallback(async () => {
    if (!provider || !isConnected) return;
    
    try {
      const [blockNumber, gasPrice] = await Promise.all([
        provider.getBlockNumber(),
        provider.getGasPrice(),
      ]);
      
      setState(prev => ({
        ...prev,
        blockNumber,
        gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei'),
      }));
    } catch (error) {
      console.error('Error fetching blockchain info:', error);
      setState(prev => ({ ...prev, error: 'Failed to fetch blockchain data' }));
    }
  }, [provider, isConnected]);
  
  // Fetch ETH balance
  const fetchEthBalance = useCallback(async () => {
    if (!provider || !account || !isConnected) return;
    
    try {
      const ethBalance = await getETHBalance(account, provider);
      
      setState(prev => ({
        ...prev,
        ethBalance,
      }));
    } catch (error) {
      console.error('Error fetching ETH balance:', error);
      setState(prev => ({ ...prev, error: 'Failed to fetch ETH balance' }));
    }
  }, [provider, account, isConnected]);
  
  // Fetch token balances
  const fetchTokenBalances = useCallback(async (tokenAddresses: string[]) => {
    if (!provider || !account || !isConnected || !chainId) return;
    
    try {
      setState(prev => ({ ...prev, tokensLoading: true }));
      
      // Fetch all token data in parallel
      const tokenData = await Promise.all(
        tokenAddresses.map(async (address) => {
          try {
            const [metadata, balance] = await Promise.all([
              getTokenMetadata(address, chainId, provider),
              getTokenBalance(address, account, provider),
            ]);
            
            // Calculate USD value if price is available
            const priceUSD = tokenPrices[metadata.symbol] || null;
            const balanceUSD = priceUSD ? parseFloat(balance) * priceUSD : null;
            
            return {
              metadata,
              balance,
              balanceUSD,
              priceUSD,
            };
          } catch (error) {
            console.error(`Error fetching data for token ${address}:`, error);
            return null;
          }
        })
      );
      
      // Filter out failed token fetches
      const validTokens = tokenData.filter(Boolean) as TokenWithBalance[];
      
      setState(prev => ({
        ...prev,
        tokens: validTokens,
        tokensLoading: false,
      }));
    } catch (error) {
      console.error('Error fetching token balances:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to fetch token balances',
        tokensLoading: false,
      }));
    }
  }, [provider, account, isConnected, chainId, tokenPrices]);
  
  // Fetch transaction history
  const fetchTransactionHistory = useCallback(async (page = 0, pageSize = 10) => {
    if (!provider || !account || !isConnected || !chainId) return;
    
    try {
      setState(prev => ({ ...prev, transactionsLoading: true }));
      
      const txHistory = await getUserTransactionHistory(
        account,
        chainId,
        provider,
        page,
        pageSize
      );
      
      // Transform the transaction data as needed
      const transactions = txHistory.map((tx: any) => ({
        user: tx.user,
        target: tx.target,
        value: ethers.utils.formatEther(tx.value),
        data: tx.data,
        timestamp: tx.timestamp.toNumber(),
        success: tx.success,
        threatLevel: tx.threatLevel,
      }));
      
      setState(prev => ({
        ...prev,
        transactions,
        transactionsLoading: false,
      }));
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to fetch transaction history',
        transactionsLoading: false,
      }));
    }
  }, [provider, account, isConnected, chainId]);
  
  // Check token allowances for a specific spender
  const checkAllowances = useCallback(async (
    tokenAddresses: string[],
    spenderAddress: string
  ) => {
    if (!provider || !account || !isConnected) return;
    
    try {
      const allowances: Record<string, string> = {};
      
      await Promise.all(
        tokenAddresses.map(async (tokenAddress) => {
          try {
            const allowance = await getTokenAllowance(
              tokenAddress,
              account,
              spenderAddress,
              provider
            );
            
            allowances[tokenAddress.toLowerCase()] = allowance;
          } catch (error) {
            console.error(`Error checking allowance for ${tokenAddress}:`, error);
          }
        })
      );
      
      setState(prev => ({
        ...prev,
        allowances: {
          ...prev.allowances,
          ...allowances,
        },
      }));
      
      return allowances;
    } catch (error) {
      console.error('Error checking allowances:', error);
      return {};
    }
  }, [provider, account, isConnected]);
  
  // Refresh all data
  const refreshAllData = useCallback(() => {
    fetchBlockchainInfo();
    fetchEthBalance();
    
    // Add your token addresses here
    if (chainId) {
      const commonTokens = [];
      
      // Use Linea tokens if on Linea network
      if (chainId === 59144) {
        commonTokens.push(
          '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f', // WETH on Linea
          '0x176211869cA2b568f2A7D4EE941E073a821EE1ff', // USDC on Linea
          '0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5'  // DAI on Linea
        );
      } else if (chainId === 11155111) {
        // Fallback to Sepolia tokens
        commonTokens.push(
          '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // WETH on Sepolia
          '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // USDC on Sepolia
          '0x68194a729C2450ad26072b3D33ADaCbcef39D574'  // DAI on Sepolia
        );
      }
      
      if (commonTokens.length > 0) {
        fetchTokenBalances(commonTokens);
      }
      fetchTransactionHistory();
    }
  }, [
    chainId, 
    fetchBlockchainInfo, 
    fetchEthBalance, 
    fetchTokenBalances, 
    fetchTransactionHistory
  ]);
  
  // Effect to set up event listeners
  useEffect(() => {
    if (!provider || !isConnected) return;
    
    // Setup event listeners for new blocks
    const onBlock = (blockNumber: number) => {
      setState(prev => ({ ...prev, blockNumber }));
      
      // Refresh gas price periodically (not on every block)
      if (blockNumber % 10 === 0) {
        provider.getGasPrice().then(gasPrice => {
          setState(prev => ({
            ...prev,
            gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei'),
          }));
        });
      }
    };
    
    provider.on('block', onBlock);
    
    // Initial data fetch
    refreshAllData();
    
    // Cleanup
    return () => {
      provider.removeListener('block', onBlock);
    };
  }, [provider, isConnected, refreshAllData]);
  
  // Effect to refresh when account or chain changes
  useEffect(() => {
    if (isConnected && account && chainId) {
      refreshAllData();
    } else {
      // Reset state when disconnected
      setState({
        blockNumber: null,
        gasPrice: null,
        ethBalance: null,
        tokens: [],
        transactions: [],
        transactionsLoading: false,
        tokensLoading: false,
        error: null,
        allowances: {},
      });
    }
  }, [isConnected, account, chainId, refreshAllData]);
  
  return {
    ...state,
    refreshAllData,
    fetchTokenBalances,
    fetchTransactionHistory,
    checkAllowances,
  };
}