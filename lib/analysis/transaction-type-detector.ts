
import { ethers } from 'ethers';


const FUNCTION_SIGNATURES = {
  
  transfer: '0xa9059cbb', 
  transferFrom: '0x23b872dd', 
  approve: '0x095ea7b3', 
  
  
  swapExactTokensForTokens: '0x38ed1739', 
  swapTokensForExactTokens: '0x8803dbee', 
  swapExactETHForTokens: '0x7ff36ab5', 
  swapTokensForExactETH: '0x4a25d94a', 
  swapExactTokensForETH: '0x18cbafe5', 
  swapETHForExactTokens: '0xfb3bdb41', 
  
  
  exactInputSingle: '0x414bf389', 
  exactOutputSingle: '0xdb3e2198', 
  exactInput: '0xc04b8d59', 
  exactOutput: '0xf28c0498', 
  
  
  safeTransferFrom: '0x42842e0e', 
  safeTransferFromWithData: '0xb88d4fde', 
  setApprovalForAll: '0xa22cb465', 
  
  
  addLiquidity: '0xe8e33700', 
  addLiquidityETH: '0xf305d719', 
  removeLiquidity: '0xbaa2abde', 
  removeLiquidityETH: '0x02751cec', 
  
  
  deposit: '0xb6b55f25', 
  withdraw: '0x2e1a7d4d', 
  borrow: '0xc5ebeaec', 
  repay: '0x4e4d9fea', 
};

export enum TransactionType {
  Unknown = 'UNKNOWN',
  Transfer = 'TRANSFER',
  Approval = 'APPROVAL',
  UnlimitedApproval = 'UNLIMITED_APPROVAL',
  Swap = 'SWAP',
  SwapETHForTokens = 'SWAP_ETH_FOR_TOKENS',
  SwapTokensForETH = 'SWAP_TOKENS_FOR_ETH',
  SwapTokensForTokens = 'SWAP_TOKENS_FOR_TOKENS',
  NFTTransfer = 'NFT_TRANSFER',
  NFTApproval = 'NFT_APPROVAL',
  AddLiquidity = 'ADD_LIQUIDITY',
  RemoveLiquidity = 'REMOVE_LIQUIDITY',
  Lending = 'LENDING',
  Borrowing = 'BORROWING',
  MultiAction = 'MULTI_ACTION',
  ContractDeployment = 'CONTRACT_DEPLOYMENT',
}

export enum TransactionComplexity {
  Simple = 'SIMPLE',
  Medium = 'MEDIUM',
  Complex = 'COMPLEX',
}

export enum SecurityRiskLevel {
  Low = 'LOW',
  Medium = 'MEDIUM',
  High = 'HIGH',
  Critical = 'CRITICAL',
}

interface TransactionAnalysis {
    type: TransactionType;
    complexity: TransactionComplexity;
    baseRiskLevel: SecurityRiskLevel;
    description: string;
    details: {
      tokenAddress?: string;
      spenderAddress?: string;
      isUnlimited?: boolean;
      amount?: string;
      protocol?: string;
      humanReadableFunctionName?: string;
      knownContract?: boolean;
      hasCallback?: boolean;
      multiActions?: string[];
      involvedTokens?: string[];
      ethValue?: string;
      dataSize?: number; 
    };
  }

export function analyzeTransactionType(transaction: {
  to: string;
  data: string;
  value: string;
  from: string;
}): TransactionAnalysis {
  
  let analysis: TransactionAnalysis = {
    type: TransactionType.Unknown,
    complexity: TransactionComplexity.Simple,
    baseRiskLevel: SecurityRiskLevel.Low,
    description: 'Unknown transaction type',
    details: {},
  };
  
  
  if ((!transaction.data || transaction.data === '0x') && transaction.value && transaction.value !== '0') {
    return {
      type: TransactionType.Transfer,
      complexity: TransactionComplexity.Simple,
      baseRiskLevel: SecurityRiskLevel.Low,
      description: 'ETH transfer',
      details: {
        ethValue: ethers.utils.formatEther(transaction.value),
      },
    };
  }
  
  
  if ((!transaction.data || transaction.data === '0x') && (!transaction.value || transaction.value === '0')) {
    return {
      type: TransactionType.Unknown,
      complexity: TransactionComplexity.Simple,
      baseRiskLevel: SecurityRiskLevel.Low,
      description: 'Transaction with no data and no value',
      details: {},
    };
  }
  
  
  if (!transaction.to && transaction.data && transaction.data !== '0x') {
    return {
      type: TransactionType.ContractDeployment,
      complexity: TransactionComplexity.Complex,
      baseRiskLevel: SecurityRiskLevel.High,
      description: 'New contract deployment',
      details: {
        dataSize: ethers.utils.hexDataLength(transaction.data),
      },
    };
  }
  
  
  const functionSignature = transaction.data?.slice(0, 10).toLowerCase();
  
  
  switch (functionSignature) {
    
    case FUNCTION_SIGNATURES.transfer:
      try {
        
        const decodedData = ethers.utils.defaultAbiCoder.decode(
          ['address', 'uint256'],
          '0x' + transaction.data.slice(10)
        );
        const recipientAddress = decodedData[0];
        const amount = decodedData[1];
        
        return {
          type: TransactionType.Transfer,
          complexity: TransactionComplexity.Simple,
          baseRiskLevel: SecurityRiskLevel.Low,
          description: 'Token transfer',
          details: {
            tokenAddress: transaction.to,
            amount: amount.toString(),
            humanReadableFunctionName: 'transfer',
          },
        };
      } catch (e) {
        return {
          ...analysis,
          type: TransactionType.Transfer,
          description: 'Token transfer (unable to decode parameters)',
        };
      }
    
    
    case FUNCTION_SIGNATURES.approve:
      try {
        
        const decodedData = ethers.utils.defaultAbiCoder.decode(
          ['address', 'uint256'],
          '0x' + transaction.data.slice(10)
        );
        const spenderAddress = decodedData[0];
        const amount = decodedData[1];
        
        
        const isUnlimited = amount.eq(ethers.constants.MaxUint256) || 
          amount.gte(ethers.utils.parseEther('1000000000')); 
        
        return {
          type: isUnlimited ? TransactionType.UnlimitedApproval : TransactionType.Approval,
          complexity: TransactionComplexity.Medium,
          baseRiskLevel: isUnlimited ? SecurityRiskLevel.High : SecurityRiskLevel.Medium,
          description: isUnlimited ? 'Unlimited token approval' : 'Token approval',
          details: {
            tokenAddress: transaction.to,
            spenderAddress,
            isUnlimited,
            amount: amount.toString(),
            humanReadableFunctionName: 'approve',
          },
        };
      } catch (e) {
        return {
          ...analysis,
          type: TransactionType.Approval,
          baseRiskLevel: SecurityRiskLevel.Medium,
          description: 'Token approval (unable to decode parameters)',
        };
      }
    
    
    case FUNCTION_SIGNATURES.swapExactTokensForTokens:
    case FUNCTION_SIGNATURES.swapTokensForExactTokens:
      return {
        type: TransactionType.SwapTokensForTokens,
        complexity: TransactionComplexity.Medium,
        baseRiskLevel: SecurityRiskLevel.Medium,
        description: 'Token to token swap',
        details: {
          protocol: detectProtocol(transaction.to),
          humanReadableFunctionName: 
            functionSignature === FUNCTION_SIGNATURES.swapExactTokensForTokens
              ? 'swapExactTokensForTokens'
              : 'swapTokensForExactTokens',
        },
      };
    
    case FUNCTION_SIGNATURES.swapExactETHForTokens:
    case FUNCTION_SIGNATURES.swapETHForExactTokens:
      return {
        type: TransactionType.SwapETHForTokens,
        complexity: TransactionComplexity.Medium,
        baseRiskLevel: SecurityRiskLevel.Medium,
        description: 'ETH to token swap',
        details: {
          protocol: detectProtocol(transaction.to),
          ethValue: transaction.value ? ethers.utils.formatEther(transaction.value) : '0',
          humanReadableFunctionName: 
            functionSignature === FUNCTION_SIGNATURES.swapExactETHForTokens
              ? 'swapExactETHForTokens'
              : 'swapETHForExactTokens',
        },
      };
    
    case FUNCTION_SIGNATURES.swapExactTokensForETH:
    case FUNCTION_SIGNATURES.swapTokensForExactETH:
      return {
        type: TransactionType.SwapTokensForETH,
        complexity: TransactionComplexity.Medium,
        baseRiskLevel: SecurityRiskLevel.Medium,
        description: 'Token to ETH swap',
        details: {
          protocol: detectProtocol(transaction.to),
          humanReadableFunctionName: 
            functionSignature === FUNCTION_SIGNATURES.swapExactTokensForETH
              ? 'swapExactTokensForETH'
              : 'swapTokensForExactETH',
        },
      };
    
    
    case FUNCTION_SIGNATURES.safeTransferFrom:
    case FUNCTION_SIGNATURES.safeTransferFromWithData:
      return {
        type: TransactionType.NFTTransfer,
        complexity: TransactionComplexity.Medium,
        baseRiskLevel: SecurityRiskLevel.Medium,
        description: 'NFT transfer',
        details: {
          tokenAddress: transaction.to,
          humanReadableFunctionName: 'safeTransferFrom',
        },
      };
    
    case FUNCTION_SIGNATURES.setApprovalForAll:
      try {
        
        const decodedData = ethers.utils.defaultAbiCoder.decode(
          ['address', 'bool'],
          '0x' + transaction.data.slice(10)
        );
        const spenderAddress = decodedData[0];
        const approved = decodedData[1];
        
        return {
          type: TransactionType.NFTApproval,
          complexity: TransactionComplexity.Medium,
          baseRiskLevel: approved ? SecurityRiskLevel.High : SecurityRiskLevel.Low,
          description: approved ? 'NFT collection approval granted' : 'NFT collection approval revoked',
          details: {
            tokenAddress: transaction.to,
            spenderAddress,
            isUnlimited: approved,
            humanReadableFunctionName: 'setApprovalForAll',
          },
        };
      } catch (e) {
        return {
          ...analysis,
          type: TransactionType.NFTApproval,
          baseRiskLevel: SecurityRiskLevel.Medium,
          description: 'NFT approval (unable to decode parameters)',
        };
      }
    
    
    case FUNCTION_SIGNATURES.addLiquidity:
    case FUNCTION_SIGNATURES.addLiquidityETH:
      return {
        type: TransactionType.AddLiquidity,
        complexity: TransactionComplexity.Complex,
        baseRiskLevel: SecurityRiskLevel.Medium,
        description: 
          functionSignature === FUNCTION_SIGNATURES.addLiquidityETH
            ? 'Add ETH and token liquidity to pool'
            : 'Add token liquidity to pool',
        details: {
          protocol: detectProtocol(transaction.to),
          ethValue: transaction.value ? ethers.utils.formatEther(transaction.value) : '0',
          humanReadableFunctionName: 
            functionSignature === FUNCTION_SIGNATURES.addLiquidityETH
              ? 'addLiquidityETH'
              : 'addLiquidity',
        },
      };
    
    case FUNCTION_SIGNATURES.removeLiquidity:
    case FUNCTION_SIGNATURES.removeLiquidityETH:
      return {
        type: TransactionType.RemoveLiquidity,
        complexity: TransactionComplexity.Complex,
        baseRiskLevel: SecurityRiskLevel.Medium,
        description: 'Remove liquidity from pool',
        details: {
          protocol: detectProtocol(transaction.to),
          humanReadableFunctionName: 
            functionSignature === FUNCTION_SIGNATURES.removeLiquidityETH
              ? 'removeLiquidityETH'
              : 'removeLiquidity',
        },
      };
    
    
    case FUNCTION_SIGNATURES.deposit:
      return {
        type: TransactionType.Lending,
        complexity: TransactionComplexity.Medium,
        baseRiskLevel: SecurityRiskLevel.Medium,
        description: 'Deposit to lending protocol',
        details: {
          protocol: detectProtocol(transaction.to),
          humanReadableFunctionName: 'deposit',
          ethValue: transaction.value ? ethers.utils.formatEther(transaction.value) : '0',
        },
      };
    
    case FUNCTION_SIGNATURES.withdraw:
      return {
        type: TransactionType.Lending,
        complexity: TransactionComplexity.Medium,
        baseRiskLevel: SecurityRiskLevel.Medium,
        description: 'Withdraw from lending protocol',
        details: {
          protocol: detectProtocol(transaction.to),
          humanReadableFunctionName: 'withdraw',
        },
      };
    
    case FUNCTION_SIGNATURES.borrow:
      return {
        type: TransactionType.Borrowing,
        complexity: TransactionComplexity.Complex,
        baseRiskLevel: SecurityRiskLevel.High,
        description: 'Borrow from lending protocol',
        details: {
          protocol: detectProtocol(transaction.to),
          humanReadableFunctionName: 'borrow',
        },
      };
    
    case FUNCTION_SIGNATURES.repay:
      return {
        type: TransactionType.Borrowing,
        complexity: TransactionComplexity.Medium,
        baseRiskLevel: SecurityRiskLevel.Medium,
        description: 'Repay loan to lending protocol',
        details: {
          protocol: detectProtocol(transaction.to),
          humanReadableFunctionName: 'repay',
          ethValue: transaction.value ? ethers.utils.formatEther(transaction.value) : '0',
        },
      };
    
    default:
      
      if (
        functionSignature === FUNCTION_SIGNATURES.exactInputSingle ||
        functionSignature === FUNCTION_SIGNATURES.exactOutputSingle ||
        functionSignature === FUNCTION_SIGNATURES.exactInput ||
        functionSignature === FUNCTION_SIGNATURES.exactOutput
      ) {
        return {
          type: TransactionType.Swap,
          complexity: TransactionComplexity.Complex,
          baseRiskLevel: SecurityRiskLevel.Medium,
          description: 'Uniswap V3 token swap',
          details: {
            protocol: 'Uniswap V3',
            humanReadableFunctionName: functionSignature,
            ethValue: transaction.value ? ethers.utils.formatEther(transaction.value) : '0',
          },
        };
      }
      
      
      return {
        ...analysis,
        complexity: transaction.data.length > 1000 
          ? TransactionComplexity.Complex 
          : transaction.data.length > 200 
            ? TransactionComplexity.Medium 
            : TransactionComplexity.Simple,
        baseRiskLevel: transaction.data.length > 1000 
          ? SecurityRiskLevel.High 
          : transaction.data.length > 200 
            ? SecurityRiskLevel.Medium 
            : SecurityRiskLevel.Low,
      };
  }
}


function detectProtocol(address?: string): string {
  if (!address) return 'Unknown';
  
  
  const knownProtocols = {
    
    '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D': 'Uniswap V2',
    '0xE592427A0AEce92De3Edee1F18E0157C05861564': 'Uniswap V3',
    
    '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F': 'SushiSwap',
    
    '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9': 'Aave V2',
    
    '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B': 'Compound',
  };
  
  const normalizedAddress = address.toLowerCase();
  for (const [knownAddress, protocol] of Object.entries(knownProtocols)) {
    if (normalizedAddress === knownAddress.toLowerCase()) {
      return protocol;
    }
  }
  
  return 'Unknown';
}


export default analyzeTransactionType;