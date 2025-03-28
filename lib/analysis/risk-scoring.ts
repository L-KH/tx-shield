// lib/analysis/risk-scoring.ts
import { ethers } from 'ethers';
import { 
  analyzeTransactionType, 
  TransactionType, 
  SecurityRiskLevel,
  TransactionComplexity
} from './transaction-type-detector';

// Contract verification status
enum ContractVerificationStatus {
  Verified = 'VERIFIED',
  Unverified = 'UNVERIFIED',
  PartiallyVerified = 'PARTIALLY_VERIFIED',
  Unknown = 'UNKNOWN'
}

// Contract age category
enum ContractAge {
    New = 'NEW', // < 30 days
    Recent = 'RECENT', // 1-6 months
    Established = 'ESTABLISHED', // 6-12 months
    Mature = 'MATURE', // > 1 year
    Unknown = 'UNKNOWN' // Add this line to fix the error
  }

// Transaction risk factors
interface RiskFactors {
  // Contract factors
  contractVerified: ContractVerificationStatus;
  contractAge: ContractAge;
  contractAuditStatus: boolean;
  isKnownScammer: boolean;
  similarToScam: number; // 0-1 similarity score
  
  // Transaction factors
  unlimitedApproval: boolean;
  highValue: boolean; // Relative to user's balance
  complexMethod: boolean;
  interactsWithBlacklisted: boolean;
  
  // User-based factors
  unusualForUser: boolean;
  interactedBefore: boolean;
  whitelistedByUser: boolean;
  
  // External factors
  recentlyDeployed: boolean;
  copycat: boolean;
  hasSecurityIncidents: boolean;
  
  // MEV and Slippage Factors
  highSlippage: boolean;
  vulnerableToMEV: boolean;
  
  // Additional Factors
  reentrancyRisk: boolean;
  decentralizationScore: number; // 0-1 where 1 is fully decentralized
  hasAdminFunctions: boolean;
}

// Default risk factors when data is unavailable
const defaultRiskFactors: RiskFactors = {
  contractVerified: ContractVerificationStatus.Unknown,
  contractAge: ContractAge.Unknown,
  contractAuditStatus: false,
  isKnownScammer: false,
  similarToScam: 0,
  
  unlimitedApproval: false,
  highValue: false,
  complexMethod: false,
  interactsWithBlacklisted: false,
  
  unusualForUser: false,
  interactedBefore: false,
  whitelistedByUser: false,
  
  recentlyDeployed: false,
  copycat: false,
  hasSecurityIncidents: false,
  
  highSlippage: false,
  vulnerableToMEV: false,
  
  reentrancyRisk: false,
  decentralizationScore: 0.5,
  hasAdminFunctions: false
};

// Risk score calculation result
interface RiskScoreResult {
  score: number; // 0-100 where higher is riskier
  level: SecurityRiskLevel;
  breakdown: {
    categoryScores: {
      contractSecurity: number;
      transactionSpecific: number;
      userTrust: number;
      externalFactors: number;
      implementation: number;
    };
    riskFlags: string[];
    protectiveFlags: string[];
    suggestedMitigations: string[];
  };
  confidence: number; // 0-1 indicating confidence in the assessment
}

/**
 * Calculates a comprehensive risk score for a transaction
 */
export async function calculateRiskScore(
  transaction: {
    to: string;
    data: string;
    value: string;
    from: string;
    chainId?: number;
  },
  riskFactors: Partial<RiskFactors> = {},
  provider?: ethers.providers.Provider
): Promise<RiskScoreResult> {
  // Merge provided risk factors with defaults
  const factors: RiskFactors = { ...defaultRiskFactors, ...riskFactors };
  
  // Get transaction type
  const txAnalysis = analyzeTransactionType(transaction);
  
  // Determine if the transaction method is complex
  factors.complexMethod = txAnalysis.complexity === TransactionComplexity.Complex;
  
  // Determine if approval is unlimited
  factors.unlimitedApproval = txAnalysis.type === TransactionType.UnlimitedApproval;
  
  // Check if high value transaction
  if (transaction.value) {
    const valueEth = parseFloat(ethers.utils.formatEther(transaction.value));
    factors.highValue = valueEth > 1; // Consider transactions > 1 ETH as high value
  }
  
  // Setup risk flags and protective flags
  const riskFlags: string[] = [];
  const protectiveFlags: string[] = [];
  const suggestedMitigations: string[] = [];
  
  // Contract Security Score (0-25)
  let contractSecurityScore = 0;
  
  if (factors.contractVerified === ContractVerificationStatus.Verified) {
    contractSecurityScore += 10;
    protectiveFlags.push('Contract is verified on block explorer');
  } else if (factors.contractVerified === ContractVerificationStatus.Unverified) {
    contractSecurityScore += 25;
    riskFlags.push('Contract is not verified on block explorer');
    suggestedMitigations.push('Only interact with verified contracts');
  }
  
  if (factors.contractAuditStatus) {
    contractSecurityScore -= 10;
    protectiveFlags.push('Contract has been audited');
  } else {
    contractSecurityScore += 5;
    riskFlags.push('No known security audits for this contract');
    suggestedMitigations.push('Prefer interacting with audited contracts');
  }
  
  if (factors.isKnownScammer) {
    contractSecurityScore += 25;
    riskFlags.push('Address is flagged as a known scammer');
    suggestedMitigations.push('ALERT: Avoid this transaction entirely');
  }
  
  if (factors.similarToScam > 0.7) {
    contractSecurityScore += 15;
    riskFlags.push('Contract behavior is similar to known scams');
    suggestedMitigations.push('Proceed with extreme caution or avoid this transaction');
  }
  
  // Contract age affects security score
  switch (factors.contractAge) {
    case ContractAge.New:
      contractSecurityScore += 10;
      riskFlags.push('Contract was deployed very recently');
      suggestedMitigations.push('Be extra cautious with newly deployed contracts');
      break;
    case ContractAge.Recent:
      contractSecurityScore += 5;
      break;
    case ContractAge.Established:
      contractSecurityScore -= 5;
      protectiveFlags.push('Contract has been established for 6-12 months');
      break;
    case ContractAge.Mature:
      contractSecurityScore -= 10;
      protectiveFlags.push('Contract has been established for over a year');
      break;
  }
  
  // Normalize contract security score to 0-25 range
  contractSecurityScore = Math.max(0, Math.min(25, contractSecurityScore));
  
  // Transaction Specific Score (0-35)
  let transactionSpecificScore = 0;
  
  if (factors.unlimitedApproval) {
    transactionSpecificScore += 20;
    riskFlags.push('Transaction includes unlimited token approval');
    suggestedMitigations.push('Use limited approval amount instead of unlimited approval');
  }
  
  if (factors.highValue) {
    transactionSpecificScore += 10;
    riskFlags.push('High value transaction');
    suggestedMitigations.push('Consider splitting into smaller transactions for safety');
  }
  
  if (factors.complexMethod) {
    transactionSpecificScore += 5;
    riskFlags.push('Complex transaction method');
    suggestedMitigations.push('Review all aspects of this transaction carefully');
  }
  
  if (factors.interactsWithBlacklisted) {
    transactionSpecificScore += 25;
    riskFlags.push('Transaction interacts with blacklisted address');
    suggestedMitigations.push('ALERT: Transaction interacts with known dangerous address');
  }
  
  if (factors.highSlippage) {
    transactionSpecificScore += 10;
    riskFlags.push('High slippage in swap transaction');
    suggestedMitigations.push('Set a lower slippage tolerance (e.g., 1-2%)');
  }
  
  if (factors.vulnerableToMEV) {
    transactionSpecificScore += 15;
    riskFlags.push('Transaction is vulnerable to MEV extraction');
    suggestedMitigations.push('Use an MEV-protected transaction or private transaction service');
  }
  
  // Normalize transaction specific score to 0-35 range
  transactionSpecificScore = Math.max(0, Math.min(35, transactionSpecificScore));
  
  // User Trust Score (0-15)
  let userTrustScore = 15; // Start at max and subtract
  
  if (factors.unusualForUser) {
    userTrustScore -= 5;
    riskFlags.push('Transaction pattern is unusual for this user');
  }
  
  if (factors.interactedBefore) {
    userTrustScore -= 10;
    protectiveFlags.push('User has safely interacted with this contract before');
  }
  
  if (factors.whitelistedByUser) {
    userTrustScore -= 15;
    protectiveFlags.push('Address is whitelisted by user');
  }
  
  // Normalize user trust score to 0-15 range
  userTrustScore = Math.max(0, Math.min(15, userTrustScore));
  
  // External Factors Score (0-15)
  let externalFactorsScore = 0;
  
  if (factors.recentlyDeployed) {
    externalFactorsScore += 5;
    riskFlags.push('Contract was deployed very recently');
  }
  
  if (factors.copycat) {
    externalFactorsScore += 10;
    riskFlags.push('Contract appears to be imitating a known legitimate project');
    suggestedMitigations.push('Verify you are interacting with the correct contract address');
  }
  
  if (factors.hasSecurityIncidents) {
    externalFactorsScore += 10;
    riskFlags.push('Protocol has had security incidents in the past');
    suggestedMitigations.push('Research recent security updates before proceeding');
  }
  
  // Normalize external factors score to 0-15 range
  externalFactorsScore = Math.max(0, Math.min(15, externalFactorsScore));
  
  // Implementation Risks Score (0-10)
  let implementationScore = 0;
  
  if (factors.reentrancyRisk) {
    implementationScore += 7;
    riskFlags.push('Contract may be vulnerable to reentrancy attacks');
  }
  
  if (factors.decentralizationScore < 0.3) {
    implementationScore += 5;
    riskFlags.push('Contract has high centralization risk');
    suggestedMitigations.push('Be aware this protocol is highly centralized');
  }
  
  if (factors.hasAdminFunctions) {
    implementationScore += 3;
    riskFlags.push('Contract has privileged admin functions');
  }
  
  // Normalize implementation score to 0-10 range
  implementationScore = Math.max(0, Math.min(10, implementationScore));
  
  // Calculate total risk score (0-100)
  const totalScore = 
    contractSecurityScore + 
    transactionSpecificScore + 
    userTrustScore + 
    externalFactorsScore + 
    implementationScore;
  
  // Determine risk level based on total score
  let riskLevel: SecurityRiskLevel;
  if (totalScore >= 75) {
    riskLevel = SecurityRiskLevel.Critical;
  } else if (totalScore >= 50) {
    riskLevel = SecurityRiskLevel.High;
  } else if (totalScore >= 25) {
    riskLevel = SecurityRiskLevel.Medium;
  } else {
    riskLevel = SecurityRiskLevel.Low;
  }
  
  // Calculate confidence level (0-1)
  // Higher confidence when more data is available
  const factorCount = Object.keys(riskFactors).length;
  const maxFactors = Object.keys(defaultRiskFactors).length;
  const confidence = Math.min(0.5 + (factorCount / maxFactors) * 0.5, 1);
  
  // If critical flags exist, ensure minimum risk level is HIGH regardless of score
  if (
    factors.isKnownScammer || 
    factors.interactsWithBlacklisted || 
    factors.similarToScam > 0.8
  ) {
    riskLevel = riskLevel < SecurityRiskLevel.High ? SecurityRiskLevel.High : riskLevel;
  }
  
  // Build final result
  return {
    score: totalScore,
    level: riskLevel,
    breakdown: {
      categoryScores: {
        contractSecurity: contractSecurityScore,
        transactionSpecific: transactionSpecificScore,
        userTrust: userTrustScore,
        externalFactors: externalFactorsScore,
        implementation: implementationScore
      },
      riskFlags,
      protectiveFlags,
      suggestedMitigations
    },
    confidence
  };
}

// Helper to collect risk factors for a transaction
export async function collectRiskFactors(
  transaction: {
    to: string;
    data: string;
    value: string;
    from: string;
    chainId?: number;
  },
  provider: ethers.providers.Provider
): Promise<Partial<RiskFactors>> {
  const factors: Partial<RiskFactors> = {};
  
  // This would be replaced with actual API calls and blockchain queries
  // For now, we'll simulate some basic checks
  
  try {
    // Check if contract is verified
    // In production, this would call the Etherscan API
    factors.contractVerified = Math.random() > 0.3 
      ? ContractVerificationStatus.Verified 
      : ContractVerificationStatus.Unverified;
    
    // Check contract age
    // In production, this would query the blockchain for contract creation block
    const randomAge = Math.random();
    if (randomAge < 0.1) {
      factors.contractAge = ContractAge.New;
      factors.recentlyDeployed = true;
    } else if (randomAge < 0.3) {
      factors.contractAge = ContractAge.Recent;
    } else if (randomAge < 0.6) {
      factors.contractAge = ContractAge.Established;
    } else {
      factors.contractAge = ContractAge.Mature;
    }
    
    // Check for unlimited approval
    const txAnalysis = analyzeTransactionType(transaction);
    factors.unlimitedApproval = txAnalysis.type === TransactionType.UnlimitedApproval;
    
    // Check for high value transaction
    if (transaction.value) {
      const valueEth = parseFloat(ethers.utils.formatEther(transaction.value));
      factors.highValue = valueEth > 1;
    }
    
    // Determine if this is a complex method
    factors.complexMethod = txAnalysis.complexity === TransactionComplexity.Complex;
    
    // For swap transactions, check for MEV vulnerability and slippage
    if (
      txAnalysis.type === TransactionType.Swap ||
      txAnalysis.type === TransactionType.SwapETHForTokens ||
      txAnalysis.type === TransactionType.SwapTokensForETH ||
      txAnalysis.type === TransactionType.SwapTokensForTokens
    ) {
      factors.vulnerableToMEV = true;
      
      // High slippage check would parse the transaction data more carefully
      // For now, we'll use a probability
      factors.highSlippage = Math.random() > 0.7;
    }
    
    return factors;
  } catch (error) {
    console.error('Error collecting risk factors:', error);
    return {};
  }
}

// Export functions
export default { calculateRiskScore, collectRiskFactors };