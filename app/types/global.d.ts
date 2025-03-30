// app/types/global.d.ts

// Extend the Window interface to include ethereum
interface Window {
    ethereum?: any;
    fs?: {
      readFile: (path: string, options?: { encoding?: string }) => Promise<string | Uint8Array>;
    };
  }
  
  // Declare ValueType to ensure toFixed works in charts
  type ValueType = string | number | Array<string | number>;
  // src/types.ts or lib/types.ts
  export interface TransactionDetails {
    spender?: string;
    approvalAmount?: string;
    tokenAddress?: string;
    recipient?: string;
    scamDetails?: {
      isScam: boolean;
      reason: string;
      confidence: string;
    };
    [key: string]: any; // This allows any additional properties
  }

export interface ThreatAnalysisResult {
  threatLevel: string;
  confidence: number;
  mitigationSuggestions: string[];
  details: {
    mlScore: number;
    signatureMatches: Array<{
      pattern: string;
      type: string;
      description: string;
      severity: number;
    }>;
    similarTransactions: Array<{
      txHash: string;
      similarityScore: number;
      isScam: boolean;
    }>;
    transactionType: string;
    transactionDetails: TransactionDetails;
    llmAnalysis: {
      assessment: string;
      reasoning: string;
    };
  };
}