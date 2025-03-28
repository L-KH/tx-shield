'use client';

import React, { useState, useEffect } from 'react';
import { useSDK } from '@metamask/sdk-react';
import { ethers } from 'ethers';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, ExternalLink, ArrowRight, Check, Info, RefreshCw, Lock, Unlock, Eye, Wallet, Tag } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface TokenSecurity {
  address: string;
  name: string;
  symbol: string;
  balance: string;
  balanceUSD: number;
  securityScore: number; // 0-100
  issues: {
    type: 'critical' | 'high' | 'medium' | 'low';
    description: string;
  }[];
  approvals: {
    spender: string;
    spenderName?: string;
    amount: string;
    unlimited: boolean;
    riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'safe';
  }[];
}

interface WalletSecurity {
  address: string;
  overallScore: number; // 0-100
  totalValueUSD: number;
  riskExposureUSD: number;
  tokens: TokenSecurity[];
  riskBreakdown: {
    criticalRiskValue: number;
    highRiskValue: number;
    mediumRiskValue: number;
    lowRiskValue: number;
    safeValue: number;
  };
  suggestedActions: {
    priority: 'critical' | 'high' | 'medium' | 'low';
    action: string;
    details: string;
    tokenAddress?: string;
    spenderAddress?: string;
  }[];
}

// Demo wallet security data (in a real app, this would come from API)
const mockWalletSecurity: WalletSecurity = {
  address: '0x0000000000000000000000000000000000000000',
  overallScore: 73,
  totalValueUSD: 15420.85,
  riskExposureUSD: 4256.32,
  riskBreakdown: {
    criticalRiskValue: 1256.32,
    highRiskValue: 3000.00,
    mediumRiskValue: 2500.65,
    lowRiskValue: 3500.20,
    safeValue: 5163.68
  },
  tokens: [
    {
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      name: 'Wrapped Ether',
      symbol: 'WETH',
      balance: '1.25',
      balanceUSD: 3750.00,
      securityScore: 95,
      issues: [],
      approvals: [
        {
          spender: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
          spenderName: 'Uniswap V2: Router',
          amount: '0.5',
          unlimited: false,
          riskLevel: 'low'
        }
      ]
    },
    {
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      name: 'Dai Stablecoin',
      symbol: 'DAI',
      balance: '2500',
      balanceUSD: 2500.00,
      securityScore: 90,
      issues: [],
      approvals: [
        {
          spender: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
          spenderName: 'Uniswap V2: Router',
          amount: 'unlimited',
          unlimited: true,
          riskLevel: 'medium'
        }
      ]
    },
    {
      address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      name: 'Uniswap',
      symbol: 'UNI',
      balance: '150',
      balanceUSD: 1256.32,
      securityScore: 25,
      issues: [
        {
          type: 'critical',
          description: 'Unlimited approval to suspicious contract'
        },
        {
          type: 'high',
          description: 'Contract ownership recently changed'
        }
      ],
      approvals: [
        {
          spender: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
          spenderName: 'Uniswap V2: Router',
          amount: 'unlimited',
          unlimited: true,
          riskLevel: 'medium'
        },
        {
          spender: '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
          spenderName: 'Unknown Contract',
          amount: 'unlimited',
          unlimited: true,
          riskLevel: 'critical'
        }
      ]
    },
    {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      name: 'USD Coin',
      symbol: 'USDC',
      balance: '5000',
      balanceUSD: 5000.00,
      securityScore: 85,
      issues: [
        {
          type: 'medium',
          description: 'Centralized asset with blacklist capability'
        }
      ],
      approvals: [
        {
          spender: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
          spenderName: 'Uniswap V2: Router',
          amount: 'unlimited',
          unlimited: true,
          riskLevel: 'medium'
        },
        {
          spender: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
          spenderName: 'Uniswap V3: Router',
          amount: '1000',
          unlimited: false,
          riskLevel: 'low'
        }
      ]
    },
    {
      address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      name: 'Wrapped Bitcoin',
      symbol: 'WBTC',
      balance: '0.15',
      balanceUSD: 2914.53,
      securityScore: 88,
      issues: [],
      approvals: []
    }
  ],
  suggestedActions: [
    {
      priority: 'critical',
      action: 'Revoke suspicious approval',
      details: 'Revoke unlimited UNI approval to unknown contract',
      tokenAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      spenderAddress: '0xdef1c0ded9bec7f1a1670819833240f027b25eff'
    },
    {
      priority: 'high',
      action: 'Replace unlimited approvals',
      details: 'Replace unlimited DAI approval to Uniswap with limited amount',
      tokenAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      spenderAddress: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
    },
    {
      priority: 'medium',
      action: 'Replace unlimited approvals',
      details: 'Replace unlimited USDC approval to Uniswap with limited amount',
      tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      spenderAddress: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
    },
    {
      priority: 'low',
      action: 'Enable token security notifications',
      details: 'Enable real-time security alerts for your tokens',
    }
  ]
};

const PortfolioScanner: React.FC = () => {
  const { sdk } = useSDK();
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [walletSecurity, setWalletSecurity] = useState<WalletSecurity | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [scanComplete, setScanComplete] = useState<boolean>(false);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  
  // Connect wallet
  const connectWallet = async () => {
    try {
      const accounts = await sdk?.connect();
      if (accounts && accounts[0]) {
        setWalletAddress(accounts[0]);
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };
  
  // Get wallet security data
  const scanWallet = async () => {
    if (!walletAddress) {
      alert('Please connect your wallet first');
      return;
    }
    
    setLoading(true);
    setScanComplete(false);
    
    try {
      // In a real app, this would be an API call
      // For demo purposes, we'll use the mock data after a delay
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Update mock data with the connected address
      const securityData = {
        ...mockWalletSecurity,
        address: walletAddress
      };
      
      setWalletSecurity(securityData);
      setScanComplete(true);
    } catch (error) {
      console.error('Failed to scan wallet:', error);
      alert(`Scan failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Check for wallet on load
  useEffect(() => {
    const checkConnectedAccounts = async () => {
      try {
        if (sdk) {
          // Check if ethereum provider exists and has accounts
          if (window.ethereum) {
            const accounts = await window.ethereum.request({ 
              method: 'eth_accounts' 
            });
            if (accounts && accounts.length > 0) {
              setWalletAddress(accounts[0]);
            }
          }
        }
      } catch (error) {
        console.error('Failed to get accounts:', error);
      }
    };
    
    checkConnectedAccounts();
  }, [sdk]);
  
  // Approve security action
  const executeSecurityAction = (action: any) => {
    alert(`This would execute the security action: ${action.action}`);
    // In a real app, this would generate and execute a transaction
  };
  
  // Render risk score indicator
  const renderRiskScoreIndicator = (score: number) => {
    let bgColor = '';
    let textColor = 'text-white';
    
    if (score >= 90) {
      bgColor = 'bg-green-500';
    } else if (score >= 70) {
      bgColor = 'bg-green-600';
    } else if (score >= 50) {
      bgColor = 'bg-yellow-500';
    } else if (score >= 30) {
      bgColor = 'bg-orange-500';
    } else {
      bgColor = 'bg-red-500';
    }
    
    return (
      <div className={`${bgColor} ${textColor} text-center py-2 px-4 rounded-lg`}>
        <div className="text-3xl font-bold">{score}</div>
        <div className="text-sm">Security Score</div>
      </div>
    );
  };
  
  // Render the risk breakdown chart
  const renderRiskBreakdownChart = () => {
    if (!walletSecurity) return null;
    
    const data = [
      { name: 'Critical Risk', value: walletSecurity.riskBreakdown.criticalRiskValue, color: '#EF4444' },
      { name: 'High Risk', value: walletSecurity.riskBreakdown.highRiskValue, color: '#F59E0B' },
      { name: 'Medium Risk', value: walletSecurity.riskBreakdown.mediumRiskValue, color: '#FBBF24' },
      { name: 'Low Risk', value: walletSecurity.riskBreakdown.lowRiskValue, color: '#34D399' },
      { name: 'Safe', value: walletSecurity.riskBreakdown.safeValue, color: '#10B981' }
    ];
    
    return (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
            formatter={(value) => {
                // Ensure value is a number before using toFixed
                const numValue = typeof value === 'number' ? value : parseFloat(String(value));
                return [`$${isNaN(numValue) ? '0.00' : numValue.toFixed(2)}`, 'Value'];
            }}
            labelFormatter={(label) => `${label}`}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };
  
  // Render token security list
  const renderTokenSecurityList = () => {
    if (!walletSecurity) return null;
    
    return (
      <div className="space-y-4">
        {walletSecurity.tokens.map((token) => (
          <div 
            key={token.address}
            className={`bg-gray-800 p-4 rounded-lg cursor-pointer transition-colors ${
              selectedToken === token.address ? 'border border-blue-500' : ''
            }`}
            onClick={() => setSelectedToken(selectedToken === token.address ? null : token.address)}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center mr-3">
                  {token.symbol.charAt(0)}
                </div>
                <div>
                  <div className="font-medium">{token.name}</div>
                  <div className="text-sm text-gray-400">{token.symbol}</div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-medium">{token.balance} {token.symbol}</div>
                <div className="text-sm text-gray-400">${token.balanceUSD.toFixed(2)}</div>
              </div>
            </div>
            
            <div className="mt-3 flex justify-between items-center">
              <div className="flex items-center">
                {token.securityScore < 30 ? (
                  <AlertTriangle size={16} className="text-red-500 mr-2" />
                ) : token.securityScore < 70 ? (
                  <Info size={16} className="text-yellow-500 mr-2" />
                ) : (
                  <Shield size={16} className="text-green-500 mr-2" />
                )}
                <span className="text-sm">Security Score: {token.securityScore}</span>
              </div>
              
              {token.issues.length > 0 && (
                <div className="text-sm text-red-500">
                  {token.issues.length} issue{token.issues.length > 1 ? 's' : ''}
                </div>
              )}
              
              {token.approvals.length > 0 && (
                <div className="text-sm text-yellow-500">
                  {token.approvals.length} approval{token.approvals.length > 1 ? 's' : ''}
                </div>
              )}
            </div>
            
            {selectedToken === token.address && (
              <div className="mt-4 pt-4 border-t border-gray-700 space-y-4">
                {/* Issues */}
                {token.issues.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Issues</h4>
                    <div className="space-y-2">
                      {token.issues.map((issue, i) => (
                        <div key={i} className="flex items-start">
                          {issue.type === 'critical' && <AlertTriangle size={16} className="text-red-500 mr-2 mt-0.5" />}
                          {issue.type === 'high' && <AlertTriangle size={16} className="text-orange-500 mr-2 mt-0.5" />}
                          {issue.type === 'medium' && <Info size={16} className="text-yellow-500 mr-2 mt-0.5" />}
                          {issue.type === 'low' && <Info size={16} className="text-green-500 mr-2 mt-0.5" />}
                          <span className="text-sm">{issue.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Approvals */}
                {token.approvals.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Approvals</h4>
                    <div className="space-y-2">
                      {token.approvals.map((approval, i) => (
                        <div key={i} className="bg-gray-900 p-3 rounded-md">
                          <div className="flex justify-between items-center mb-2">
                            <div className="text-sm font-medium">{approval.spenderName || `${approval.spender.substring(0, 6)}...${approval.spender.substring(38)}`}</div>
                            <div className={`text-xs px-2 py-1 rounded-full ${
                              approval.riskLevel === 'critical' ? 'bg-red-900 text-red-300' :
                              approval.riskLevel === 'high' ? 'bg-orange-900 text-orange-300' :
                              approval.riskLevel === 'medium' ? 'bg-yellow-900 text-yellow-300' :
                              approval.riskLevel === 'low' ? 'bg-green-900 text-green-300' :
                              'bg-blue-900 text-blue-300'
                            }`}>
                              {approval.riskLevel.charAt(0).toUpperCase() + approval.riskLevel.slice(1)} Risk
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div className="text-sm">
                              Approved: <span className={approval.unlimited ? 'text-red-400' : 'text-gray-300'}>
                                {approval.unlimited ? 'Unlimited' : approval.amount}
                              </span>
                            </div>
                            
                            <button 
                              className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                alert(`This would revoke the approval for ${token.symbol} to ${approval.spenderName || approval.spender}`);
                              }}
                            >
                              Revoke
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };
  
  // Render suggested actions
  const renderSuggestedActions = () => {
    if (!walletSecurity) return null;
    
    return (
      <div className="space-y-3">
        {walletSecurity.suggestedActions.map((action, i) => (
          <div 
            key={i}
            className={`p-4 rounded-lg ${
              action.priority === 'critical' ? 'bg-red-900/40' :
              action.priority === 'high' ? 'bg-orange-900/40' :
              action.priority === 'medium' ? 'bg-yellow-900/40' :
              'bg-green-900/40'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center mb-1">
                  {action.priority === 'critical' && <AlertTriangle size={16} className="text-red-500 mr-2" />}
                  {action.priority === 'high' && <AlertTriangle size={16} className="text-orange-500 mr-2" />}
                  {action.priority === 'medium' && <Info size={16} className="text-yellow-500 mr-2" />}
                  {action.priority === 'low' && <Info size={16} className="text-green-500 mr-2" />}
                  <span className="font-medium">{action.action}</span>
                </div>
                <p className="text-sm text-gray-300">{action.details}</p>
              </div>
              
              <button
                onClick={() => executeSecurityAction(action)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-md text-sm flex items-center whitespace-nowrap ml-4"
              >
                Fix Now
                <ArrowRight size={14} className="ml-1" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold flex items-center">
            <Shield className="mr-3" size={24} />
            Portfolio Security Scanner
          </h1>
          
          {walletAddress ? (
            <div className="flex items-center bg-gray-800 px-3 py-2 rounded-md">
              <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
              <span className="text-sm">{`${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}`}</span>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md transition-colors"
            >
              Connect Wallet
            </button>
          )}
        </div>
        
        {!scanComplete && (
          <div className="bg-gray-800 p-6 rounded-lg mb-8">
            <h2 className="text-xl font-medium mb-6">Scan Your Portfolio for Risks</h2>
            
            <p className="text-gray-400 mb-6">
              Our advanced security scanner will analyze your entire wallet portfolio to identify:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-700 p-4 rounded-lg flex items-start">
                <Unlock size={20} className="text-red-500 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-medium mb-1">Unlimited Approvals</h3>
                  <p className="text-sm text-gray-400">Detect risky approval grants that could drain your wallet</p>
                </div>
              </div>
              
              <div className="bg-gray-700 p-4 rounded-lg flex items-start">
                <AlertTriangle size={20} className="text-orange-500 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-medium mb-1">Suspicious Tokens</h3>
                  <p className="text-sm text-gray-400">Find phishing tokens and potential scam contracts</p>
                </div>
              </div>
              
              <div className="bg-gray-700 p-4 rounded-lg flex items-start">
                <Eye size={20} className="text-yellow-500 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-medium mb-1">Privacy Exposures</h3>
                  <p className="text-sm text-gray-400">Identify contracts that track your transactions</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={scanWallet}
                disabled={loading || !walletAddress}
                className={`px-6 py-3 rounded-md text-lg flex items-center justify-center ${
                  !walletAddress ? 'bg-gray-700 cursor-not-allowed' :
                  loading ? 'bg-blue-800 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-3"></div>
                    Scanning Portfolio...
                  </>
                ) : (
                  <>
                    <Shield size={20} className="mr-3" />
                    {walletAddress ? 'Start Security Scan' : 'Connect Wallet to Scan'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
        
        {scanComplete && walletSecurity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-gray-800 p-6 rounded-lg mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-medium">Security Scan Results</h2>
                
                <button
                  onClick={scanWallet}
                  className="flex items-center text-sm px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md"
                >
                  <RefreshCw size={14} className="mr-2" />
                  Rescan
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-gray-700 p-4 rounded-lg flex flex-col items-center justify-center">
                  {renderRiskScoreIndicator(walletSecurity.overallScore)}
                </div>
                
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-sm text-gray-400 mb-1">Portfolio Value</h3>
                  <div className="text-2xl font-bold mb-1">${walletSecurity.totalValueUSD.toFixed(2)}</div>
                  <div className="text-sm flex items-center">
                    <Wallet size={14} className="mr-1" />
                    {walletSecurity.tokens.length} tokens
                  </div>
                </div>
                
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-sm text-gray-400 mb-1">Risk Exposure</h3>
                  <div className="text-2xl font-bold mb-1 text-red-500">${walletSecurity.riskExposureUSD.toFixed(2)}</div>
                  <div className="text-sm">
                    {(walletSecurity.riskExposureUSD / walletSecurity.totalValueUSD * 100).toFixed(0)}% of portfolio at risk
                  </div>
                </div>
                
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-sm text-gray-400 mb-1">Critical Issues</h3>
                  <div className="text-2xl font-bold mb-1 text-red-500">
                    {walletSecurity.suggestedActions.filter(a => a.priority === 'critical').length}
                  </div>
                  <div className="text-sm">
                    {walletSecurity.suggestedActions.length} total issues identified
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1">
                  <h3 className="text-lg font-medium mb-4">Risk Breakdown</h3>
                  {renderRiskBreakdownChart()}
                </div>
                
                <div className="col-span-2">
                  <h3 className="text-lg font-medium mb-4">Recommended Actions</h3>
                  {renderSuggestedActions()}
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-medium mb-6">Token Security Analysis</h2>
              {renderTokenSecurityList()}
            </div>
            
            <div className="mt-8 text-center">
              <button
                onClick={() => window.open('https://revoke.cash', '_blank')}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Advanced: Manage All Approvals
                <ExternalLink size={16} className="ml-2" />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default PortfolioScanner;