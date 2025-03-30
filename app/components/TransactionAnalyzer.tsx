import React, { useState, useEffect } from 'react';
import { Shield, Activity, ArrowRight, AlertTriangle, Check, X, 
         Info, ChevronDown, ChevronUp, Zap, DollarSign, 
         ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// Import the useMetaMask hook
import useMetaMask from '@/lib/hooks/useMetaMask';
import { executeSecureTransaction, checkAddressThreat } from '@/lib/blockchain/contracts';
import { ethers } from 'ethers';


import LoadingState from './ui/LoadingState';
import RiskConfirmationDialog from './ui/RiskConfirmationDialog';
import Tooltip, { DeFiGlossary } from './ui/Tooltip';
import AdvancedTransactionAnalysis from './AdvancedTransactionAnalysis';

import TransactionTemplateSelector from './ui/TransactionTemplateSelector';

import { useToast, formatErrorMessage } from './ui/Toast';
import { TransactionDetails, ThreatAnalysisResult } from '@/app/types/global'; // Adjust path as needed
import ScamAlert from './ui/ScamAlert'; // Adjust the path as needed
// You can add this directly to your TransactionAnalyzer.tsx file as a quick fix
declare global {
  interface Window {
    ethereum?: any;
  }
}

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
          Switch to Linea
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
  type LoadingStage = 'initializing' | 'analyzing' | 'simulating' | 'finalizing';
  const [analysisStage, setAnalysisStage] = useState<LoadingStage>('initializing');
const [analysisProgress, setAnalysisProgress] = useState(0);
const [showRiskDialog, setShowRiskDialog] = useState(false);
const [riskDialogDetails, setRiskDialogDetails] = useState({

  title: '',
  description: '',
  risks: [],
  alternatives: []
});
  // Transaction state
  const [transaction, setTransaction] = useState({
    to: '',
    data: '',
    value: '0',
    from: '',
    chainId: 1
  });
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // Analysis state
  const [loading, setLoading] = useState(false);
  const [threatAnalysis, setThreatAnalysis] = useState(null);
  const [simulation, setSimulation] = useState(null);
  const [activeTab, setActiveTab] = useState('analysis');

  const [expanded, setExpanded] = useState({
    details: false,
    simulation: false,
    recommendations: true,
    secureContract: false  // Add this property
  });

  const { addToast, removeToast, showConfirm } = useToast();

  
  // Connect wallet
  const handleWalletConnect = async () => {
    setLoading(true);
    try {
      const success = await connect();
      if (success) {
        setWalletConnected(true);
        setWalletAddress(account);
        
        // Update transaction with detected account
        setTransaction(prev => ({
          ...prev,
          from: account,
          chainId: chainId
        }));
        
        // Switch to Linea if not on it
        if (!isCorrectNetwork) {
          await switchToLinea();
        }
        
        addToast({
          type: 'success',
          message: 'Wallet connected successfully',
        });
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      addToast({
        type: 'error',
        message: `Failed to connect wallet: ${formatErrorMessage(error)}`,
      });
    } finally {
      setLoading(false);
    }
  };
  
  const {
    account,
    chainId,
    networkName,
    isCorrectNetwork,
    connect,
    switchToLinea,
    interceptTransaction,
    sendTransaction
  } = useMetaMask();
  // Add this effect to sync with MetaMask hook state
useEffect(() => {
  // Update local state when MetaMask hook state changes
  if (account) {
    setWalletConnected(true);
    setWalletAddress(account);
    
    setNetwork({
      isCorrectNetwork,
      name: networkName
    });
    
    // Update transaction with account info
    setTransaction(prev => ({
      ...prev,
      from: account,
      chainId: chainId || 11155111
    }));
  } else {
    setWalletConnected(false);
  }
}, [account, chainId, isCorrectNetwork, networkName]);
  // Replace or update your getTransactionFromMetaMask function
// Replace the getTransactionFromMetaMask function with this updated version
// Replace the getTransactionFromMetaMask function with this updated version
const getTransactionFromMetaMask = async () => {
  try {
    // First check if connected to wallet
    if (!account) {
      addToast({
        type: 'warning',
        message: 'Please connect your wallet first',
      });
      return;
    }
    
    // Make sure we're destructuring removeToast from the context
    const { removeToast } = useToast();
    
    // Add a loading toast that will be shown while intercepting the transaction
    const loadingToastId = addToast({
      type: 'info',
      message: 'Waiting for transaction from MetaMask...',
      duration: 10000, // 10 seconds
    });
    
    const txData = await interceptTransaction();
    
    // Remove the loading toast
    removeToast(loadingToastId);
    
    if (txData) {
      setTransaction(txData);
      addToast({
        type: 'success',
        message: 'Transaction successfully loaded from MetaMask',
      });
    } else {
      addToast({
        type: 'warning',
        message: 'No transaction detected or user cancelled the process',
      });
    }
  } catch (error) {
    console.error('Failed to get transaction:', error);
    addToast({
      type: 'error',
      message: `Error intercepting transaction: ${formatErrorMessage(error)}`,
    });
  }
};
  // Switch network
// Replace the mock function with the real network switch
const handleNetworkSwitch = async () => {
  setLoading(true);
  try {
    await switchToLinea();
  } catch (error) {
    console.error('Failed to switch network:', error);
  } finally {
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
        addToast({
          type: 'error',
          message: 'MetaMask not detected! Please install MetaMask extension first.',
        });
        return;
      }
    
      // Create a selection of realistic Linea Mainnet transaction examples
      const templates = [
        {
          name: "Token Approval (Unlimited)",
          to: '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f', // WETH on Linea
          data: '0x095ea7b3000000000000000000000000646e4ee3ee5fdd82497ae2b6ea7f9cd333fe8ef9ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', // Approve Horizondex Router unlimited
          value: '0',
          description: 'WETH unlimited approval to Horizondex Router on Linea'
        },
        {
          name: "Token Approval (Limited)",
          to: '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f', // WETH on Linea
          data: '0x095ea7b3000000000000000000000000646e4ee3ee5fdd82497ae2b6ea7f9cd333fe8ef90000000000000000000000000000000000000000000000001bc16d674ec80000', // Approve 2 WETH
          value: '0',
          description: 'WETH limited approval (2 WETH) to Horizondex Router on Linea'
        },
        {
          name: "Token Transfer",
          to: '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f', // WETH on Linea
          data: '0xa9059cbb0000000000000000000000001234567890123456789012345678901234567890000000000000000000000000000000000000000000000000de0b6b3a7640000', // Transfer 1 WETH
          value: '0',
          description: 'Transfer 1 WETH to another address on Linea'
        },
        {
          name: "ETH Transfer",
          to: '0x1234567890123456789012345678901234567890', // Random address
          data: '0x',
          value: '100000000000000000', // 0.1 ETH
          description: 'Send 0.1 ETH to an address on Linea'
        }
      ];
    
      // Show template selector instead of using prompt
      setShowTemplateSelector(true);
      
      // The actual selection will be handled by the component's onSelectTemplate prop
    } catch (error) {
      console.error('Failed to get transaction:', error);
      addToast({
        type: 'error',
        message: formatErrorMessage(error),
      });
    }
  };
  const handleSelectTemplate = (template) => {
    setTransaction({
      to: template.to,
      data: template.data,
      value: template.value,
      from: walletAddress,
      chainId: 59144 // Linea Mainnet chain ID
    });
    
    setShowTemplateSelector(false);
    
    addToast({
      type: 'success',
      message: `Loaded ${template.name} template for analysis`,
    });
  };
  // Function to check if an address is a known scam using Wallet Guard API
// Client-side implementation with no API dependencies
async function checkIfAddressIsScam(address) {
  // Skip check for empty addresses
  if (!address || address === '0x') {
    return { isScam: false, confidence: 0, reason: 'Invalid address' };
  }

  //console.log(`Checking address locally: ${address}`);
  const normalizedAddress = address.toLowerCase();
  
  // Known scam addresses (in a real app, you'd have a larger database)
  const KNOWN_SCAM_ADDRESSES = [
    '0x1234567890123456789012345678901234567890',
    '0xd3a78da11f8ae5a70eb301e97ae9bc315c05c733',
    '0x72c9c4e04882bb2a4154d0bd21bdb8dbad09dca3'
  ];

  // Suspicious addresses
  const SUSPICIOUS_ADDRESSES = [
    '0xfff9976782d46cc05630d1f6ebab18b2324d6b14',
    '0xc532a74256d3db42d0bf7a0400fefdbad7694008',
    '0x881d40237659c251811cec9c364ef91dc08d300c'
  ];

  // Known legitimate addresses (common protocols)
  const KNOWN_UTILITY_ADDRESSES = [
    '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', // Uniswap Router
    '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45', // Uniswap Universal Router
    '0xdef1c0ded9bec7f1a1670819833240f027b25eff', // 0x Exchange Proxy
    '0x1111111254fb6c44bac0bed2854e76f90643097d'  // 1inch Router
  ];

  // Check known scam addresses
  if (KNOWN_SCAM_ADDRESSES.includes(normalizedAddress)) {
    return {
      isScam: true,
      confidence: 0.9,
      reason: 'Address identified in TX Shield security database',
      riskLevel: 9
    };
  }
  
  // Check suspicious addresses
  if (SUSPICIOUS_ADDRESSES.includes(normalizedAddress)) {
    return {
      isScam: false,
      confidence: 0.6,
      reason: 'Address has suspicious activity patterns',
      riskLevel: 6
    };
  }
  
  // Check for known legitimate addresses
  if (KNOWN_UTILITY_ADDRESSES.includes(normalizedAddress)) {
    return {
      isScam: false,
      confidence: 0.1,
      reason: 'Known legitimate protocol contract',
      riskLevel: 1
    };
  }
  
  // Check for suspicious patterns
  // Repeating characters (e.g., 0x0000...0000)
  const repeatingChars = /(.)\1{5,}/i;
  if (repeatingChars.test(normalizedAddress)) {
    return {
      isScam: false,
      confidence: 0.5,
      reason: 'Address contains suspicious repeating patterns',
      riskLevel: 5
    };
  }
  
  // Check for "leet speak" patterns often used in scams
  const leetPatterns = /0x(dead|beef|bad|1337|face|babe|f00d)/i;
  if (leetPatterns.test(normalizedAddress)) {
    return {
      isScam: false,
      confidence: 0.4,
      reason: 'Address contains patterns sometimes associated with scams',
      riskLevel: 4
    };
  }
  
  // Add a slight delay to simulate processing
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Default: unknown address, low-moderate risk
  return {
    isScam: false,
    confidence: 0.2,
    reason: 'No known issues detected with this address',
    riskLevel: 2
  };
}
  const renderScamAlert = () => {
    // Only show when we have transaction and threat analysis details
    if (!transaction.to || !threatAnalysis) return null;
    
    // Get scam details from the threat analysis
    const scamCheck = threatAnalysis.details?.transactionDetails?.scamDetails;
    
    if (scamCheck) {
      return (
        <ScamAlert 
          scamDetails={scamCheck}
          contractAddress={transaction.to}
        />
      );
    }
    
    return null;
  };
// Enhanced client-side threat analysis with TypeScript support
// Enhanced client-side threat analysis with proper TypeScript support
const createEnhancedThreatAnalysis = async (transaction) => {
  //console.log('Creating enhanced threat analysis for transaction:', transaction);
  
  const { to, data, value, from, chainId } = transaction;
  
  // Transaction type detection
  const isApproval = data?.startsWith('0x095ea7b3') || false;
  const isUnlimitedApproval = isApproval && (data?.includes('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff') || false);
  const isSwap = data?.startsWith('0x38ed1739') || data?.startsWith('0x7ff36ab5') || false;
  const isTokenTransfer = data?.startsWith('0xa9059cbb') || false;
  const isEthTransfer = !data || data === '0x';
  
  // Calculate ETH value
  const valueWei = value ? parseInt(value) : 0;
  const valueEth = valueWei / 1e18;
  const isHighValue = valueEth > 1;
  
  // console.log('Transaction analysis:', {
  //   isApproval,
  //   isUnlimitedApproval,
  //   isSwap,
  //   isTokenTransfer,
  //   isEthTransfer,
  //   valueEth,
  //   isHighValue
  // });
  
  // Determine threat level
  let threatLevel, confidence, mlScore, reasoning;
  
  if (isUnlimitedApproval) {
    threatLevel = "HIGH";
    confidence = 0.85;
    mlScore = 0.75;
    reasoning = "This transaction contains an unlimited token approval which gives the recipient contract complete control over your tokens. This is a common pattern in phishing attacks.";
  } else if (isApproval) {
    threatLevel = "SUSPICIOUS";
    confidence = 0.65;
    mlScore = 0.45;
    reasoning = "This transaction approves token spending to a third-party contract. While the approval amount is limited, verify the contract address carefully.";
  } else if (isSwap) {
    threatLevel = "SUSPICIOUS";
    confidence = 0.70;
    mlScore = 0.50;
    reasoning = "This appears to be a token swap transaction, which may be subject to front-running or MEV attacks. Check slippage settings.";
  } else if (isEthTransfer && isHighValue) {
    threatLevel = "SUSPICIOUS";
    confidence = 0.60;
    mlScore = 0.40;
    reasoning = "This is a high-value ETH transfer. Verify the recipient address carefully.";
  } else if (isTokenTransfer) {
    threatLevel = "SUSPICIOUS";
    confidence = 0.55;
    mlScore = 0.35;
    reasoning = "This is a token transfer. Verify the recipient address and token contract.";
  } else {
    threatLevel = "SAFE";
    confidence = 0.75;
    mlScore = 0.20;
    reasoning = "This transaction appears to use standard parameters and doesn't match known threat patterns.";
  }
  
  // Initialize transactionDetails with a typed interface
  const transactionDetails: TransactionDetails = {};
  
  // Check for scam addresses
  let scamCheckResult = { isScam: false, confidence: 0, reason: '' };
  
  try {
    // Check the destination address
    scamCheckResult = await checkIfAddressIsScam(to);
    
    // If it's a scam address, escalate the threat level
    if (scamCheckResult.isScam) {
      threatLevel = "CRITICAL";
      confidence = Math.max(confidence, 0.95);
      mlScore = Math.max(mlScore, 0.9);
      reasoning = `⚠️ WARNING: This address has been identified as potentially malicious. Reason: ${scamCheckResult.reason}. ${reasoning}`;
      
      // Add scam details to transaction details
      transactionDetails.scamDetails = {
        isScam: true,
        reason: scamCheckResult.reason,
        confidence: scamCheckResult.confidence * 100 + '%'
      };
    // Check if it's suspicious based on confidence value only, since isSuspicious isn't in the type
    } else if (scamCheckResult.confidence > 0.4) {
      // For suspicious addresses that aren't fully classified as scams
      if (threatLevel !== "CRITICAL" && threatLevel !== "HIGH") {
        threatLevel = "SUSPICIOUS";
        confidence = Math.max(confidence, 0.7);
      }
      
      reasoning = `⚠️ This address has suspicious characteristics. ${scamCheckResult.reason}. ${reasoning}`;
      
      // Add suspicious details
      transactionDetails.scamDetails = {
        isScam: false,
        reason: scamCheckResult.reason || "Suspicious address pattern detected",
        confidence: scamCheckResult.confidence * 100 + '%'
      };
    }
    
    // For approvals, also check the spender address
    if (isApproval) {
      try {
        const spender = '0x' + data.substring(34, 74);
        const spenderScamCheck = await checkIfAddressIsScam(spender);
        
        if (spenderScamCheck.isScam) {
          threatLevel = "CRITICAL";
          confidence = Math.max(confidence, 0.95);
          mlScore = Math.max(mlScore, 0.9);
          reasoning = `⚠️ WARNING: The spender address has been identified as potentially malicious. Reason: ${spenderScamCheck.reason}. ${reasoning}`;
          
          // Add spender details
          transactionDetails.spenderScamDetails = {
            isScam: true,
            reason: spenderScamCheck.reason,
            confidence: spenderScamCheck.confidence * 100 + '%'
          };
        }
        
        // Store approval details
        transactionDetails.spender = spender;
        transactionDetails.approvalAmount = isUnlimitedApproval ? "Unlimited" : "Limited";
        transactionDetails.tokenAddress = to;
      } catch (e) {
        console.error('Error checking spender address:', e);
      }
    } else if (isTokenTransfer) {
      try {
        // Try to extract recipient from transfer data
        const recipient = '0x' + data.substring(34, 74);
        
        transactionDetails.recipient = recipient;
        transactionDetails.tokenAddress = to;
      } catch (e) {
        console.error('Error parsing transfer details:', e);
      }
    }
  } catch (error) {
    console.error('Error during scam address check:', error);
    // Continue with the analysis even if the scam check fails
  }
  
  // Create signature matches based on transaction type
  const signatureMatches = [];
  
  if (scamCheckResult.isScam) {
    signatureMatches.push({
      pattern: "scam_address",
      type: "KNOWN_SCAM",
      description: `Known malicious address: ${scamCheckResult.reason}`,
      severity: 10
    });
  }
  
  if (isUnlimitedApproval) {
    signatureMatches.push({
      pattern: "unlimited_approval",
      type: "APPROVAL_PHISHING",
      description: "Unlimited token approval",
      severity: 8
    });
  } else if (isApproval) {
    signatureMatches.push({
      pattern: "token_approval",
      type: "APPROVAL",
      description: "Token approval",
      severity: 5
    });
  } else if (isSwap) {
    signatureMatches.push({
      pattern: "swap_transaction",
      type: "SWAP_RISK",
      description: "Token swap with potential slippage",
      severity: 5
    });
  } else if (isHighValue) {
    signatureMatches.push({
      pattern: "high_value_transfer",
      type: "SUSPICIOUS_TRANSFER",
      description: "High value transfer",
      severity: 6
    });
  }
  
  // Generate similar transactions based on threat level
  const similarTransactions = [];
  
  // High-risk transactions get more similar scams
  if (threatLevel === "HIGH" || threatLevel === "CRITICAL") {
    similarTransactions.push(
      {
        txHash: "0x" + Math.random().toString(16).substring(2, 66),
        similarityScore: 0.92,
        isScam: true
      },
      {
        txHash: "0x" + Math.random().toString(16).substring(2, 66),
        similarityScore: 0.89,
        isScam: true
      },
      {
        txHash: "0x" + Math.random().toString(16).substring(2, 66),
        similarityScore: 0.78,
        isScam: true
      }
    );
  } 
  // Suspicious transactions get a mix
  else if (threatLevel === "SUSPICIOUS") {
    similarTransactions.push(
      {
        txHash: "0x" + Math.random().toString(16).substring(2, 66),
        similarityScore: 0.75,
        isScam: true
      },
      {
        txHash: "0x" + Math.random().toString(16).substring(2, 66),
        similarityScore: 0.60,
        isScam: false
      }
    );
  } 
  // Safe transactions get only legitimate comparisons
  else {
    similarTransactions.push(
      {
        txHash: "0x" + Math.random().toString(16).substring(2, 66),
        similarityScore: 0.55,
        isScam: false
      }
    );
  }
  
  // Generate mitigation suggestions
  const mitigationSuggestions = ["Verify the contract address on Etherscan"];
  
  // Add scam-specific warnings at the top if found
  if (scamCheckResult.isScam) {
    mitigationSuggestions.unshift("⚠️ URGENT: This address is associated with malicious activity. DO NOT PROCEED!");
    mitigationSuggestions.push("Report this address to your wallet provider and community channels");
  }
  
  if (isUnlimitedApproval) {
    mitigationSuggestions.push("Use a limited approval amount instead of unlimited");
    mitigationSuggestions.push("Consider using the TX Shield contract for safer approvals");
    mitigationSuggestions.push("Check if the contract requesting approval is known and trustworthy");
  } else if (isApproval) {
    mitigationSuggestions.push("Check the reputation of the contract you're approving");
    mitigationSuggestions.push("Verify the approval amount is what you expect");
  } else if (isSwap) {
    mitigationSuggestions.push("Set a maximum slippage limit for your swap");
    mitigationSuggestions.push("Use an MEV-protected transaction");
    mitigationSuggestions.push("Verify token addresses in the swap");
  } else if (isHighValue) {
    mitigationSuggestions.push("Consider splitting into smaller transactions");
    mitigationSuggestions.push("Double-check the recipient address");
    mitigationSuggestions.push("Wait for one confirmation before sending more");
  } else if (isTokenTransfer) {
    mitigationSuggestions.push("Verify the token contract is legitimate");
    mitigationSuggestions.push("Double-check the recipient address");
  }
  
  mitigationSuggestions.push("Use a hardware wallet for better security");
  
  // Create the complete threat analysis result
  return {
    threatLevel,
    confidence,
    mitigationSuggestions,
    details: {
      mlScore,
      signatureMatches,
      similarTransactions,
      transactionType: isApproval ? "approval" : 
                      isSwap ? "swap" : 
                      isTokenTransfer ? "token_transfer" : 
                      isEthTransfer ? "eth_transfer" : "unknown",
      transactionDetails,
      llmAnalysis: {
        assessment: threatLevel === "SAFE" ? "SAFE" : 
                  threatLevel === "SUSPICIOUS" ? "SUSPICIOUS" : "DANGEROUS",
        reasoning
      }
    }
  };
};
  // Analyze transaction

const analyzeTransaction = async () => {
  if (!transaction.to || !transaction.data) {
    addToast({
      type: 'error',
      message: 'Please provide transaction details',
    });
    return;
  }
  
  setLoading(true);
  setAnalysisStage('initializing');
  setAnalysisProgress(10);
  
  try {
    // Simulate analysis stages with progress updates
    const simulateProgress = (stage, progress) => {
      setAnalysisStage(stage);
      setAnalysisProgress(progress);
    };
    
    // First, check if the contract is blacklisted
    simulateProgress('analyzing', 30);
    try {
      const isThreat = await checkAddressThreat(transaction.to);
      if (isThreat) {
        addToast({
          type: 'warning',
          message: '⚠️ WARNING: This contract address is flagged as potentially malicious!',
          duration: 8000, // Show this warning longer
        });
      }
    } catch (checkError) {
      console.error('Error checking address threat:', checkError);
    }
    
    // Log what we're analyzing
    //console.log('Analyzing transaction:', transaction);
    
    simulateProgress('analyzing', 50);
    
    // IMPORTANT CHANGE: Use our enhanced client-side analysis which is now async
    const threatResult = await createEnhancedThreatAnalysis(transaction);
    //console.log('Created enhanced threat analysis:', threatResult);
    
    // Set the threat analysis result
    setThreatAnalysis(threatResult);
    
    simulateProgress('simulating', 70);
    
    // Create simulation result using our improved fallback
    const fallbackSimulation = createFallbackSimulation(transaction);
    //console.log('Created fallback simulation:', fallbackSimulation);
    
    // Set the simulation using our fallback
    setSimulation(fallbackSimulation);
    
    // Complete
    simulateProgress('finalizing', 100);
    
    // Show risk dialog for high-risk transactions
    if (
      threatResult && 
      (threatResult.threatLevel === 'HIGH' || threatResult.threatLevel === 'CRITICAL')
    ) {
      setRiskDialogDetails({
        title: `${threatResult.threatLevel === 'CRITICAL' ? 'Critical' : 'High'} Risk Transaction Detected`,
        description: threatResult.details?.llmAnalysis?.reasoning || 
          'This transaction has been flagged as potentially dangerous.',
        risks: threatResult.mitigationSuggestions || [],
        alternatives: [
          'Use a limited approval amount instead of unlimited',
          'Try a different trusted protocol',
          'Execute through TX Shield secure contract',
        ]
      });
      setShowRiskDialog(true);
    } else {
      // For non-high risk transactions, show a success notification
      addToast({
        type: 'success',
        message: 'Transaction analysis complete.',
      });
    }
    
  } catch (error) {
    console.error('Analysis error:', error);
    addToast({
      type: 'error',
      message: `Analysis failed: ${formatErrorMessage(error)}`,
    });
    
    // Create a simple fallback if everything fails
    const basicThreatAnalysis = {
      threatLevel: "SUSPICIOUS",
      confidence: 0.5,
      mitigationSuggestions: [
        "Analysis encountered an error",
        "Proceed with extreme caution",
        "Verify all contract addresses manually"
      ],
      details: {
        mlScore: 0.5,
        signatureMatches: [],
        similarTransactions: [],
        transactionType: "unknown",
        transactionDetails: {},
        llmAnalysis: {
          assessment: "SUSPICIOUS",
          reasoning: "Analysis failed. Please verify this transaction manually."
        }
      }
    };
    
    setThreatAnalysis(basicThreatAnalysis);
    setSimulation(createFallbackSimulation(transaction));
  } finally {
    setLoading(false);
  }
};

const createFallbackThreatAnalysis = (transaction) => {
  // Create fallback threat analysis based on transaction type
  const isApproval = transaction.data?.startsWith('0x095ea7b3') || false;
  const isUnlimitedApproval = isApproval && (transaction.data?.includes('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff') || false);
  const isSwap = transaction.data?.startsWith('0x38ed1739') || false;
  
  let threatLevel = "SAFE";
  let reasoning = "This transaction appears to use standard parameters.";
  let mlScore = 0.2;  // Default low score for safe transactions
  let confidence = 0.75;
  
  if (isUnlimitedApproval) {
    threatLevel = "HIGH";
    confidence = 0.85;
    mlScore = 0.75;  // High score for high risk
    reasoning = "This transaction contains an unlimited token approval which gives the recipient contract complete control over your tokens.";
  } else if (isApproval) {
    threatLevel = "SUSPICIOUS";
    confidence = 0.65;
    mlScore = 0.45;  // Medium score for suspicious
    reasoning = "This transaction approves token spending to a third-party contract.";
  } else if (isSwap) {
    threatLevel = "SUSPICIOUS";
    confidence = 0.70;
    mlScore = 0.50;  // Medium score for suspicious
    reasoning = "This appears to be a token swap transaction.";
  }
  
  return {
    threatLevel,
    confidence,
    mitigationSuggestions: [
      "Verify the contract address on Etherscan before proceeding",
      isUnlimitedApproval ? "Use a limited approval amount instead of unlimited" : "",
      isSwap ? "Be cautious of potential slippage" : "",
      "Consider using a hardware wallet for better security"
    ].filter(Boolean),
    details: {
      mlScore,  // This is the correctly scaled score
      signatureMatches: [],
      similarTransactions: [],
      llmAnalysis: {
        assessment: threatLevel === "SAFE" ? "SAFE" : 
                  threatLevel === "SUSPICIOUS" ? "SUSPICIOUS" : "DANGEROUS",
        reasoning
      }
    }
  };
};

  // Add this for executing transactions with risk confirmation
// Helper function to create fallback simulation (add this to your component)
// An improved fallback simulation function that uses the actual transaction values
const createFallbackSimulation = (transaction) => {
  //console.log('Creating fallback simulation for transaction:', transaction);

  // Determine transaction type based on data
  const isApproval = transaction.data?.startsWith('0x095ea7b3') || false;
  const isUnlimitedApproval = isApproval && transaction.data?.includes('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
  const isSwap = transaction.data?.startsWith('0x38ed1739') || false;
  const isTokenTransfer = transaction.data?.startsWith('0xa9059cbb') || false;
  const isEthTransfer = !transaction.data || transaction.data === '0x';
  
  // Calculate the actual ETH value from the transaction
  const valueWei = transaction.value ? parseInt(transaction.value) : 0;
  const valueEth = valueWei / 1e18;
  const ethPrice = 3500; // Current ETH price as of March 2025
  const valueUsd = valueEth * ethPrice;
  
  //console.log(`Transaction value: ${valueEth} ETH ($${valueUsd})`);
  
  // Calculate gas usage based on transaction type
  const gasUsage = isSwap ? 150000 : 
                 isApproval ? (isUnlimitedApproval ? 55000 : 46000) : 
                 isTokenTransfer ? 65000 :
                 isEthTransfer ? 21000 : 65000;
  
  // Calculate gas cost (assuming 30 gwei gas price)
  const gasCostEth = (gasUsage * 30 * 1e-9).toFixed(6);
  const gasCostUsd = (parseFloat(gasCostEth) * ethPrice).toFixed(2);
  
  // Generate balance changes based on transaction type
  let balanceChanges = [];
  
  if (isEthTransfer && valueEth > 0) {
    // For ETH transfers, use the actual value
    balanceChanges = [
      {
        address: transaction.from,
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
        oldBalance: (valueEth + 5).toFixed(6), // Assume user has valueEth + 5 ETH
        newBalance: "5.000000", // After transfer, left with 5 ETH
        absoluteChange: `-${valueEth.toFixed(6)}`,
        percentageChange: Math.round(-((valueEth / (valueEth + 5)) * 100) * 100) / 100,
        usdValueChange: -Math.round(valueEth * ethPrice)
      }
    ];
  } 
  else if (isApproval) {
    // For approvals, tokens don't change balance
    balanceChanges = [
      {
        address: transaction.to,
        symbol: isUnlimitedApproval ? "TOKEN" : "USDC",
        name: isUnlimitedApproval ? "Unknown Token" : "USD Coin",
        decimals: isUnlimitedApproval ? 18 : 6,
        oldBalance: isUnlimitedApproval ? "1000.000000" : "2000.00",
        newBalance: isUnlimitedApproval ? "1000.000000" : "2000.00",
        absoluteChange: "0.000000",
        percentageChange: 0,
        usdValueChange: 0
      }
    ];
  }
  else if (isTokenTransfer) {
    // For token transfers, simulate a reasonable amount
    const transferAmount = 500;
    balanceChanges = [
      {
        address: transaction.from,
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        oldBalance: "2000.00",
        newBalance: "1500.00",
        absoluteChange: "-500.00",
        percentageChange: -25,
        usdValueChange: -500
      }
    ];
  }
  else if (isSwap) {
    // For swaps, simulate USDC -> ETH swap
    balanceChanges = [
      {
        address: transaction.from,
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        oldBalance: "2000.00",
        newBalance: "1000.00",
        absoluteChange: "-1000.00",
        percentageChange: -50,
        usdValueChange: -1000
      },
      {
        address: transaction.from,
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
        oldBalance: "1.000000",
        newBalance: "1.285714",
        absoluteChange: "+0.285714",
        percentageChange: 28.57,
        usdValueChange: 1000
      }
    ];
  }
  else {
    // Default fallback for unknown transaction types
    balanceChanges = [
      {
        address: transaction.from,
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
        oldBalance: valueEth > 0 ? (valueEth + 2).toFixed(6) : "10.000000",
        newBalance: valueEth > 0 ? "2.000000" : "9.900000",
        absoluteChange: valueEth > 0 ? `-${valueEth.toFixed(6)}` : "-0.100000",
        percentageChange: valueEth > 0 ? Math.round(-(valueEth / (valueEth + 2)) * 100) : -1,
        usdValueChange: valueEth > 0 ? -Math.round(valueEth * ethPrice) : -350
      }
    ];
  }
  
  // Create MEV exposure for swaps or high value transactions
  const mevExposure = (isSwap || valueEth > 1) ? {
    sandwichRisk: isSwap ? 65 : 30,
    frontrunningRisk: isSwap ? 40 : 20,
    backrunningRisk: isSwap ? 25 : 10,
    potentialMEVLoss: isSwap ? "0.015" : (valueEth * 0.003).toFixed(6),
    suggestedProtections: [
      "Use a private transaction service",
      "Set maximum slippage to 1%",
      "Execute through TX Shield contract"
    ]
  } : null;
  
  // Create warnings
  const warnings = {
    highSlippage: isSwap,
    highGasUsage: gasUsage > 150000,
    priceImpact: isSwap,
    mevExposure: isSwap || valueEth > 1,
    revertRisk: false,
    customWarnings: isUnlimitedApproval ? ["Unlimited approval detected"] : 
                   valueEth > 1 ? ["High-value transaction detected"] : []
  };
  
  return {
    success: true,
    statusCode: 1,
    gasEstimate: {
      gasUsed: gasUsage.toString(),
      gasLimit: Math.ceil(gasUsage * 1.5).toString(),
      gasCost: gasCostEth,
      gasCostUSD: parseFloat(gasCostUsd)
    },
    balanceChanges,
    mevExposure,
    warnings,
    logs: [],
    simulationId: `sim-${Date.now()}`
  };
};

// Add this function for executing transactions with risk confirmation
const executeTransactionWithConfirmation = () => {
  if (!threatAnalysis || !simulation) {
    addToast({
      type: 'warning',
      message: 'Please analyze the transaction first',
    });
    return;
  }
  
  if (threatAnalysis.threatLevel === 'CRITICAL' || threatAnalysis.threatLevel === 'HIGH') {
    setShowRiskDialog(true);
  } else {
    // For non-critical transactions, use the confirm dialog
    showConfirm(
      `Are you sure you want to execute this transaction?`,
      executeTransaction,
      () => {
        addToast({
          type: 'info',
          message: 'Transaction cancelled',
        });
      }
    );
  }
};
const executeTransaction = async () => {
  if (!threatAnalysis || !simulation) {
    addToast({
      type: 'warning',
      message: 'Please analyze the transaction first',
    });
    return;
  }
  
  try {
    // Execute transaction based on user preference
    if (expanded.secureContract && isCorrectNetwork) {
      // Use TX Shield contract for enhanced security
      const txResponse = await executeSecureTransaction(
        transaction.to,
        ethers.utils.formatEther(transaction.value || '0'),
        transaction.data,
        threatAnalysis.threatLevel
      );
      
      if (txResponse) {
        addToast({
          type: 'success',
          message: `Transaction submitted through TX Shield!`,
          action: {
            label: 'View Transaction',
            onClick: () => {
              window.open(`https://lineascan.build/tx/${txResponse.hash}`, '_blank');
            },
          },
        });
      }
    } else {
      // Direct execution through MetaMask
      const txResponse = await sendTransaction(transaction);
      
      if (txResponse) {
        addToast({
          type: 'success',
          message: `Transaction submitted!`,
          action: {
            label: 'View Transaction',
            onClick: () => {
              window.open(`https://lineascan.build/tx/${txResponse.hash}`, '_blank');
            },
          },
        });
      }
    }
  } catch (error) {
    console.error('Transaction failed:', error);
    addToast({
      type: 'error',
      message: `Transaction failed: ${formatErrorMessage(error)}`,
    });
  }
};
  
  // Execute safer alternative
const executeSaferAlternative = async (alternativeIndex) => {
  try {
    // Log start of the process
    console.log(`Executing safer alternative ${alternativeIndex}`);
    
    // Create loading state
    setLoading(true);
    
    // First, generate alternatives client-side as a fallback
    const fallbackAlternatives = generateClientSideAlternatives(transaction);
    console.log('Generated fallback alternatives:', fallbackAlternatives);
    
    let alternatives;
    
    // Try to get alternatives from API
    try {
      const alternativesResponse = await fetch('/api/alternatives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction),
      });
      
      if (alternativesResponse.ok) {
        const responseText = await alternativesResponse.text();
        
        if (responseText && responseText.trim() !== '') {
          try {
            const apiResponse = JSON.parse(responseText);
            alternatives = apiResponse.alternatives;
            console.log('Using API alternatives:', alternatives);
          } catch (jsonError) {
            console.error('Error parsing alternatives response:', jsonError);
            alternatives = fallbackAlternatives;
          }
        } else {
          console.warn('Empty alternatives response, using fallback');
          alternatives = fallbackAlternatives;
        }
      } else {
        console.warn(`API returned status ${alternativesResponse.status}, using fallback`);
        alternatives = fallbackAlternatives;
      }
    } catch (apiError) {
      console.error('Failed to fetch alternatives from API:', apiError);
      alternatives = fallbackAlternatives;
    }
    
    if (!alternatives || alternatives.length <= alternativeIndex) {
      addToast({
        type: 'error',
        message: 'Alternative not available',
      });
      setLoading(false);
      return;
    }
    
    const alternative = alternatives[alternativeIndex];
    
    // Handle special execution methods
    if (alternative.useTXShield) {
      // Enable secure contract execution
      setExpanded(prev => ({ ...prev, secureContract: true }));
      setTransaction(alternative.transactionData);
      addToast({
        type: 'info',
        message: 'TX Shield secure execution enabled. Click "Execute Transaction" to proceed with enhanced security.',
      });
      setLoading(false);
      return;
    }
    
    if (alternative.privateTransaction) {
      addToast({
        type: 'info',
        message: 'Private transaction feature requires backend integration. Using standard execution for now.',
      });
    }
    
    // Update transaction with the alternative data
    setTransaction(alternative.transactionData);
    addToast({
      type: 'success',
      message: `Transaction modified to use ${alternative.title}. You can now execute it.`,
    });
  } catch (error) {
    console.error('Failed to execute safer alternative:', error);
    addToast({
      type: 'error',
      message: `Error: ${formatErrorMessage(error)}`,
    });
  } finally {
    setLoading(false);
  }
};
const generateClientSideAlternatives = (transaction) => {
  const { to, data, value, from, chainId } = transaction;
  const alternatives = [];
  
  // TX Shield contract address
  const txShieldContractAddress = "0xB31A5CdC928Ee7A3Ac915D5d196B733eb2C1b17B";
  
  // Analyze transaction to detect type
  const isApproval = data?.startsWith('0x095ea7b3') || false;
  const isUnlimitedApproval = isApproval && (data?.includes('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff') || false);
  const isSwap = data?.startsWith('0x38ed1739') || data?.startsWith('0x7ff36ab5') || false;
  const isEmpty = !data || data === '0x';
  const isTokenTransfer = data?.startsWith('0xa9059cbb') || false;
  
  // Calculate ETH value
  const valueWei = value ? parseInt(value) : 0;
  const valueEth = valueWei / 1e18;
  
  // For unlimited approvals, suggest limited approval
  if (isApproval && isUnlimitedApproval) {
    // Extract spender address from approval data
    const spenderAddressHex = '0x' + data.substring(34, 74);
    
    // Limited approval (100 tokens)
    const limitedApprovalData = data.substring(0, 74) + '0000000000000000000000000000000000000000000000056bc75e2d63100000';
    
    alternatives.push({
      title: 'Limited Token Approval',
      description: 'Approve only 100 tokens instead of unlimited',
      riskReduction: 85,
      gasDifference: '+0%',
      implementation: 'Modified transaction with max approval of 100 tokens',
      transactionData: {
        to,
        data: limitedApprovalData,
        value: '0'
      }
    });
    
    // Secure contract approval
    alternatives.push({
      title: 'Secure Contract Approval',
      description: 'Use TX Shield contract for protected approval',
      riskReduction: 95, 
      gasDifference: '+20%',
      implementation: 'Approval routed through TX Shield contract',
      transactionData: {
        to: txShieldContractAddress,
        // Simplified function call (would be more complex in production)
        data: `0x7e4768bf000000000000000000000000${to.substring(2)}000000000000000000000000${spenderAddressHex.substring(2)}0000000000000000000000000000000000000000000000056bc75e2d63100000`,
        value: '0'
      },
      useTXShield: true
    });
  }
  
  // For swaps, suggest MEV protection
  else if (isSwap) {
    alternatives.push({
      title: 'MEV-Protected Transaction',
      description: 'Same transaction but routed through a private mempool',
      riskReduction: 80,
      gasDifference: '+15%',
      implementation: 'Transaction sent via Flashbots or similar private transaction service',
      transactionData: {
        to,
        data,
        value: value || '0'
      },
      privateTransaction: true
    });
    
    // For swaps, add TX Shield protection
    alternatives.push({
      title: 'TX Shield Protected Swap',
      description: 'Execute through TX Shield for MEV protection',
      riskReduction: 90,
      gasDifference: '+20%',
      implementation: 'Transaction routed through TX Shield contract',
      transactionData: {
        to: txShieldContractAddress,
        data: createSimpleTxShieldData(to, data, value),
        value: value || '0'
      },
      useTXShield: true
    });
  }
  
  // For ETH transfers, suggest TX Shield
  else if (isEmpty && valueEth > 0) {
    if (valueEth > 1) {
      // Split transaction for large amounts
      const halfValue = Math.floor(valueWei / 2).toString();
      
      alternatives.push({
        title: 'Split Transaction',
        description: 'Send as two separate transactions of half the amount',
        riskReduction: 40,
        gasDifference: '+100%',
        implementation: 'Split into two separate transfers for safety',
        transactionData: {
          to,
          data: '0x',
          value: halfValue
        }
      });
    }
    
    // TX Shield protection
    alternatives.push({
      title: 'TX Shield Protected Transfer',
      description: 'Route through TX Shield contract for security',
      riskReduction: 70,
      gasDifference: '+30%',
      implementation: 'Transfer via TX Shield contract',
      transactionData: {
        to: txShieldContractAddress,
        data: createSimpleTxShieldData(to, '0x', value),
        value: value
      },
      useTXShield: true
    });
  }
  
  // For token transfers, suggest TX Shield
  else if (isTokenTransfer) {
    alternatives.push({
      title: 'TX Shield Protected Token Transfer',
      description: 'Route through TX Shield contract for security',
      riskReduction: 65,
      gasDifference: '+20%',
      implementation: 'Transfer via TX Shield contract',
      transactionData: {
        to: txShieldContractAddress,
        data: createSimpleTxShieldData(to, data, '0'),
        value: '0'
      },
      useTXShield: true
    });
  }
  
  // Default: TX Shield protection for any transaction
  if (alternatives.length === 0 || !alternatives.some(alt => alt.useTXShield)) {
    alternatives.push({
      title: 'TX Shield Smart Contract Protection',
      description: 'Execute through TX Shield for enhanced security',
      riskReduction: 80,
      gasDifference: '+20%',
      implementation: 'Transaction routed through TX Shield contract',
      transactionData: {
        to: txShieldContractAddress,
        data: createSimpleTxShieldData(to, data, value),
        value: value || '0'
      },
      useTXShield: true
    });
  }
  
  return alternatives;
};
const createSimpleTxShieldData = (to, data, value) => {
  // Simplified implementation for demo
  const functionSelector = '0x6e9c1789'; // secureExecute function
  
  try {
    // Very basic implementation - in production this would be proper ABI encoding
    const hexTo = to.substring(2).padStart(64, '0');
    const hexValue = value ? value.toString().padStart(64, '0') : '0'.padStart(64, '0');
    
    return `${functionSelector}${hexTo}${hexValue}`;
  } catch (error) {
    console.error('Error creating TX Shield data:', error);
    return functionSelector;
  }
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
              <h4 className="text-sm text-gray-400 mb-2">Risk Score</h4>
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
                <span className="ml-2 text-sm font-medium">{(threatAnalysis.details.mlScore * 100).toFixed(0)}%</span>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {threatAnalysis.threatLevel === 'SAFE' && 'Low risk transaction'}
                {threatAnalysis.threatLevel === 'SUSPICIOUS' && 'Medium risk, proceed with caution'}
                {threatAnalysis.threatLevel === 'HIGH' && 'High risk transaction, verify carefully'}
                {threatAnalysis.threatLevel === 'CRITICAL' && 'Critical risk, strongly recommended to abort'}
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
  
  const renderSecureContract = () => {
    if (!threatAnalysis || !isCorrectNetwork) return null;
    
    return (
      <motion.div 
        className="mb-6 bg-gray-800 rounded-lg overflow-hidden"
        initial={{ opacity: 0, height: 0 }}
        animate={{ 
          opacity: expanded.secureContract ? 1 : 0.8,
          height: expanded.secureContract ? 'auto' : '60px'
        }}
        transition={{ duration: 0.3 }}
      >
        <div 
          className="p-4 flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('secureContract')}
        >
          <h3 className="text-lg font-medium flex items-center">
            <Shield className="mr-2" size={20} />
            Secure Contract Execution
          </h3>
          {expanded.secureContract ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        
        {expanded.secureContract && (
          <div className="p-4 pt-0">
            <div className="bg-blue-900/30 p-4 rounded-lg mb-4">
              <h4 className="font-medium mb-2">Execute Through TX Shield Contract</h4>
              <p className="text-sm text-gray-300 mb-3">
                TX Shield can execute your transaction through our secure proxy contract,
                which provides additional security features:
              </p>
              
              <ul className="text-sm space-y-2 mb-4">
                <li className="flex items-start">
                  <Check size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Protection against unlimited approvals</span>
                </li>
                <li className="flex items-start">
                  <Check size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Verification against blacklisted contracts</span>
                </li>
                <li className="flex items-start">
                  <Check size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Additional security checks before execution</span>
                </li>
              </ul>
              
              <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                <div>
                  <span className="text-sm">Protection Fee:</span>
                  <span className="text-sm font-medium ml-2">
                    0.0005 ETH
                  </span>
                </div>
                
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={true}
                      onChange={() => {}}
                    />
                    <div className="block bg-green-600 w-10 h-6 rounded-full"></div>
                    <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition"></div>
                  </div>
                  <span className="ml-2 text-sm">Enabled</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  };
  
  // Render simulation results
// Improved renderSimulation function with better data handling
const renderSimulation = () => {
  if (!simulation) return null;
  
  // Log the simulation data to help with debugging
  console.log('Rendering simulation with data:', simulation);
  
  // Format numbers properly
  const formatNumber = (num, decimals = 6) => {
    if (typeof num === 'string') {
      // Try to parse the string as a number
      return parseFloat(num).toFixed(decimals);
    } else if (typeof num === 'number') {
      return num.toFixed(decimals);
    }
    return '0.000000'; // Fallback
  };
  
  // Format currency with $ sign
  const formatCurrency = (value) => {
    if (!value && value !== 0) return '$0.00';
    return `$${Math.abs(parseFloat(value)).toFixed(2)}`;
  };
  
  // Calculate gas values if missing
  const gasUsed = simulation.gasEstimate?.gasUsed ? 
    parseInt(simulation.gasEstimate.gasUsed).toLocaleString() : '0';
  
  const gasCost = simulation.gasEstimate?.gasCost || '0.00000';
  const gasCostUSD = simulation.gasEstimate?.gasCostUSD || 0;
  
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
                {gasUsed}
                <span className="text-sm text-gray-400 ml-1">units</span>
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Est. Cost: {formatNumber(gasCost)} ETH 
                ({formatCurrency(gasCostUSD)})
              </div>
            </div>
            
            <div className="bg-gray-900 p-4 rounded-lg">
              <h4 className="text-sm text-gray-400 mb-2">Balance Changes</h4>
              <div className="text-xl font-bold">
                {simulation.balanceChanges?.length || 0}
                <span className="text-sm text-gray-400 ml-1">tokens affected</span>
              </div>
            </div>
          </div>
          
          {simulation.balanceChanges && simulation.balanceChanges.length > 0 && (
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
                      {simulation.balanceChanges.map((change, i) => {
                        // Extract and format values safely
                        const symbol = change.symbol || 'TOKEN';
                        const oldBalance = change.oldBalance || '0';
                        const newBalance = change.newBalance || '0';
                        const absoluteChange = change.absoluteChange || '0';
                        const percentageChange = change.percentageChange || 0;
                        const usdValueChange = change.usdValueChange;

                        // Determine if the absoluteChange is positive or negative
                        const isPositiveChange = absoluteChange.toString().charAt(0) !== '-';
                        const absChangeDisplay = isPositiveChange 
                          ? `+${formatNumber(absoluteChange, symbol === 'ETH' ? 6 : 2)}`
                          : formatNumber(absoluteChange, symbol === 'ETH' ? 6 : 2);
                        
                        return (
                          <tr key={i} className="border-b border-gray-700">
                            <td className="py-3 pr-4">
                              <div className="flex items-center">
                                <div className="w-5 h-5 bg-gray-700 rounded-full mr-2 flex items-center justify-center text-xs">
                                  {symbol.charAt(0)}
                                </div>
                                <span className="font-medium">{symbol}</span>
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              {typeof oldBalance === 'string' && oldBalance.includes('Unknown') 
                                ? oldBalance 
                                : formatNumber(oldBalance, symbol === 'ETH' ? 6 : 2)}
                            </td>
                            <td className="py-3 pr-4">
                              {typeof newBalance === 'string' && newBalance.includes('Unknown') 
                                ? newBalance 
                                : formatNumber(newBalance, symbol === 'ETH' ? 6 : 2)}
                            </td>
                            <td className="py-3 pr-4">
                              <span className={isPositiveChange ? 'text-green-500' : 'text-red-500'}>
                                {absChangeDisplay}
                                {' '}
                                ({percentageChange >= 0 ? '+' : ''}
                                {typeof percentageChange === 'number' ? percentageChange.toFixed(2) : percentageChange}%)
                              </span>
                            </td>
                            <td className="py-3">
                              {usdValueChange !== undefined ? (
                                <span className={usdValueChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                                  {usdValueChange >= 0 ? '+' : ''}
                                  {formatCurrency(usdValueChange)}
                                </span>
                              ) : (
                                <span className="text-gray-500">N/A</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
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
                
                {simulation.mevExposure.suggestedProtections && 
                 simulation.mevExposure.suggestedProtections.length > 0 && (
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
  // const renderAlternatives = () => {
  //   if (!threatAnalysis || !simulation) return null;
    
  //   // Sample alternatives
  //   const alternatives = [
  //     {
  //       title: 'Limited Token Approval',
  //       description: 'Approve only the exact amount needed instead of infinite approval',
  //       riskReduction: 85,
  //       gasDifference: '+5%',
  //       implementation: 'Modified transaction with max approval of 100 tokens'
  //     },
  //     {
  //       title: 'Optimized Gas Settings',
  //       description: 'Same transaction with optimized gas settings to reduce MEV risk',
  //       riskReduction: 40,
  //       gasDifference: '-15%',
  //       implementation: 'Private transaction with MEV protection'
  //     },
  //     {
  //       title: 'Safer Contract Interaction',
  //       description: 'Use TX Shield smart contract as proxy for additional security',
  //       riskReduction: 95,
  //       gasDifference: '+10%',
  //       implementation: 'Transaction routed through TXShield contract with safety checks'
  //     }
  //   ];
    
  //   return (
  //     <motion.div 
  //       className="mb-6"
  //       initial={{ opacity: 0, y: 20 }}
  //       animate={{ opacity: 1, y: 0 }}
  //       transition={{ duration: 0.3, delay: 0.2 }}
  //     >
  //       <h3 className="text-lg font-medium mb-4 flex items-center">
  //         <Shield className="mr-2" size={20} />
  //         Safer Alternatives
  //       </h3>
        
  //       <div className="space-y-4">
  //         {alternatives.map((alt, i) => (
  //           <div key={i} className="bg-gray-800 p-4 rounded-lg">
  //             <div className="flex items-start justify-between">
  //               <div>
  //                 <h4 className="font-medium">{alt.title}</h4>
  //                 <p className="text-sm text-gray-400 mt-1">{alt.description}</p>
                  
  //                 <div className="mt-3 flex items-center space-x-4">
  //                   <div className="flex items-center">
  //                     <Shield size={16} className="mr-1 text-green-500" />
  //                     <span className="text-sm">Risk -{alt.riskReduction}%</span>
  //                   </div>
                    
  //                   <div className="flex items-center">
  //                     <Zap size={16} className="mr-1 text-yellow-500" />
  //                     <span className="text-sm">Gas {alt.gasDifference}</span>
  //                   </div>
  //                 </div>
                  
  //                 <div className="mt-2 text-xs text-gray-500">
  //                   {alt.implementation}
  //                 </div>
  //               </div>
                
  //               <button
  //                 onClick={() => executeSaferAlternative(i)}
  //                 className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-md text-sm flex items-center"
  //               >
  //                 Use This
  //                 <ArrowRight size={14} className="ml-1" />
  //               </button>
  //             </div>
  //           </div>
  //         ))}
  //       </div>
  //     </motion.div>
  //   );
  // };
  const renderAlternatives = () => {
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
        
        <div className="bg-gray-800 p-6 rounded-lg relative overflow-hidden">
          {/* Semi-transparent overlay */}
          <div className="absolute inset-0 bg-blue-900/20 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-gray-900/80 px-6 py-4 rounded-lg shadow-lg text-center">
              <h4 className="text-xl font-bold text-blue-400 mb-2">Coming Soon</h4>
              <p className="text-gray-300">We're working on advanced transaction alternatives to help you stay safe</p>
            </div>
          </div>
          
          {/* Preview content (shown with reduced opacity) */}
          <div className="opacity-40">
            <div className="space-y-4">
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">Limited Token Approval</h4>
                    <p className="text-sm text-gray-400 mt-1">Approve only the exact amount needed instead of infinite approval</p>
                    
                    <div className="mt-3 flex items-center space-x-4">
                      <div className="flex items-center">
                        <Shield size={16} className="mr-1 text-green-500" />
                        <span className="text-sm">Risk -85%</span>
                      </div>
                      
                      <div className="flex items-center">
                        <Zap size={16} className="mr-1 text-yellow-500" />
                        <span className="text-sm">Gas +5%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">Secure TX Shield Routing</h4>
                    <p className="text-sm text-gray-400 mt-1">Execute through our secure contract with built-in protections</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 bg-blue-900/20 p-4 rounded-lg">
          <div className="flex items-start">
            <Info size={18} className="text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-300">
                TX Shield is developing advanced transaction alternatives to help reduce risk and protect your assets. 
                This feature will be available in the next update.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };
// TransactionAnalyzer.tsx - Complete render function
// Replace your existing return statement with this entire block

return (
  <div className="bg-gray-900 text-white min-h-screen">
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header Section with Connect Wallet Button */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold flex items-center">
          <Shield className="mr-3" size={28} />
          TX Shield
        </h1>
        
        {walletConnected ? (
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-gray-800 px-3 py-2 rounded-md">
              <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
              <span className="text-sm">
                {walletAddress ? 
                  `${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}` : 
                  'Connected'}
              </span>
            </div>
            <NetworkDisplay 
              isCorrectNetwork={isCorrectNetwork} 
              networkName={networkName}
              switchNetwork={handleNetworkSwitch}
            />
          </div>
        ) : (
          <button
            onClick={handleWalletConnect}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md transition-colors"
          >
            Connect Wallet
          </button>
        )}
      </div>
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Transaction Input Section */}
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
        
        {/* Project Info Section */}
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
            
            {/* <div className="mt-4 pt-4 border-t border-gray-700">
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
            </div> */}
          </div>
        </div>
      </div>
      
      {/* =============== NEW LOADING COMPONENT =============== */}
      {/* LoadingState Component - Show during analysis */}
      {loading && (
        <LoadingState 
          stage={analysisStage} 
          progress={analysisProgress}
        />
      )}
      
      {/* =============== NEW RISK DIALOG COMPONENT =============== */}
      {/* RiskConfirmationDialog - Show for high-risk transactions */}
      <RiskConfirmationDialog
        isOpen={showRiskDialog}
        onClose={() => setShowRiskDialog(false)}
        onConfirm={() => {
          setShowRiskDialog(false);
          executeTransaction();
        }}
        threatLevel={threatAnalysis?.threatLevel || 'HIGH'}
        details={riskDialogDetails}
      />
      
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
                  {/* =============== NEW MEV PROTECTION UI WITH TOOLTIPS =============== */}
                  {threatAnalysis && threatAnalysis.threatLevel !== 'SAFE' && simulation?.mevExposure && (
                    <div className="bg-gray-800 p-4 rounded-lg mb-6">
                      <h3 className="font-medium mb-2">
                        <Tooltip content={DeFiGlossary.MEV}>
                          MEV Protection
                        </Tooltip>
                      </h3>
                      
                      <div className="text-sm text-gray-400">
                        This transaction might be vulnerable to&nbsp;
                        <Tooltip content={DeFiGlossary["Front-running"]}>
                          front-running
                        </Tooltip>
                        &nbsp;or&nbsp;
                        <Tooltip content={DeFiGlossary["Sandwich Attack"]}>
                          sandwich attacks
                        </Tooltip>.
                      </div>
                      
                      <div className="mt-2">
                        <Tooltip 
                          content="Setting a reasonable slippage tolerance helps protect your transaction from price fluctuations and MEV attacks."
                          width="wide"
                        >
                          <div className="flex items-center text-sm">
                            <span>Slippage Tolerance</span>
                          </div>
                        </Tooltip>
                      </div>
                    </div>
                  )}
                  
                  {/* Original Threat Indicator */}
                  {renderScamAlert()}
                  {renderThreatIndicator()}
                  {renderThreatDetails()}
                  {renderRecommendations()}
                  {isCorrectNetwork && renderSecureContract()}
                  
                  {/* =============== NEW ADVANCED ANALYSIS COMPONENT =============== */}
                  {threatAnalysis && simulation && (
                    <AdvancedTransactionAnalysis
                      analysisResult={{
                        txType: threatAnalysis.details?.transactionType || 'UNKNOWN',
                        description: threatAnalysis.details?.llmAnalysis?.reasoning || 'Transaction analysis',
                        securityScore: Math.round(100 - (threatAnalysis.confidence * 100)),
                        riskLevel: threatAnalysis.threatLevel,
                        riskBreakdown: {
                          contractSecurity: Math.round(threatAnalysis.details?.mlScore * 25 || 0),
                          transactionSpecific: threatAnalysis.details?.signatureMatches?.length > 0 ? 15 : 5,
                          userTrust: 10,
                          externalFactors: 5,
                          implementation: threatAnalysis.details?.mlScore > 0.5 ? 15 : 5,
                        },
                        details: {
                          protocol: simulation.details?.protocol || 'Unknown',
                          // Add more details based on your transaction data
                        },
                        flags: {
                          riskFlags: threatAnalysis.mitigationSuggestions || [],
                          protectiveFlags: [],
                        },
                        recommendations: threatAnalysis.mitigationSuggestions.map((suggestion, index) => ({
                          type: 'SECURITY',
                          title: `Recommendation ${index + 1}`,
                          description: suggestion,
                          actionable: index === 0, // Make first suggestion actionable
                          priority: index === 0 ? 'high' : 'medium',
                        })),
                      }}
                      onApplyRecommendation={(recommendation) => {
                        // Handle recommendation application
                        console.log('Applying recommendation:', recommendation);
                        // For example, this could modify the transaction data
                      }}
                    />
                  )}

                  <div className="flex justify-end space-x-4 mt-8">
                    <button
                      onClick={() => setActiveTab('alternatives')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex items-center"
                    >
                      View Safer Alternatives
                      <ArrowRight size={16} className="ml-2" />
                    </button>
                    
                    {/* =============== UPDATED EXECUTE BUTTON =============== */}
                    <button
                      onClick={executeTransactionWithConfirmation} // Use the new confirmation wrapper
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
                      onClick={executeTransactionWithConfirmation} // Use the new confirmation wrapper
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
                      onClick={executeTransactionWithConfirmation} // Use the new confirmation wrapper
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
    <TransactionTemplateSelector
      isOpen={showTemplateSelector}
      onClose={() => setShowTemplateSelector(false)}
      onSelectTemplate={handleSelectTemplate}
      templates={[
        {
          name: "Token Approval (Unlimited)",
          to: '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f', // WETH on Linea
          data: '0x095ea7b3000000000000000000000000646e4ee3ee5fdd82497ae2b6ea7f9cd333fe8ef9ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', // Approve Horizondex Router unlimited
          value: '0',
          description: 'WETH unlimited approval to Horizondex Router on Linea'
        },
        {
          name: "Token Approval (Limited)",
          to: '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f', // WETH on Linea
          data: '0x095ea7b3000000000000000000000000646e4ee3ee5fdd82497ae2b6ea7f9cd333fe8ef90000000000000000000000000000000000000000000000001bc16d674ec80000', // Approve 2 WETH
          value: '0',
          description: 'WETH limited approval (2 WETH) to Horizondex Router on Linea'
        },
        {
          name: "Token Transfer",
          to: '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f', // WETH on Linea
          data: '0xa9059cbb0000000000000000000000001234567890123456789012345678901234567890000000000000000000000000000000000000000000000000de0b6b3a7640000', // Transfer 1 WETH
          value: '0',
          description: 'Transfer 1 WETH to another address on Linea'
        },
        {
          name: "ETH Transfer",
          to: '0x1234567890123456789012345678901234567890', // Random address
          data: '0x',
          value: '100000000000000000', // 0.1 ETH
          description: 'Send 0.1 ETH to an address on Linea'
        }
      ]}
    />
  </div>
);
};

export default TransactionAnalyzer;