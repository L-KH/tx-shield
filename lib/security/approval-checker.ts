// lib/security/approval-checker.ts
// A minimal implementation to ensure the file exists

import { ethers } from 'ethers';

// ERC20 interface for checking approvals
const ERC20_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)'
];

/**
 * Check if an address has unlimited approval for a token
 */
export async function hasUnlimitedApproval(
  tokenAddress: string,
  ownerAddress: string,
  spenderAddress: string,
  provider: ethers.providers.Provider
): Promise<boolean> {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const allowance = await tokenContract.allowance(ownerAddress, spenderAddress);
    
    // Check if allowance is very large (> 10^30)
    return allowance.gt(ethers.utils.parseUnits('1000000000', 30));
  } catch (error) {
    console.error('Error checking approval:', error);
    return false;
  }
}

/**
 * Calculate risk level of an approval
 */
export function calculateApprovalRisk(
  allowanceAmount: ethers.BigNumber,
  tokenBalance: ethers.BigNumber,
  spenderReputation: 'TRUSTED' | 'UNKNOWN' | 'SUSPICIOUS'
): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  // If it's unlimited approval
  if (allowanceAmount.gt(ethers.utils.parseUnits('1000000000', 30))) {
    if (spenderReputation === 'SUSPICIOUS') {
      return 'CRITICAL';
    }
    if (spenderReputation === 'UNKNOWN') {
      return 'HIGH';
    }
    return 'MEDIUM';
  }
  
  // If allowance is greater than balance
  if (tokenBalance.gt(0) && allowanceAmount.gt(tokenBalance)) {
    if (spenderReputation === 'SUSPICIOUS') {
      return 'HIGH';
    }
    if (spenderReputation === 'UNKNOWN') {
      return 'MEDIUM';
    }
    return 'LOW';
  }
  
  // Low risk case
  return 'LOW';
}