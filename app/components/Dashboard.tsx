'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Activity, Zap, ArrowRight, Menu, X, Settings, User, LogOut, Bell, History, Home, Book, Wallet, RefreshCw } from 'lucide-react';
import TransactionAnalyzer from './TransactionAnalyzer';
import PortfolioScanner from './PortfolioScanner';
import MultiNetworkSelector from './MultiNetworkSelector';
import BlockchainStatus from './BlockchainStatus';
import TokenBalances from './TokenBalances';
import TransactionHistory from './TransactionHistory';
import useMetaMask from '@/lib/hooks/useMetaMask';
import useBlockchainData from '@/lib/hooks/useBlockchainData';

interface DashboardProps {
  defaultTab?: 'home' | 'analyze' | 'portfolio' | 'history' | 'settings';
}

const Dashboard: React.FC<DashboardProps> = ({ defaultTab = 'home' }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'analyze' | 'portfolio' | 'history' | 'settings'>(defaultTab);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { account, chainId, networkName, connect, disconnect, switchToSepolia } = useMetaMask();
  const { 
    ethBalance, 
    tokens, 
    transactions, 
    transactionsLoading, 
    refreshAllData,
    blockNumber,
    gasPrice
  } = useBlockchainData();
  
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calculate security score based on transaction history and blockchain data
  const calculateSecurityScore = () => {
    if (!transactions || transactions.length === 0) return 87; // Default score
    
    // Count high-risk transactions
    const highRiskCount = transactions.filter(tx => 
      tx.threatLevel === 'HIGH' || tx.threatLevel === 'CRITICAL'
    ).length;
    
    // Basic algorithm: start with 100, subtract for each high risk transaction
    let score = 100 - (highRiskCount * 5);
    
    // Cap between 0-100
    return Math.max(0, Math.min(100, score));
  };
  
  // Calculate portfolio value
  const calculatePortfolioValue = () => {
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
    
    return total.toFixed(2);
  };
  
  // Format portfolio value for display
  const formatPortfolioValue = () => {
    const value = calculatePortfolioValue();
    return `$${parseFloat(value).toLocaleString()}`;
  };
  
  // Calculate risk exposure (simplified version)
  const calculateRiskExposure = () => {
    // Estimate based on unlimited approvals and high-risk transactions
    const unlimitedApprovals = transactions.filter(tx => 
      tx.data && tx.data.includes('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
    ).length;
    
    const portfolioValue = parseFloat(calculatePortfolioValue());
    
    // Simple calculation - 10% of portfolio per unlimited approval
    const riskAmount = unlimitedApprovals * (portfolioValue * 0.1);
    
    return `$${riskAmount.toLocaleString()}`;
  };
  
  // Handle refresh of blockchain data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshAllData();
    setIsRefreshing(false);
  };
  
  // Prepare user data
  const user = {
    address: account || '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    truncatedAddress: account ? `${account.substring(0, 6)}...${account.substring(38)}` : '0xa0b8...6eb48',
    securityScore: calculateSecurityScore(),
    transactions: {
      total: transactions.length || 143,
      protected: transactions.filter(tx => tx.threatLevel !== 'SAFE').length || 36,
      riskPrevented: transactions.filter(tx => 
        (tx.threatLevel === 'CRITICAL' || tx.threatLevel === 'HIGH') && !tx.success
      ).length || 8,
    },
    portfolio: {
      value: formatPortfolioValue(),
      riskExposure: calculateRiskExposure()
    },
    notifications: 3, // Mock notifications count
  };
  
  // Effect to refresh data when account or chain changes
  useEffect(() => {
    if (account && chainId) {
      refreshAllData();
    }
  }, [account, chainId, refreshAllData]);
  
  // Render dashboard home content
  const renderHomeContent = () => {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-sm text-gray-400 mb-2">Security Score</h3>
            <div className="flex items-center">
              <div className="text-3xl font-bold mr-3">{user.securityScore}</div>
              <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full" 
                  style={{ 
                    width: `${user.securityScore}%`,
                    backgroundColor: user.securityScore > 80 ? '#10B981' : 
                                    user.securityScore > 60 ? '#FBBF24' : '#EF4444'
                  }}
                />
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-sm text-gray-400 mb-2">Transaction Protection</h3>
            <div className="text-3xl font-bold">{user.transactions.protected}</div>
            <div className="text-sm text-gray-400 mt-1">
              {user.transactions.riskPrevented} risks prevented
            </div>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-sm text-gray-400 mb-2">Portfolio Value</h3>
            <div className="text-3xl font-bold">{user.portfolio.value}</div>
            <div className="text-sm text-red-400 mt-1">
              {user.portfolio.riskExposure} at risk
            </div>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-sm text-gray-400 mb-2">Security Alerts</h3>
            <div className="text-3xl font-bold flex items-center">
              {user.notifications}
              <span className="text-sm text-gray-400 ml-2">new alerts</span>
            </div>
            <button className="text-sm text-blue-400 mt-1">View all</button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <BlockchainStatus />
          </div>
          
          <div>
            <TokenBalances compact={true} />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-medium mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setActiveTab('analyze')}
                className="bg-gray-700 hover:bg-gray-600 p-4 rounded-lg text-left transition-colors flex items-start"
              >
                <div className="bg-blue-600 p-2 rounded-full mr-4">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Analyze Transaction</h3>
                  <p className="text-sm text-gray-400">
                    Check your transaction for security risks before submitting
                  </p>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('portfolio')}
                className="bg-gray-700 hover:bg-gray-600 p-4 rounded-lg text-left transition-colors flex items-start"
              >
                <div className="bg-green-600 p-2 rounded-full mr-4">
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Portfolio Scan</h3>
                  <p className="text-sm text-gray-400">
                    Check your entire wallet for security vulnerabilities
                  </p>
                </div>
              </button>
              
              <button
                className="bg-gray-700 hover:bg-gray-600 p-4 rounded-lg text-left transition-colors flex items-start"
              >
                <div className="bg-purple-600 p-2 rounded-full mr-4">
                  <Zap size={20} />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Revoke Permissions</h3>
                  <p className="text-sm text-gray-400">
                    Review and revoke contract approvals
                  </p>
                </div>
              </button>
              
              <button
                className="bg-gray-700 hover:bg-gray-600 p-4 rounded-lg text-left transition-colors flex items-start"
              >
                <div className="bg-orange-600 p-2 rounded-full mr-4">
                  <Bell size={20} />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Setup Alerts</h3>
                  <p className="text-sm text-gray-400">
                    Get notified of suspicious activity on your wallet
                  </p>
                </div>
              </button>
            </div>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-medium mb-6">Security Alerts</h2>
            
            <div className="space-y-4">
              <div className="bg-red-900/30 p-4 rounded-lg">
                <div className="flex items-start">
                  <div className="bg-red-500 p-1 rounded-full mr-3 mt-0.5">
                    <Shield size={14} />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Critical: Unlimited Approval</h3>
                    <p className="text-sm text-gray-300">
                      Unlimited UNI approval to unknown contract detected
                    </p>
                    <button className="text-xs text-blue-400 mt-2">Fix Now</button>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-900/30 p-4 rounded-lg">
                <div className="flex items-start">
                  <div className="bg-yellow-500 p-1 rounded-full mr-3 mt-0.5">
                    <Bell size={14} />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Warning: Price Impact</h3>
                    <p className="text-sm text-gray-300">
                      High slippage detected in recent Uniswap trade
                    </p>
                    <button className="text-xs text-blue-400 mt-2">View Details</button>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-900/30 p-4 rounded-lg">
                <div className="flex items-start">
                  <div className="bg-blue-500 p-1 rounded-full mr-3 mt-0.5">
                    <Activity size={14} />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Info: New Token</h3>
                    <p className="text-sm text-gray-300">
                      New token received: USDC (250.00)
                    </p>
                    <button className="text-xs text-blue-400 mt-2">View Details</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-medium">Recent Transactions</h2>
            <button 
              onClick={handleRefresh} 
              className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors"
              disabled={isRefreshing}
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
          
          {transactionsLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : transactions.length > 0 ? (
            <TransactionHistory 
              transactions={transactions.slice(0, 5)}
              loading={false}
              onRefresh={refreshAllData}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 text-sm">
                    <th className="pb-4 pr-6">Date</th>
                    <th className="pb-4 pr-6">Type</th>
                    <th className="pb-4 pr-6">Details</th>
                    <th className="pb-4 pr-6">Value</th>
                    <th className="pb-4 pr-6">Status</th>
                    <th className="pb-4">Risk</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <tr className="border-t border-gray-700">
                    <td className="py-4 pr-6">Mar 24, 2025</td>
                    <td className="py-4 pr-6">Swap</td>
                    <td className="py-4 pr-6">ETH → USDC</td>
                    <td className="py-4 pr-6">0.5 ETH</td>
                    <td className="py-4 pr-6">
                      <span className="px-2 py-1 bg-green-900/40 text-green-400 rounded-full text-xs">Success</span>
                    </td>
                    <td className="py-4">
                      <span className="px-2 py-1 bg-green-900/40 text-green-400 rounded-full text-xs">Low</span>
                    </td>
                  </tr>
                  <tr className="border-t border-gray-700">
                    <td className="py-4 pr-6">Mar 22, 2025</td>
                    <td className="py-4 pr-6">Approve</td>
                    <td className="py-4 pr-6">USDC → Uniswap</td>
                    <td className="py-4 pr-6">1,000 USDC</td>
                    <td className="py-4 pr-6">
                      <span className="px-2 py-1 bg-green-900/40 text-green-400 rounded-full text-xs">Success</span>
                    </td>
                    <td className="py-4">
                      <span className="px-2 py-1 bg-yellow-900/40 text-yellow-400 rounded-full text-xs">Medium</span>
                    </td>
                  </tr>
                  <tr className="border-t border-gray-700">
                    <td className="py-4 pr-6">Mar 21, 2025</td>
                    <td className="py-4 pr-6">Transfer</td>
                    <td className="py-4 pr-6">ETH → 0xdef...1234</td>
                    <td className="py-4 pr-6">0.1 ETH</td>
                    <td className="py-4 pr-6">
                      <span className="px-2 py-1 bg-green-900/40 text-green-400 rounded-full text-xs">Success</span>
                    </td>
                    <td className="py-4">
                      <span className="px-2 py-1 bg-green-900/40 text-green-400 rounded-full text-xs">Low</span>
                    </td>
                  </tr>
                  <tr className="border-t border-gray-700">
                    <td className="py-4 pr-6">Mar 20, 2025</td>
                    <td className="py-4 pr-6">Approve</td>
                    <td className="py-4 pr-6">UNI → Unknown</td>
                    <td className="py-4 pr-6">Unlimited</td>
                    <td className="py-4 pr-6">
                      <span className="px-2 py-1 bg-red-900/40 text-red-400 rounded-full text-xs">Blocked</span>
                    </td>
                    <td className="py-4">
                      <span className="px-2 py-1 bg-red-900/40 text-red-400 rounded-full text-xs">Critical</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          
          <div className="mt-4 text-right">
            <button
              onClick={() => setActiveTab('history')}
              className="text-sm text-blue-400 flex items-center justify-end ml-auto"
            >
              View All Transactions
              <ArrowRight size={14} className="ml-1" />
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Render settings content
  const renderSettingsContent = () => {
    return (
      <div className="space-y-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-medium mb-6">Security Settings</h2>
          
          <div className="space-y-6">
            {/* Maximum Slippage Setting */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="md:col-span-2">
                <label className="font-medium mb-1 block">Maximum Slippage Tolerance</label>
                <div className="text-sm text-gray-400">
                  Protect against price impact in swaps
                </div>
              </div>
              <div className="flex items-center">
                <input 
                  type="range" 
                  min="10" 
                  max="500" 
                  step="10" 
                  defaultValue="100"
                  className="w-full bg-gray-700 h-2 rounded-full"
                />
                <span className="ml-3 text-sm">1.0%</span>
              </div>
            </div>
            
            {/* Maximum Gas Price */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="md:col-span-2">
                <label className="font-medium mb-1 block">Maximum Gas Price</label>
                <div className="text-sm text-gray-400">
                  Prevent transactions during high gas periods
                </div>
              </div>
              <div className="flex items-center">
                <input 
                  type="range" 
                  min="20" 
                  max="500" 
                  step="10" 
                  defaultValue="200"
                  className="w-full bg-gray-700 h-2 rounded-full"
                />
                <span className="ml-3 text-sm">200 Gwei</span>
              </div>
            </div>
            
            {/* Transaction Simulation */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="md:col-span-2">
                <label className="font-medium mb-1 block">Require Transaction Simulation</label>
                <div className="text-sm text-gray-400">
                  Simulate transaction outcomes before execution
                </div>
              </div>
              <div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    defaultChecked={true}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
            
            {/* MEV Protection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="md:col-span-2">
                <label className="font-medium mb-1 block">MEV Protection</label>
                <div className="text-sm text-gray-400">
                  Protect against front-running and sandwich attacks
                </div>
              </div>
              <div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    defaultChecked={true}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-medium mb-6">Network Settings</h2>
          
          <div>
            <MultiNetworkSelector />
          </div>
        </div>
        
        <div className="flex justify-end space-x-4">
          <button
            className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Restore Defaults
          </button>
          
          <button
            className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="bg-gray-900 text-white min-h-screen flex">
      {/* Sidebar - Desktop */}
      <div className="hidden md:block w-64 bg-gray-800 min-h-screen p-6">
        <div className="flex items-center mb-8">
          <Shield size={24} className="text-blue-500" />
          <h1 className="text-xl font-bold ml-3">TX Shield</h1>
        </div>
        
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
              <User size={20} className="text-blue-500" />
            </div>
            <div className="ml-3">
              <div className="font-medium">{user.truncatedAddress}</div>
              <div className="text-sm text-gray-400">Security Score: {user.securityScore}</div>
            </div>
          </div>
          
          <MultiNetworkSelector className="w-full" />
        </div>
        
        <nav className="space-y-1">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex items-center w-full px-3 py-2 rounded-md text-left ${
              activeTab === 'home' ? 'bg-blue-600' : 'hover:bg-gray-700'
            }`}
          >
            <Home size={20} className="mr-3" />
            Dashboard
          </button>
          
          <button
            onClick={() => setActiveTab('analyze')}
            className={`flex items-center w-full px-3 py-2 rounded-md text-left ${
              activeTab === 'analyze' ? 'bg-blue-600' : 'hover:bg-gray-700'
            }`}
          >
            <Shield size={20} className="mr-3" />
            Transaction Analyzer
          </button>
          
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`flex items-center w-full px-3 py-2 rounded-md text-left ${
              activeTab === 'portfolio' ? 'bg-blue-600' : 'hover:bg-gray-700'
            }`}
          >
            <Wallet size={20} className="mr-3" />
            Portfolio Scanner
          </button>
          
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center w-full px-3 py-2 rounded-md text-left ${
              activeTab === 'history' ? 'bg-blue-600' : 'hover:bg-gray-700'
            }`}
          >
            <History size={20} className="mr-3" />
            Transaction History
          </button>
          
          <div className="pt-4 mt-4 border-t border-gray-700">
            <button
              className="flex items-center w-full px-3 py-2 rounded-md text-left hover:bg-gray-700"
            >
              <Bell size={20} className="mr-3" />
              Notifications
              <div className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {user.notifications}
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center w-full px-3 py-2 rounded-md text-left ${
                activeTab === 'settings' ? 'bg-blue-600' : 'hover:bg-gray-700'
              }`}
            >
              <Settings size={20} className="mr-3" />
              Settings
            </button>
            
            <button
              className="flex items-center w-full px-3 py-2 rounded-md text-left hover:bg-gray-700"
            >
              <Book size={20} className="mr-3" />
              Documentation
            </button>
            
            <button
              onClick={disconnect}
              className="flex items-center w-full px-3 py-2 rounded-md text-left hover:bg-gray-700 text-red-400"
            >
              <LogOut size={20} className="mr-3" />
              Disconnect
            </button>
          </div>
        </nav>
      </div>
      
      {/* Mobile sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)}></div>
          
          <div className="fixed top-0 left-0 bottom-0 w-64 bg-gray-800 p-6 z-50">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center">
                <Shield size={24} className="text-blue-500" />
                <h1 className="text-xl font-bold ml-3">TX Shield</h1>
              </div>
              <button onClick={() => setMobileSidebarOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="mb-8">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                  <User size={20} className="text-blue-500" />
                </div>
                <div className="ml-3">
                  <div className="font-medium">{user.truncatedAddress}</div>
                  <div className="text-sm text-gray-400">Security Score: {user.securityScore}</div>
                </div>
              </div>
              
              <MultiNetworkSelector className="w-full" />
            </div>
            
            <nav className="space-y-1">
              <button
                onClick={() => {
                  setActiveTab('home');
                  setMobileSidebarOpen(false);
                }}
                className={`flex items-center w-full px-3 py-2 rounded-md text-left ${
                  activeTab === 'home' ? 'bg-blue-600' : 'hover:bg-gray-700'
                }`}
              >
                <Home size={20} className="mr-3" />
                Dashboard
              </button>
              
              <button
                onClick={() => {
                  setActiveTab('analyze');
                  setMobileSidebarOpen(false);
                }}
                className={`flex items-center w-full px-3 py-2 rounded-md text-left ${
                  activeTab === 'analyze' ? 'bg-blue-600' : 'hover:bg-gray-700'
                }`}
              >
                <Shield size={20} className="mr-3" />
                Transaction Analyzer
              </button>
              
              <button
                onClick={() => {
                  setActiveTab('portfolio');
                  setMobileSidebarOpen(false);
                }}
                className={`flex items-center w-full px-3 py-2 rounded-md text-left ${
                  activeTab === 'portfolio' ? 'bg-blue-600' : 'hover:bg-gray-700'
                }`}
              >
                <Wallet size={20} className="mr-3" />
                Portfolio Scanner
              </button>
              
              <button
                onClick={() => {
                  setActiveTab('history');
                  setMobileSidebarOpen(false);
                }}
                className={`flex items-center w-full px-3 py-2 rounded-md text-left ${
                  activeTab === 'history' ? 'bg-blue-600' : 'hover:bg-gray-700'
                }`}
              >
                <History size={20} className="mr-3" />
                Transaction History
              </button>
              
              <div className="pt-4 mt-4 border-t border-gray-700">
                <button
                  className="flex items-center w-full px-3 py-2 rounded-md text-left hover:bg-gray-700"
                >
                  <Bell size={20} className="mr-3" />
                  Notifications
                  <div className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {user.notifications}
                  </div>
                </button>
                
                <button
                  onClick={() => {
                    setActiveTab('settings');
                    setMobileSidebarOpen(false);
                  }}
                  className={`flex items-center w-full px-3 py-2 rounded-md text-left ${
                    activeTab === 'settings' ? 'bg-blue-600' : 'hover:bg-gray-700'
                  }`}
                >
                  <Settings size={20} className="mr-3" />
                  Settings
                </button>
                
                <button
                  className="flex items-center w-full px-3 py-2 rounded-md text-left hover:bg-gray-700"
                >
                  <Book size={20} className="mr-3" />
                  Documentation
                </button>
                
                <button
                  onClick={disconnect}
                  className="flex items-center w-full px-3 py-2 rounded-md text-left hover:bg-gray-700 text-red-400"
                >
                  <LogOut size={20} className="mr-3" />
                  Disconnect
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="flex-1 min-h-screen">
        {/* Mobile header */}
        <div className="md:hidden bg-gray-800 p-4 flex items-center justify-between">
          <button onClick={() => setMobileSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          
          <div className="flex items-center">
            <Shield size={24} className="text-blue-500" />
            <h1 className="text-xl font-bold ml-2">TX Shield</h1>
          </div>
          
          <button>
            <Bell size={24} />
          </button>
        </div>
        
        <div className="p-6">
          {/* Page Title */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold">
              {activeTab === 'home' && 'Dashboard'}
              {activeTab === 'analyze' && 'Transaction Analyzer'}
              {activeTab === 'portfolio' && 'Portfolio Security Scanner'}
              {activeTab === 'history' && 'Transaction History'}
              {activeTab === 'settings' && 'Settings'}
            </h1>
            
            {activeTab === 'home' && (
              <div className="flex items-center text-sm bg-blue-600 px-3 py-1 rounded-full">
                <Shield size={14} className="mr-2" />
                Protection Active
              </div>
            )}
          </div>
          
          {/* Page Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'home' && renderHomeContent()}
            {activeTab === 'analyze' && <TransactionAnalyzer />}
            {activeTab === 'portfolio' && <PortfolioScanner />}
            {activeTab === 'settings' && renderSettingsContent()}
            {activeTab === 'history' && (
              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-medium">Transaction History</h2>
                  <button 
                    onClick={handleRefresh} 
                    className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors"
                    disabled={isRefreshing}
                  >
                    <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                  </button>
                </div>
                
                {transactionsLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : transactions.length > 0 ? (
                  <TransactionHistory 
                    transactions={transactions} 
                    loading={false} 
                    onRefresh={refreshAllData}
                    onPageChange={(page) => {
                      // Use the fetchTransactionHistory from the hook
                      refreshAllData();
                    }}
                  />
                ) : (
                  <div className="text-center py-20 text-gray-500">
                    <History size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Your transaction history will appear here</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;