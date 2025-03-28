// lib/analysis/transaction-recommendations.ts
import { ethers } from 'ethers';
import { 
  analyzeTransactionType, 
  TransactionType,
  SecurityRiskLevel
} from './transaction-type-detector';
import { calculateRiskScore, collectRiskFactors } from './risk-scoring';

// Define recommendation categories
export enum RecommendationType {
  Security = 'SECURITY',
  Privacy = 'PRIVACY',
  GasOptimization = 'GAS_OPTIMIZATION',
  AlternativeOption = 'ALTERNATIVE_OPTION',
  BestPractice = 'BEST_PRACTICE'
}

// Define recommendation interface
export interface Recommendation {
  type: RecommendationType;
  title: string;
  description: string;
  actionable: boolean;
  action?: {
    type: 'REPLACE_TX' | 'MODIFY_PARAM' | 'USE_DIFFERENT_CONTRACT' | 'EXTERNAL_TOOL';
    description: string;
    data?: any; // For replacement transaction data
  };
  priority: 'critical' | 'high' | 'medium' | 'low';
  appliesTo: TransactionType[]; // Which transaction types this applies to
}

// Catalog of recommendations
const recommendationCatalog: Recommendation[] = [
  // Token Approval Recommendations
  {
    type: RecommendationType.Security,
    title: 'Limit Token Approval Amount',
    description: 'Instead of granting unlimited approval, specify an exact amount needed for this transaction.',
    actionable: true,
    action: {
      type: 'REPLACE_TX',
      description: 'Replace with limited approval',
    },
    priority: 'critical',
    appliesTo: [TransactionType.UnlimitedApproval]
  },
  {
    type: RecommendationType.Security,
    title: 'Set Token Approval Deadline',
    description: 'Add an expiration time to your approval to automatically revoke access after a certain period.',
    actionable: true,
    action: {
      type: 'REPLACE_TX',
      description: 'Add approval deadline',
    },
    priority: 'high',
    appliesTo: [TransactionType.Approval, TransactionType.UnlimitedApproval]
  },
  {
    type: RecommendationType.BestPractice,
    title: 'Revoke Unused Approvals',
    description: 'You have previous approvals for this token. Consider revoking unused approvals to improve security.',
    actionable: true,
    action: {
      type: 'EXTERNAL_TOOL',
      description: 'Use Revoke.cash',
    },
    priority: 'medium',
    appliesTo: [TransactionType.Approval, TransactionType.UnlimitedApproval]
  },
  
  // Swap Recommendations
  {
    type: RecommendationType.Security,
    title: 'Set Maximum Slippage',
    description: 'Limit potential price impact by setting a maximum slippage tolerance (e.g., 1%).',
    actionable: true,
    action: {
      type: 'MODIFY_PARAM',
      description: 'Set slippage to 1%',
    },
    priority: 'high',
    appliesTo: [
      TransactionType.Swap,
      TransactionType.SwapETHForTokens,
      TransactionType.SwapTokensForETH,
      TransactionType.SwapTokensForTokens
    ]
  },
  {
    type: RecommendationType.Security,
    title: 'Set Minimum Output Amount',
    description: 'Specify a minimum amount of tokens to receive to protect against front-running.',
    actionable: true,
    action: {
      type: 'MODIFY_PARAM',
      description: 'Set minimum output',
    },
    priority: 'high',
    appliesTo: [
      TransactionType.Swap,
      TransactionType.SwapETHForTokens,
      TransactionType.SwapTokensForETH,
      TransactionType.SwapTokensForTokens
    ]
  },
  {
    type: RecommendationType.Privacy,
    title: 'Use Private Transaction',
    description: 'Send your swap through a private transaction service to prevent front-running.',
    actionable: true,
    action: {
      type: 'USE_DIFFERENT_CONTRACT',
      description: 'Use TX Shield private transaction',
    },
    priority: 'medium',
    appliesTo: [
      TransactionType.Swap,
      TransactionType.SwapETHForTokens,
      TransactionType.SwapTokensForETH,
      TransactionType.SwapTokensForTokens
    ]
  },
  {
    type: RecommendationType.GasOptimization,
    title: 'Optimize Gas Price',
    description: 'Current gas price is higher than necessary. You can save by waiting or using a lower gas price.',
    actionable: true,
    action: {
      type: 'MODIFY_PARAM',
      description: 'Use optimal gas price',
    },
    priority: 'low',
    appliesTo: [
      TransactionType.Swap,
      TransactionType.Transfer,
      TransactionType.Approval,
      TransactionType.UnlimitedApproval
    ]
  },
  
  // Transfer Recommendations
  {
    type: RecommendationType.Security,
    title: 'Verify Recipient Address',
    description: 'Double-check the recipient address before sending to avoid irreversible errors.',
    actionable: false,
    priority: 'high',
    appliesTo: [TransactionType.Transfer]
  },
  {
    type: RecommendationType.BestPractice,
    title: 'Send Test Transaction First',
    description: 'For large transfers, consider sending a small amount first to verify the recipient.',
    actionable: true,
    action: {
      type: 'REPLACE_TX',
      description: 'Create test transaction',
    },
    priority: 'medium',
    appliesTo: [TransactionType.Transfer]
  },
  
  // NFT Recommendations
  {
    type: RecommendationType.Security,
    title: 'Limit NFT Approvals',
    description: 'Be cautious when approving an operator for all your NFTs. Consider using individual approvals instead.',
    actionable: false,
    priority: 'high',
    appliesTo: [TransactionType.NFTApproval]
  },
  
  // Liquidity Recommendations
  {
    type: RecommendationType.Security,
    title: 'Understand Impermanent Loss',
    description: 'Adding liquidity exposes you to impermanent loss. Make sure you understand the risks.',
    actionable: false,
    priority: 'medium',
    appliesTo: [TransactionType.AddLiquidity]
  },
  
  // Generic Recommendations
  {
    type: RecommendationType.Security,
    title: 'Use TX Shield Secure Execution',
    description: 'Execute through TX Shield\'s secure contract for additional protection against scams and exploits.',
    actionable: true,
    action: {
      type: 'USE_DIFFERENT_CONTRACT',
      description: 'Execute through TX Shield',
    },
    priority: 'medium',
    appliesTo: [
      TransactionType.Approval,
      TransactionType.UnlimitedApproval,
      TransactionType.Swap,
      TransactionType.SwapETHForTokens,
      TransactionType.SwapTokensForETH,
      TransactionType.SwapTokensForTokens
    ]
  },
];

/**
 * Generate recommendations for a transaction based on its type and risk analysis
 */
export async function getRecommendations(
  transaction: {
    to: string;
    data: string;
    value: string;
    from: string;
    chainId?: number;
  },
  provider?: ethers.providers.Provider
): Promise<Recommendation[]> {
  // Analyze the transaction type
  const txAnalysis = analyzeTransactionType(transaction);
  
  // Collect risk factors if provider is available
  let riskFactors = {};
  let riskScore = null;
  
  if (provider) {
    riskFactors = await collectRiskFactors(transaction, provider);
    riskScore = await calculateRiskScore(transaction, riskFactors, provider);
  }
  
  // Filter recommendations that apply to this transaction type
  let applicableRecommendations = recommendationCatalog.filter(rec => 
    rec.appliesTo.includes(txAnalysis.type)
  );
  
  // Add security level specific recommendations
  if (riskScore && riskScore.level >= SecurityRiskLevel.High) {
    applicableRecommendations.push({
      type: RecommendationType.Security,
      title: 'High Risk Transaction Alert',
      description: `This transaction has been identified as ${riskScore.level.toLowerCase()} risk. Review carefully before proceeding.`,
      actionable: false,
      priority: 'critical',
      appliesTo: [txAnalysis.type]
    });
    
    // Add risk-specific recommendations
    if (riskScore.breakdown.riskFlags.length > 0) {
      for (const flag of riskScore.breakdown.riskFlags) {
        if (flag.includes('unlimited approval')) {
          // Already covered by unlimited approval recommendation
          continue;
        }
        
        // Add custom recommendation based on risk flag
        applicableRecommendations.push({
          type: RecommendationType.Security,
          title: `Risk: ${flag}`,
          description: 'This specific risk was detected in your transaction.',
          actionable: false,
          priority: 'high',
          appliesTo: [txAnalysis.type]
        });
      }
    }
    
    // Add suggested mitigations as recommendations
    if (riskScore.breakdown.suggestedMitigations.length > 0) {
      for (const mitigation of riskScore.breakdown.suggestedMitigations) {
        // Check if similar recommendation already exists
        const exists = applicableRecommendations.some(rec => 
          rec.description.toLowerCase().includes(mitigation.toLowerCase()) ||
          rec.title.toLowerCase().includes(mitigation.toLowerCase())
        );
        
        if (!exists) {
          applicableRecommendations.push({
            type: RecommendationType.Security,
            title: `Recommendation: ${mitigation}`,
            description: mitigation,
            actionable: false,
            priority: 'high',
            appliesTo: [txAnalysis.type]
          });
        }
      }
    }
  }
  
  // Add transaction-specific enhancements
  switch (txAnalysis.type) {
    case TransactionType.UnlimitedApproval:
      // For unlimited approvals, ensure limited approval is the first recommendation
      const limitApprovalRec = applicableRecommendations.find(rec => 
        rec.title === 'Limit Token Approval Amount'
      );
      
      if (limitApprovalRec) {
        // Create concrete transaction replacement data
        try {
          const decodedData = ethers.utils.defaultAbiCoder.decode(
            ['address', 'uint256'],
            '0x' + transaction.data.slice(10)
          );
          
          const spenderAddress = decodedData[0];
          
          // Create a limited approval amount (e.g., 10 tokens with 18 decimals)
          const limitedAmount = ethers.utils.parseUnits('10', 18);
          
          // Re-encode the approval with limited amount
          const approveInterface = new ethers.utils.Interface([
            'function approve(address spender, uint256 amount) external returns (bool)'
          ]);
          
          const saferData = approveInterface.encodeFunctionData('approve', [
            spenderAddress, limitedAmount
          ]);
          
          // Update the recommendation with concrete replacement data
          limitApprovalRec.action.data = {
            ...transaction,
            data: saferData
          };
        } catch (error) {
          console.error('Error creating limited approval:', error);
        }
      }
      break;
      
    case TransactionType.SwapETHForTokens:
    case TransactionType.SwapTokensForETH:
    case TransactionType.SwapTokensForTokens:
    case TransactionType.Swap:
      // For swaps, add specific slippage recommendations
      const slippageRec = applicableRecommendations.find(rec => 
        rec.title === 'Set Maximum Slippage'
      );
      
      if (slippageRec) {
        // In a real implementation, this would decode the specific DEX function
        // and modify its parameters to include appropriate slippage
        // For now, we'll just add a placeholder
        slippageRec.action.data = {
          slippagePercentage: 1,
          description: 'Set maximum slippage to 1%'
        };
      }
      break;
  }
  
  // Sort recommendations by priority
  return applicableRecommendations.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

export default { getRecommendations };