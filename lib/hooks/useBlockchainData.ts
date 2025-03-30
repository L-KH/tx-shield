
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


export interface TokenWithBalance {
  metadata: TokenMetadata;
  balance: string;
  balanceUSD: number | null;
  priceUSD: number | null;
}


interface TokenPrices {
  [tokenSymbol: string]: number;
}


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


export default function useBlockchainData() {
  const { account, chainId, getProvider } = useMetaMask();
  const isConnected = !!account;
  
  
  const provider = getProvider();
  
  
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
  
  
  const [tokenPrices, setTokenPrices] = useState<TokenPrices>({
    'ETH': 1800,
    'WETH': 1800,
    'USDC': 1,
    'USDT': 1,
    'DAI': 1,
  });
  
  
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
  
  
  const fetchTokenBalances = useCallback(async (tokenAddresses: string[]) => {
    if (!provider || !account || !isConnected || !chainId) return;
    
    try {
      setState(prev => ({ ...prev, tokensLoading: true }));
      
      
      const tokenData = await Promise.all(
        tokenAddresses.map(async (address) => {
          try {
            const [metadata, balance] = await Promise.all([
              getTokenMetadata(address, chainId, provider),
              getTokenBalance(address, account, provider),
            ]);
            
            
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
  
  
  const refreshAllData = useCallback(() => {
    fetchBlockchainInfo();
    fetchEthBalance();
    
    
    if (chainId) {
      const commonTokens = [];
      
      
      if (chainId === 59144) {
        commonTokens.push(
          '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f', 
          '0x176211869cA2b568f2A7D4EE941E073a821EE1ff', 
          '0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5'  
        );
      } else if (chainId === 11155111) {
        
        commonTokens.push(
          '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', 
          '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', 
          '0x68194a729C2450ad26072b3D33ADaCbcef39D574'  
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
  
  
  useEffect(() => {
    if (!provider || !isConnected) return;
    
    
    const onBlock = (blockNumber: number) => {
      setState(prev => ({ ...prev, blockNumber }));
      
      
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
    
    
    refreshAllData();
    
    
    return () => {
      provider.removeListener('block', onBlock);
    };
  }, [provider, isConnected, refreshAllData]);
  
  
  useEffect(() => {
    if (isConnected && account && chainId) {
      refreshAllData();
    } else {
      
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