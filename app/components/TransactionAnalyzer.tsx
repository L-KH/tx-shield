import React, { useState, useEffect } from 'react';
import { Shield, Activity, ArrowRight, AlertTriangle, Check, X, 
         Info, ChevronDown, ChevronUp, Zap, DollarSign, 
         ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Component for threat level indicator
const ThreatIndicator = ({ level, confidence, description, recommendation }) => {
  // Define colors based on threat level
  const colors = {
    SAFE: {
      bg: '#10B981',
      text: 'white',
      icon: <Check size={24} />,
      title: 'SAFE'
    },
    SUSPICIOUS: {
      bg: '#F59E0B',
      text: 'white',
      icon: <AlertTriangle size={24} />,
      title: 'SUSPICIOUS'
    },
    HIGH: {
      bg: '#EF4444',
      text: 'white',
      icon: <AlertTriangle size={24} />,
      title: 'HIGH RISK'
    },
    CRITICAL: {
      bg: '#7F1D1D',
      text: 'white',
      icon: <X size={24} />,
      title: 'CRITICAL THREAT'
    }
  };

  const currentStyle = colors[level];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-6 p-4 rounded-lg"
      style={{ backgroundColor: currentStyle.bg, color: currentStyle.text }}
    >
      <div className="flex items-center">
        <div className="mr-4">
          {currentStyle.icon}
        </div>
        <div>
          <h3 className="text-xl font-bold">{currentStyle.title}</h3>
          <p className="text-sm opacity-90">Confidence: {(confidence * 100).toFixed(0)}%</p>
        </div>
      </div>
      
      {description && (
        <div className="mt-3 text-sm">
          <p>{description}</p>
        </div>
      )}
      
      {recommendation && (
        <div className="mt-3 flex items-center p-2 bg-black bg-opacity-20 rounded">
          <Shield size={16} className="mr-2 flex-shrink-0" />
          <p className="text-sm">{recommendation}</p>
        </div>
      )}
    </motion.div>
  );
};

// Network display component
const NetworkDisplay = ({ isCorrectNetwork, networkName, switchNetwork }) => {
  return (
    <div className="flex items-center bg-gray-800 px-3 py-2 rounded-md">
      <div className={`h-3 w-3 rounded-full ${isCorrectNetwork ? 'bg-green-500' : 'bg-yellow-500'} mr-2`}></div>
      <span className="text-sm mr-2">{networkName}</span>
      {!isCorrectNetwork && (
        <button 
          onClick={switchNetwork}
          className="text-xs bg-blue-600 px-2 py-1 rounded-full"
        >
          Switch Network
        </button>
      )}
    </div>
  );
};

// Main Transaction Analyzer Component
const TransactionAnalyzer = () => {
  // Mock wallet state
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [network, setNetwork] = useState({ 
    isCorrectNetwork: true, 
    name: 'Ethereum' 
  });
  
  // Transaction state
  const [transaction, setTransaction] = useState({
    to: '',
    data: '',
    value: '0',
    from: '',
    chainId: 1
  });
  
  // Analysis state
  const [loading, setLoading] = useState(false);
  const [threatAnalysis, setThreatAnalysis] = useState(null);
  const [simulation, setSimulation] = useState(null);
  const [activeTab, setActiveTab] = useState('analysis');
  const [expanded, setExpanded] = useState({
    details: false,
    simulation: false,
    recommendations: true
  });
  
  // Connect wallet
  const connectWallet = async () => {
    setLoading(true);
    try {
      // Mock connection - in production this would use MetaMask
      setTimeout(() => {
        setWalletConnected(true);
        setWalletAddress('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
        setTransaction(prev => ({...prev, from: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'}));
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      setLoading(false);
    }
  };
  
  // Switch network
  const switchNetwork = async () => {
    setLoading(true);
    try {
      // Mock network switch - in production this would use MetaMask
      setTimeout(() => {
        setNetwork({ isCorrectNetwork: true, name: 'Ethereum' });
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to switch network:', error);
      setLoading(false);
    }
  };
  
  // Format ETH value
  const formatEthValue = (value) => {
    // Simple ETH formatter - in production use ethers.js
    return parseFloat(value).toFixed(6);
  };
  
  // Toggle expanded sections
  const toggleSection = (section) => {
    setExpanded(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Get transaction from wallet
  const getTransactionFromWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('MetaMask not detected! Please install MetaMask extension first.');
        return;
      }
  
      // Create a selection of realistic Sepolia testnet transaction examples
      const templates = [
        {
          name: "Token Approval (Unlimited)",
          to: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // WETH on Sepolia
          data: '0x095ea7b3000000000000000000000000c532a74256d3db42d0bf7a0400fefdbad7694008ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', // Approve Uniswap Router unlimited
          value: '0',
          description: 'WETH unlimited approval to Uniswap Router on Sepolia'
        },
        {
          name: "Token Approval (Limited)",
          to: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // WETH on Sepolia
          data: '0x095ea7b3000000000000000000000000c532a74256d3db42d0bf7a0400fefdbad76940080000000000000000000000000000000000000000000000001bc16d674ec80000', // Approve 2 WETH
          value: '0',
          description: 'WETH limited approval (2 WETH) to Uniswap Router on Sepolia'
        },
        {
          name: "Token Transfer",
          to: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // WETH on Sepolia
          data: '0xa9059cbb0000000000000000000000001234567890123456789012345678901234567890000000000000000000000000000000000000000000000000de0b6b3a7640000', // Transfer 1 WETH
          value: '0',
          description: 'Transfer 1 WETH to another address on Sepolia'
        },
        {
          name: "ETH Transfer",
          to: '0x1234567890123456789012345678901234567890', // Random address
          data: '0x',
          value: '100000000000000000', // 0.1 ETH
          description: 'Send 0.1 ETH to an address on Sepolia'
        }
      ];
  
      // Let user choose a template
      const templateIndex = prompt(
        `Choose a transaction type to analyze (enter 1-${templates.length}):\n\n` +
        templates.map((tx, i) => `${i+1}. ${tx.name}: ${tx.description}`).join('\n')
      );
      
      if (templateIndex) {
        const index = parseInt(templateIndex) - 1;
        if (index >= 0 && index < templates.length) {
          const template = templates[index];
          setTransaction({
            to: template.to,
            data: template.data,
            value: template.value,
            from: walletAddress,
            chainId: 11155111 // Sepolia chain ID
          });
          alert(`Loaded ${template.name} transaction for analysis`);
        } else {
          alert('Invalid selection');
        }
      }
    } catch (error) {
      console.error('Failed to get transaction:', error);
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Analyze transaction
  const analyzeTransaction = async () => {
    if (!transaction.to || !transaction.data) {
      alert('Please provide transaction details');
      return;
    }
    
    setLoading(true);
    
    try {
      // In production, this would call your API
      // Here we'll simulate the analysis with mock data
      setTimeout(() => {
        // Determine if it's an approval transaction
        const isApproval = transaction.data.startsWith('0x095ea7b3');
        const isUnlimitedApproval = transaction.data.includes('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
        
        // Generate threat analysis based on transaction type
        const threatData = {
          threatLevel: isUnlimitedApproval ? 'HIGH' : 'SAFE',
          confidence: isUnlimitedApproval ? 0.9 : 0.8,
          mitigationSuggestions: isUnlimitedApproval ? [
            'Use a limited approval amount instead of unlimited',
            'Verify the contract address on Etherscan',
            'Consider using a hardware wallet for large approvals'
          ] : [
            'Verify the contract address on Etherscan'
          ],
          details: {
            mlScore: isUnlimitedApproval ? 0.8 : 0.2,
            signatureMatches: isUnlimitedApproval ? [
              {
                pattern: 'unlimited_approval',
                type: 'APPROVAL_PHISHING',
                description: 'Unlimited token approval',
                severity: 8
              }
            ] : [],
            similarTransactions: [
              {
                txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                similarityScore: 0.8,
                isScam: isUnlimitedApproval
              }
            ],
            llmAnalysis: {
              assessment: isUnlimitedApproval ? 'SUSPICIOUS' : 'SAFE',
              reasoning: isUnlimitedApproval ? 
                "This transaction is granting unlimited token approval to a contract, which represents a significant security risk. Unlimited approvals give the approved contract complete control over tokens of that type in your wallet." : 
                "This transaction appears to be using standard parameters and interacting with a known contract."
            }
          }
        };
        
        // Generate simulation data
        const simData = {
          success: true,
          statusCode: 1,
          gasEstimate: {
            gasUsed: '100000',
            gasLimit: '250000',
            gasCost: '0.005',
            gasCostUSD: 10.00
          },
          balanceChanges: isApproval ? [
            {
              address: transaction.to,
              symbol: 'USDC',
              name: 'USD Coin',
              decimals: 6,
              oldBalance: '1000.0',
              newBalance: '1000.0',
              absoluteChange: '0.0',
              percentageChange: 0,
              usdValueChange: 0
            }
          ] : [
            {
              address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
              symbol: 'USDC',
              name: 'USD Coin',
              decimals: 6,
              oldBalance: '1000.0',
              newBalance: '1100.0',
              absoluteChange: '+100.0',
              percentageChange: 10,
              usdValueChange: 100
            },
            {
              address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
              symbol: 'ETH',
              name: 'Ethereum',
              decimals: 18,
              oldBalance: '10.0',
              newBalance: '9.9',
              absoluteChange: '-0.1',
              percentageChange: -1,
              usdValueChange: -200
            }
          ],
          warnings: {
            customWarnings: isUnlimitedApproval ? ['Unlimited approval detected'] : []
          },
          visualizationData: {},
          simulationId: `sim-${Date.now()}`,
          mevExposure: null // Add this line to define the property
        };
        
        // Add MEV exposure if it's a swap
        if (!isApproval) {
          simData.mevExposure = {
            sandwichRisk: 65,
            frontrunningRisk: 35,
            backrunningRisk: 25,
            potentialMEVLoss: '0.02',
            suggestedProtections: [
              'Use a private transaction service',
              'Add minimum output requirements',
              'Consider using an MEV-protected RPC'
            ]
          };
        }
        
        setThreatAnalysis(threatData);
        setSimulation(simData);
        setLoading(false);
      }, 2000);
    } catch (error) {
      console.error('Analysis error:', error);
      setLoading(false);
    }
  };
  
  // Execute transaction
  const executeTransaction = async () => {
    if (!threatAnalysis || !simulation) {
      alert('Please analyze the transaction first');
      return;
    }
    
    // Check if critical threat
    if (threatAnalysis.threatLevel === 'CRITICAL') {
      if (!window.confirm('⚠️ CRITICAL THREAT DETECTED! Are you absolutely sure you want to proceed?')) {
        return;
      }
    } else if (threatAnalysis.threatLevel === 'HIGH') {
      if (!window.confirm('⚠️ HIGH RISK TRANSACTION! Are you sure you want to proceed?')) {
        return;
      }
    }
    
    // In production, this would call your transaction service
    alert('Transaction submitted successfully!');
  };
  
  // Execute safer alternative
  const executeSaferAlternative = async (alternativeIndex) => {
    alert(`Executing safer alternative ${alternativeIndex + 1}`);
  };
  
  // Render threat indicator component
  const renderThreatIndicator = () => {
    if (!threatAnalysis) return null;
    
    return (
      <ThreatIndicator 
        level={threatAnalysis.threatLevel}
        confidence={threatAnalysis.confidence}
        description={threatAnalysis.details.llmAnalysis?.reasoning}
        recommendation={threatAnalysis.mitigationSuggestions[0]}
      />
    );
  };
  
  // Render threat details
  const renderThreatDetails = () => {
    if (!threatAnalysis) return null;
    
    return (
      <motion.div 
        className="mb-6 bg-gray-800 rounded-lg overflow-hidden"
        initial={{ opacity: 0, height: 0 }}
        animate={{ 
          opacity: expanded.details ? 1 : 0.8,
          height: expanded.details ? 'auto' : '60px'
        }}
        transition={{ duration: 0.3 }}
      >
        <div 
          className="p-4 flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('details')}
        >
          <h3 className="text-lg font-medium flex items-center">
            <Shield className="mr-2" size={20} />
            Threat Analysis Details
          </h3>
          {expanded.details ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        
        {expanded.details && (
          <div className="p-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-900 p-4 rounded-lg">
                <h4 className="text-sm text-gray-400 mb-2">ML Score</h4>
                <div className="flex items-center">
                  <div 
                    className="w-full bg-gray-700 h-3 rounded-full overflow-hidden"
                  >
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: `${threatAnalysis.details.mlScore * 100}%`,
                        backgroundColor: threatAnalysis.details.mlScore > 0.7 ? '#EF4444' :
                          threatAnalysis.details.mlScore > 0.4 ? '#F59E0B' : '#10B981'
                      }}
                    />
                  </div>
                  <span className="ml-2 text-sm">{(threatAnalysis.details.mlScore * 100).toFixed(0)}%</span>
                </div>
              </div>
              
              <div className="bg-gray-900 p-4 rounded-lg">
                <h4 className="text-sm text-gray-400 mb-2">Similar Scams</h4>
                <div className="text-xl font-bold">
                  {threatAnalysis.details.similarTransactions.filter(tx => tx.isScam).length}
                  <span className="text-sm text-gray-400 ml-1">detected</span>
                </div>
              </div>
            </div>
            
            {threatAnalysis.details.signatureMatches.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm text-gray-400 mb-2">Signature Matches</h4>
                <div className="bg-gray-900 p-4 rounded-lg">
                  {threatAnalysis.details.signatureMatches.map((match, i) => (
                    <div key={i} className="mb-2 last:mb-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <AlertTriangle 
                            size={16} 
                            className="mr-2"
                            color={match.severity > 7 ? '#EF4444' : 
                              match.severity > 5 ? '#F59E0B' : '#10B981'}
                          />
                          <span>{match.description}</span>
                        </div>
                        <div className="text-sm px-2 py-1 rounded-full" style={{
                          backgroundColor: match.severity > 7 ? '#EF4444' : 
                            match.severity > 5 ? '#F59E0B' : '#10B981',
                          opacity: 0.8
                        }}>
                          Severity: {match.severity}/10
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {threatAnalysis.details.llmAnalysis && (
              <div className="mt-4">
                <h4 className="text-sm text-gray-400 mb-2">AI Analysis</h4>
                <div className="bg-gray-900 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <span className="font-medium mr-2">Assessment:</span>
                    <span className="px-2 py-1 rounded-full text-sm" style={{
                      backgroundColor: threatAnalysis.details.llmAnalysis.assessment === 'DANGEROUS' ? '#EF4444' :
                        threatAnalysis.details.llmAnalysis.assessment === 'SUSPICIOUS' ? '#F59E0B' : '#10B981',
                      color: 'white'
                    }}>
                      {threatAnalysis.details.llmAnalysis.assessment}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300">{threatAnalysis.details.llmAnalysis.reasoning}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  };
  
  // Render recommendations
  const renderRecommendations = () => {
    if (!threatAnalysis) return null;
    
    return (
      <motion.div 
        className="mb-6 bg-gray-800 rounded-lg overflow-hidden"
        initial={{ opacity: 0, height: 0 }}
        animate={{ 
          opacity: expanded.recommendations ? 1 : 0.8,
          height: expanded.recommendations ? 'auto' : '60px'
        }}
        transition={{ duration: 0.3 }}
      >
        <div 
          className="p-4 flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('recommendations')}
        >
          <h3 className="text-lg font-medium flex items-center">
            <Shield className="mr-2" size={20} />
            Security Recommendations
          </h3>
          {expanded.recommendations ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        
        {expanded.recommendations && (
          <div className="p-4 pt-0">
            <ul className="space-y-3">
              {threatAnalysis.mitigationSuggestions.map((suggestion, i) => (
                <li key={i} className="flex items-start">
                  <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div>
                    <p>{suggestion}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </motion.div>
    );
  };
  
  // Render simulation results
  const renderSimulation = () => {
    if (!simulation) return null;
    
    return (
      <motion.div 
        className="mb-6 bg-gray-800 rounded-lg overflow-hidden"
        initial={{ opacity: 0, height: 0 }}
        animate={{ 
          opacity: expanded.simulation ? 1 : 0.8,
          height: expanded.simulation ? 'auto' : '60px'
        }}
        transition={{ duration: 0.3 }}
      >
        <div 
          className="p-4 flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('simulation')}
        >
          <h3 className="text-lg font-medium flex items-center">
            <Activity className="mr-2" size={20} />
            Transaction Simulation
          </h3>
          {expanded.simulation ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        
        {expanded.simulation && (
          <div className="p-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-900 p-4 rounded-lg">
                <h4 className="text-sm text-gray-400 mb-2">Status</h4>
                <div className="flex items-center">
                  {simulation.success ? (
                    <>
                      <Check size={20} className="mr-2 text-green-500" />
                      <span className="text-green-500 font-medium">Success</span>
                    </>
                  ) : (
                    <>
                      <X size={20} className="mr-2 text-red-500" />
                      <span className="text-red-500 font-medium">Failed</span>
                    </>
                  )}
                </div>
                {!simulation.success && simulation.revertReason && (
                  <div className="mt-2 text-sm text-red-400">
                    Reason: {simulation.revertReason}
                  </div>
                )}
              </div>
              
              <div className="bg-gray-900 p-4 rounded-lg">
                <h4 className="text-sm text-gray-400 mb-2">Gas Used</h4>
                <div className="text-xl font-bold">
                  {parseInt(simulation.gasEstimate.gasUsed).toLocaleString()}
                  <span className="text-sm text-gray-400 ml-1">units</span>
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  Est. Cost: {parseFloat(simulation.gasEstimate.gasCost).toFixed(6)} ETH 
                  (${simulation.gasEstimate.gasCostUSD.toFixed(2)})
                </div>
              </div>
              
              <div className="bg-gray-900 p-4 rounded-lg">
                <h4 className="text-sm text-gray-400 mb-2">Balance Changes</h4>
                <div className="text-xl font-bold">
                  {simulation.balanceChanges.length}
                  <span className="text-sm text-gray-400 ml-1">tokens affected</span>
                </div>
              </div>
            </div>
            
            {simulation.balanceChanges.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm text-gray-400 mb-2">Token Balance Changes</h4>
                <div className="bg-gray-900 p-4 rounded-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-400 border-b border-gray-700">
                          <th className="pb-2 pr-4">Token</th>
                          <th className="pb-2 pr-4">Old Balance</th>
                          <th className="pb-2 pr-4">New Balance</th>
                          <th className="pb-2 pr-4">Change</th>
                          <th className="pb-2">USD Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {simulation.balanceChanges.map((change, i) => (
                          <tr key={i} className="border-b border-gray-700">
                            <td className="py-3 pr-4">
                              <div className="flex items-center">
                                <div className="w-5 h-5 bg-gray-700 rounded-full mr-2 flex items-center justify-center text-xs">
                                  {change.symbol.charAt(0)}
                                </div>
                                <span className="font-medium">{change.symbol}</span>
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              {parseFloat(change.oldBalance).toFixed(change.symbol === 'ETH' ? 6 : 2)}
                            </td>
                            <td className="py-3 pr-4">
                              {parseFloat(change.newBalance).toFixed(change.symbol === 'ETH' ? 6 : 2)}
                            </td>
                            <td className="py-3 pr-4">
                              <span className={parseFloat(change.absoluteChange) >= 0 ? 'text-green-500' : 'text-red-500'}>
                                {parseFloat(change.absoluteChange) >= 0 ? '+' : ''}
                                {parseFloat(change.absoluteChange).toFixed(change.symbol === 'ETH' ? 6 : 2)}
                                {' '}
                                ({change.percentageChange >= 0 ? '+' : ''}
                                {change.percentageChange.toFixed(2)}%)
                              </span>
                            </td>
                            <td className="py-3">
                              {change.usdValueChange !== undefined ? (
                                <span className={change.usdValueChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                                  {change.usdValueChange >= 0 ? '+' : ''}
                                  ${Math.abs(change.usdValueChange).toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-gray-500">N/A</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            
            {simulation.mevExposure && (
              <div className="mt-6">
                <h4 className="text-sm text-gray-400 mb-3">MEV Exposure Analysis</h4>
                <div className="bg-gray-900 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <h5 className="text-xs text-gray-500 mb-1">Sandwich Attack Risk</h5>
                      <div className="flex items-center">
                        <div className="w-full bg-gray-700 h-3 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full" 
                            style={{ 
                              width: `${simulation.mevExposure.sandwichRisk}%`,
                              backgroundColor: simulation.mevExposure.sandwichRisk > 70 ? '#EF4444' :
                                simulation.mevExposure.sandwichRisk > 40 ? '#F59E0B' : '#10B981'
                            }}
                          />
                        </div>
                        <span className="ml-2 text-sm">{simulation.mevExposure.sandwichRisk}%</span>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="text-xs text-gray-500 mb-1">Frontrunning Risk</h5>
                      <div className="flex items-center">
                        <div className="w-full bg-gray-700 h-3 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full" 
                            style={{ 
                              width: `${simulation.mevExposure.frontrunningRisk}%`,
                              backgroundColor: simulation.mevExposure.frontrunningRisk > 70 ? '#EF4444' :
                                simulation.mevExposure.frontrunningRisk > 40 ? '#F59E0B' : '#10B981'
                            }}
                          />
                        </div>
                        <span className="ml-2 text-sm">{simulation.mevExposure.frontrunningRisk}%</span>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="text-xs text-gray-500 mb-1">Potential MEV Loss</h5>
                      <div className="text-lg font-medium">
                        ~ {simulation.mevExposure.potentialMEVLoss} ETH
                      </div>
                    </div>
                  </div>
                  
                  {simulation.mevExposure.suggestedProtections.length > 0 && (
                    <div className="mt-3">
                      <h5 className="text-xs text-gray-500 mb-2">Suggested Protections</h5>
                      <ul className="text-sm space-y-1">
                        {simulation.mevExposure.suggestedProtections.map((protection, i) => (
                          <li key={i} className="flex items-start">
                            <Shield size={14} className="mr-2 mt-1 flex-shrink-0" />
                            <span>{protection}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  };
  
  // Render safer alternatives
  const renderAlternatives = () => {
    if (!threatAnalysis || !simulation) return null;
    
    // Sample alternatives
    const alternatives = [
      {
        title: 'Limited Token Approval',
        description: 'Approve only the exact amount needed instead of infinite approval',
        riskReduction: 85,
        gasDifference: '+5%',
        implementation: 'Modified transaction with max approval of 100 tokens'
      },
      {
        title: 'Optimized Gas Settings',
        description: 'Same transaction with optimized gas settings to reduce MEV risk',
        riskReduction: 40,
        gasDifference: '-15%',
        implementation: 'Private transaction with MEV protection'
      },
      {
        title: 'Safer Contract Interaction',
        description: 'Use TX Shield smart contract as proxy for additional security',
        riskReduction: 95,
        gasDifference: '+10%',
        implementation: 'Transaction routed through TXShield contract with safety checks'
      }
    ];
    
    return (
      <motion.div 
        className="mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <Shield className="mr-2" size={20} />
          Safer Alternatives
        </h3>
        
        <div className="space-y-4">
          {alternatives.map((alt, i) => (
            <div key={i} className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">{alt.title}</h4>
                  <p className="text-sm text-gray-400 mt-1">{alt.description}</p>
                  
                  <div className="mt-3 flex items-center space-x-4">
                    <div className="flex items-center">
                      <Shield size={16} className="mr-1 text-green-500" />
                      <span className="text-sm">Risk -{alt.riskReduction}%</span>
                    </div>
                    
                    <div className="flex items-center">
                      <Zap size={16} className="mr-1 text-yellow-500" />
                      <span className="text-sm">Gas {alt.gasDifference}</span>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500">
                    {alt.implementation}
                  </div>
                </div>
                
                <button
                  onClick={() => executeSaferAlternative(i)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-md text-sm flex items-center"
                >
                  Use This
                  <ArrowRight size={14} className="ml-1" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  };
  
  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold flex items-center">
            <Shield className="mr-3" size={28} />
            TX Shield
          </h1>
          
          {walletConnected ? (
            <div className="flex items-center space-x-2">
              <div className="flex items-center bg-gray-800 px-3 py-2 rounded-md">
                <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
                <span className="text-sm">{`${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}`}</span>
              </div>
              <NetworkDisplay 
                isCorrectNetwork={network.isCorrectNetwork} 
                networkName={network.name}
                switchNetwork={switchNetwork}
              />
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
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="col-span-2">
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-medium mb-6">Analyze Transaction</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Contract Address</label>
                  <input
                    type="text"
                    value={transaction.to}
                    onChange={(e) => setTransaction(prev => ({ ...prev, to: e.target.value }))}
                    placeholder="0x..."
                    className="w-full px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Transaction Data (hex)</label>
                  <textarea
                    value={transaction.data}
                    onChange={(e) => setTransaction(prev => ({ ...prev, data: e.target.value }))}
                    placeholder="0x..."
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Value (ETH)</label>
                  <input
                    type="text"
                    value={formatEthValue(parseFloat(transaction.value) / 1e18)}
                    onChange={(e) => {
                      try {
                        const value = e.target.value === '' ? '0' : e.target.value;
                        const valueWei = Math.floor(parseFloat(value) * 1e18).toString();
                        setTransaction(prev => ({ ...prev, value: valueWei }));
                      } catch (error) {
                        // Invalid ETH amount, don't update
                      }
                    }}
                    placeholder="0.0"
                    className="w-full px-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex space-x-4">
                  <button
                    onClick={getTransactionFromWallet}
                    disabled={!walletConnected || loading}
                    className={`px-4 py-2 rounded-md flex-1 transition-colors flex items-center justify-center ${
                      !walletConnected || loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-600' 
                    }`}
                  >
                    <Activity size={16} className="mr-2" />
                    Get From Wallet
                  </button>
                  
                  <button
                    onClick={analyzeTransaction}
                    disabled={loading || !transaction.to || !transaction.data}
                    className={`px-4 py-2 rounded-md flex-1 transition-colors flex items-center justify-center ${
                      loading || !transaction.to || !transaction.data ? 
                      'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Shield size={16} className="mr-2" />
                        Analyze Transaction
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <div className="bg-gray-800 p-6 rounded-lg h-full flex flex-col">
              <h2 className="text-xl font-medium mb-6">Project Info</h2>
              
              <div className="text-sm space-y-4 flex-grow">
                <p>
                  TX Shield provides advanced security for crypto transactions 
                  through AI-powered threat detection and simulation.
                </p>
                
                <div className="pt-2">
                  <h3 className="font-medium mb-2">Key Features:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5 text-xs">
                        1
                      </div>
                      <span>AI-powered threat detection</span>
                    </li>
                    <li className="flex items-start">
                      <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5 text-xs">
                        2
                      </div>
                      <span>Transaction simulation with MEV protection</span>
                    </li>
                    <li className="flex items-start">
                      <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5 text-xs">
                        3
                      </div>
                      <span>Secure alternative suggestions</span>
                    </li>
                    <li className="flex items-start">
                      <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5 text-xs">
                        4
                      </div>
                      <span>Smart contract protection layer</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="text-sm text-gray-400">
                  <div className="flex items-center">
                    <DollarSign size={14} className="mr-1" />
                    <span>Gas saved: 128.5 ETH</span>
                  </div>
                  <div className="flex items-center mt-1">
                    <Shield size={14} className="mr-1" />
                    <span>Threats blocked: 1,285</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Results Section */}
        {(threatAnalysis || simulation) && (
          <div>
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="flex border-b border-gray-700 mb-6">
                <button
                  className={`px-4 py-2 border-b-2 ${
                    activeTab === 'analysis' ? 
                    'border-blue-500 text-blue-500' : 
                    'border-transparent text-gray-400'
                  }`}
                  onClick={() => setActiveTab('analysis')}
                >
                  Threat Analysis
                </button>
                <button
                  className={`px-4 py-2 border-b-2 ${
                    activeTab === 'simulation' ? 
                    'border-blue-500 text-blue-500' : 
                    'border-transparent text-gray-400'
                  }`}
                  onClick={() => setActiveTab('simulation')}
                >
                  Simulation Results
                </button>
                <button
                  className={`px-4 py-2 border-b-2 ${
                    activeTab === 'alternatives' ? 
                    'border-blue-500 text-blue-500' : 
                    'border-transparent text-gray-400'
                  }`}
                  onClick={() => setActiveTab('alternatives')}
                >
                  Safer Alternatives
                </button>
              </div>
              
              <AnimatePresence mode="wait">
                {activeTab === 'analysis' && (
                  <motion.div
                    key="analysis"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {renderThreatIndicator()}
                    {renderThreatDetails()}
                    {renderRecommendations()}
                    
                    <div className="flex justify-end space-x-4 mt-8">
                      <button
                        onClick={() => setActiveTab('alternatives')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex items-center"
                      >
                        View Safer Alternatives
                        <ArrowRight size={16} className="ml-2" />
                      </button>
                      
                      <button
                        onClick={executeTransaction}
                        className={`px-4 py-2 rounded-md transition-colors flex items-center ${
                          threatAnalysis && threatAnalysis.threatLevel === 'CRITICAL' ? 
                          'bg-red-700 hover:bg-red-800' : 
                          threatAnalysis && threatAnalysis.threatLevel === 'HIGH' ? 
                          'bg-orange-600 hover:bg-orange-700' :
                          'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        Execute Transaction
                        <ArrowRight size={16} className="ml-2" />
                      </button>
                    </div>
                  </motion.div>
                )}
                
                {activeTab === 'simulation' && (
                  <motion.div
                    key="simulation"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {renderSimulation()}
                    
                    <div className="flex justify-end space-x-4 mt-8">
                      <button
                        onClick={() => setActiveTab('alternatives')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex items-center"
                      >
                        View Safer Alternatives
                        <ArrowRight size={16} className="ml-2" />
                      </button>
                      
                      <button
                        onClick={executeTransaction}
                        className={`px-4 py-2 rounded-md transition-colors flex items-center ${
                          threatAnalysis && threatAnalysis.threatLevel === 'CRITICAL' ? 
                          'bg-red-700 hover:bg-red-800' : 
                          threatAnalysis && threatAnalysis.threatLevel === 'HIGH' ? 
                          'bg-orange-600 hover:bg-orange-700' :
                          'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        Execute Transaction
                        <ArrowRight size={16} className="ml-2" />
                      </button>
                    </div>
                  </motion.div>
                )}
                
                {activeTab === 'alternatives' && (
                  <motion.div
                    key="alternatives"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {renderAlternatives()}
                    
                    <div className="flex justify-end space-x-4 mt-8">
                      <button
                        onClick={() => setActiveTab('analysis')}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors flex items-center"
                      >
                        Back to Analysis
                      </button>
                      
                      <button
                        onClick={executeTransaction}
                        className={`px-4 py-2 rounded-md transition-colors flex items-center ${
                          threatAnalysis && threatAnalysis.threatLevel === 'CRITICAL' ? 
                          'bg-red-700 hover:bg-red-800' : 
                          threatAnalysis && threatAnalysis.threatLevel === 'HIGH' ? 
                          'bg-orange-600 hover:bg-orange-700' :
                          'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        Execute Original Transaction
                        <ArrowRight size={16} className="ml-2" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionAnalyzer;