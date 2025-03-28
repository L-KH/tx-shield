// components/TokenBalances.tsx
import React, { useState } from 'react';
import { Wallet, RefreshCw, ExternalLink, Plus, ChevronDown, ChevronUp, Shield, AlertTriangle } from 'lucide-react';
import { TokenWithBalance } from '@/lib/hooks/useBlockchainData';
import { BLOCK_EXPLORERS } from '@/lib/blockchain/network';
import useMetaMask from '@/lib/hooks/useMetaMask';
import useBlockchainData from '@/lib/hooks/useBlockchainData';
import { getTokenMetadata } from '@/lib/blockchain/contractService';
import { ethers } from 'ethers';

interface TokenBalancesProps {
  className?: string;
  compact?: boolean;
}

const TokenBalances: React.FC<TokenBalancesProps> = ({ 
  className = '',
  compact = false
}) => {
  const { chainId, account, getProvider } = useMetaMask();
  const provider = getProvider();
  const { 
    ethBalance, 
    tokens, 
    tokensLoading, 
    refreshAllData,
    checkAllowances
  } = useBlockchainData();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedTokens, setExpandedTokens] = useState<{[key: string]: boolean}>({});
  const [showAddToken, setShowAddToken] = useState(false);
  const [newTokenAddress, setNewTokenAddress] = useState('');
  const [loadingTokenCheck, setLoadingTokenCheck] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  
  const blockExplorerUrl = chainId && BLOCK_EXPLORERS[chainId] ? BLOCK_EXPLORERS[chainId] : '';
  
  // Format token balance with appropriate decimals
  const formatBalance = (balance: string, decimals: number = 6) => {
    const floatBalance = parseFloat(balance);
    if (floatBalance === 0) return '0';
    if (floatBalance < 0.000001) return '<0.000001';
    return floatBalance.toFixed(decimals);
  };
  
  // Format USD value
  const formatUSD = (value: number | null) => {
    if (value === null) return '-';
    if (value < 0.01) return '<$0.01';
    return `$${value.toFixed(2)}`;
  };
  
  // Calculate total portfolio value
  const calculateTotalValue = (): number => {
    let total = 0;
    
    // Add ETH value
    if (ethBalance) {
      const ethValue = parseFloat(ethBalance) * 1800; // Example ETH price
      total += ethValue;
    }
    
    // Add token values
    tokens.forEach(token => {
      if (token.balanceUSD !== null) {
        total += token.balanceUSD;
      }
    });
    
    return total;
  };
  
  // Toggle token expanded state
  const toggleTokenExpand = (tokenAddress: string) => {
    setExpandedTokens(prev => ({
      ...prev,
      [tokenAddress]: !prev[tokenAddress]
    }));
    
    // Check token allowances when expanded
    if (!expandedTokens[tokenAddress] && account) {
      checkAllowances(
        [tokenAddress],
        '0xc076D95F95021D1fBBfe2BDB9692d656B7ddc846' // TX Shield contract address
      );
    }
  };
  
  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshAllData();
    setIsRefreshing(false);
  };
  
  // Add new token
  const handleAddToken = async () => {
    if (!newTokenAddress || !chainId || !account || !provider) return;
    
    setLoadingTokenCheck(true);
    setTokenError(null);
    
    try {
      // Check if token address is valid
      if (!ethers.utils.isAddress(newTokenAddress)) {
        throw new Error('Invalid token address');
      }
      
      // Try to get token metadata
      await getTokenMetadata(newTokenAddress, chainId, provider);
      
      // Add token to list and fetch its balance
      await refreshAllData();
      
      // Reset form
      setNewTokenAddress('');
      setShowAddToken(false);
    } catch (error) {
      console.error('Failed to add token:', error);
      setTokenError('Invalid token or token not found');
    } finally {
      setLoadingTokenCheck(false);
    }
  };
  
  // Compact view for sidebars
  if (compact) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium">Wallet</h3>
          <button 
            onClick={handleRefresh}
            className="p-1 rounded-md hover:bg-gray-700 transition-colors"
            disabled={isRefreshing}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
        
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-700">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center mr-2">
              <Wallet size={16} />
            </div>
            <div>
              <div className="text-xs text-gray-400">Portfolio Value</div>
              <div className="font-medium">{formatUSD(calculateTotalValue())}</div>
            </div>
          </div>
        </div>
        
        {tokensLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* ETH */}
            {ethBalance && (
              <div className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-700">
                <div className="flex items-center">
                  <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center mr-2">
                    ETH
                  </div>
                  <div className="font-medium">ETH</div>
                </div>
                <div className="text-right">
                  <div>{formatBalance(ethBalance)}</div>
                  <div className="text-xs text-gray-400">
                    {formatUSD(parseFloat(ethBalance) * 1800)}
                  </div>
                </div>
              </div>
            )}
            
            {/* Tokens */}
            {tokens.slice(0, 3).map(token => (
              <div 
                key={token.metadata.address} 
                className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-700"
              >
                <div className="flex items-center">
                  <div className="h-6 w-6 rounded-full bg-gray-700 flex items-center justify-center mr-2 text-xs">
                    {token.metadata.symbol.substring(0, 3)}
                  </div>
                  <div className="font-medium">{token.metadata.symbol}</div>
                </div>
                <div className="text-right">
                  <div>{formatBalance(token.balance)}</div>
                  <div className="text-xs text-gray-400">
                    {formatUSD(token.balanceUSD)}
                  </div>
                </div>
              </div>
            ))}
            
            {tokens.length > 3 && (
              <div className="text-center text-sm text-blue-400 mt-2">
                +{tokens.length - 3} more tokens
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className={`bg-gray-800 p-6 rounded-lg ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-medium">Your Assets</h2>
        <div className="flex space-x-2">
          <button 
            onClick={() => setShowAddToken(!showAddToken)}
            className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors"
          >
            <Plus size={16} />
          </button>
          <button 
            onClick={handleRefresh}
            className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors"
            disabled={isRefreshing}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      
      {/* Add Token Form */}
      {showAddToken && (
        <div className="mb-6 p-4 bg-gray-700 rounded-lg">
          <h3 className="font-medium mb-3">Add Custom Token</h3>
          <div className="flex items-center mb-2">
            <input
              type="text"
              value={newTokenAddress}
              onChange={(e) => setNewTokenAddress(e.target.value)}
              placeholder="Token Contract Address"
              className="flex-grow px-3 py-2 bg-gray-600 rounded-l-md outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddToken}
              disabled={loadingTokenCheck || !newTokenAddress}
              className={`px-4 py-2 rounded-r-md ${
                loadingTokenCheck || !newTokenAddress
                  ? 'bg-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loadingTokenCheck ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                'Add'
              )}
            </button>
          </div>
          {tokenError && (
            <div className="text-red-500 text-sm mt-1 flex items-center">
              <AlertTriangle size={14} className="mr-1" />
              {tokenError}
            </div>
          )}
        </div>
      )}
      
      {/* Portfolio Summary */}
      <div className="bg-gray-700 p-4 rounded-lg mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-400">Total Portfolio Value</div>
          <div className="text-xl font-bold">{formatUSD(calculateTotalValue())}</div>
        </div>
        
        <div className="flex items-center text-sm text-gray-400">
          <div className="h-4 w-4 rounded-full bg-blue-600 mr-1.5"></div>
          <span>ETH: {formatUSD(ethBalance ? parseFloat(ethBalance) * 1800 : 0)}</span>
          
          <div className="h-4 w-4 rounded-full bg-green-500 mx-1.5 ml-3"></div>
          <span>Tokens: {formatUSD(tokens.reduce((sum, token) => sum + (token.balanceUSD || 0), 0))}</span>
        </div>
      </div>
      
      {/* Asset List */}
      <div className="space-y-4">
        {/* ETH */}
        <div className="bg-gray-700 rounded-lg overflow-hidden">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center mr-3">
                ETH
              </div>
              <div>
                <div className="font-medium">Ethereum</div>
                <div className="text-sm text-gray-400">ETH</div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="font-medium">{ethBalance ? formatBalance(ethBalance) : '0'}</div>
              <div className="text-sm text-gray-400">
                {formatUSD(ethBalance ? parseFloat(ethBalance) * 1800 : 0)}
              </div>
            </div>
          </div>
          
          {blockExplorerUrl && account && (
            <div className="bg-gray-800 p-3 flex justify-between items-center text-sm">
              <span className="text-gray-400">View in Explorer</span>
              <a
                href={`${blockExplorerUrl}/address/${account}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors flex items-center"
              >
                <ExternalLink size={14} className="ml-1" />
              </a>
            </div>
          )}
        </div>
        
        {/* Token List */}
        {tokensLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : tokens.length > 0 ? (
          tokens.map(token => (
            <div key={token.metadata.address} className="bg-gray-700 rounded-lg overflow-hidden">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-600/50"
                onClick={() => toggleTokenExpand(token.metadata.address)}
              >
                <div className="flex items-center">
                  {token.metadata.logoURI ? (
                    <img 
                      src={token.metadata.logoURI} 
                      alt={token.metadata.symbol}
                      className="h-10 w-10 rounded-full mr-3"
                      onError={(e) => {
                        // Replace with fallback if image fails to load
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="%234B5563"/><text x="20" y="24" font-family="Arial" font-size="14" fill="white" text-anchor="middle">' + token.metadata.symbol.substring(0, 3) + '</text></svg>';
                      }}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center mr-3 text-sm">
                      {token.metadata.symbol.substring(0, 3)}
                    </div>
                  )}
                  <div>
                    <div className="font-medium">{token.metadata.name}</div>
                    <div className="text-sm text-gray-400">{token.metadata.symbol}</div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="text-right mr-3">
                    <div className="font-medium">{formatBalance(token.balance)}</div>
                    <div className="text-sm text-gray-400">{formatUSD(token.balanceUSD)}</div>
                  </div>
                  
                  {expandedTokens[token.metadata.address] ? (
                    <ChevronUp size={18} />
                  ) : (
                    <ChevronDown size={18} />
                  )}
                </div>
              </div>
              
              {expandedTokens[token.metadata.address] && (
                <div className="bg-gray-800 p-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-700 p-3 rounded-lg">
                      <div className="text-sm text-gray-400 mb-1">Token Address</div>
                      <div className="text-sm flex items-center">
                        <span className="truncate">{token.metadata.address}</span>
                        {blockExplorerUrl && (
                          <a
                            href={`${blockExplorerUrl}/token/${token.metadata.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 transition-colors ml-2 flex-shrink-0"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-gray-700 p-3 rounded-lg">
                      <div className="text-sm text-gray-400 mb-1">Token Decimals</div>
                      <div className="text-sm">{token.metadata.decimals}</div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-700 p-3 rounded-lg mb-3">
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-400">TX Shield Protection</div>
                      <div className="flex items-center text-green-500 text-sm">
                        <Shield size={14} className="mr-1" />
                        <span>Protected</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <button
                      onClick={() => window.open(`${blockExplorerUrl}/token/${token.metadata.address}?a=${account}`, '_blank')}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm flex items-center"
                    >
                      View Transactions
                      <ExternalLink size={14} className="ml-1" />
                    </button>
                    
                    <button
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm flex items-center"
                    >
                      Use with TX Shield
                      <Shield size={14} className="ml-1" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-400">
            <div className="mb-3">
              <Wallet size={40} className="mx-auto text-gray-500" />
            </div>
            <p className="mb-2">No tokens found in your wallet</p>
            <button
              onClick={() => setShowAddToken(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white"
            >
              Add Custom Token
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenBalances;