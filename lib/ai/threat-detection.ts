// lib/ai/threat-detection.ts
import * as tf from '@tensorflow/tfjs';
import { ethers } from 'ethers';
import axios from 'axios';
import { Pinecone } from '@pinecone-database/pinecone';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

// Initialize vector database for similarity search of transaction patterns
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY as string,
});

const index = pinecone.Index(process.env.PINECONE_INDEX as string);

// Initialize LLM for transaction analysis
const llm = new ChatOpenAI({
  modelName: 'gpt-4-turbo',
  temperature: 0,
  openAIApiKey: process.env.OPENAI_API_KEY as string,
});

// Threat detection model (pre-trained on known scam patterns)
let model: tf.LayersModel | null = null;

// Known attack signature patterns (regularly updated)
interface AttackSignature {
  pattern: string;
  type: string;
  description: string;
  severity: number; // 1-10 scale
  callDataMatcher?: RegExp;
}

// Load attack signatures from database/API
const loadAttackSignatures = async (): Promise<AttackSignature[]> => {
  try {
    // In production, this would fetch from a secure API
    const response = await axios.get(`${process.env.API_BASE_URL}/api/signatures`);
    return response.data.signatures;
  } catch (error) {
    console.error('Failed to load attack signatures:', error);
    // Fallback to local signatures for reliability
    return [
      {
        pattern: 'unlimited_approval',
        type: 'APPROVAL_PHISHING',
        description: 'Requesting unlimited token approval',
        severity: 8,
        callDataMatcher: /0x095ea7b3[\s\S]{64}ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff/i
      },
      {
        pattern: 'multiple_approvals',
        type: 'APPROVAL_FARMING',
        description: 'Multiple token approvals in single transaction',
        severity: 7
      },
      {
        pattern: 'flashloan_attack',
        type: 'PRICE_MANIPULATION',
        description: 'Pattern matching flash loan attack',
        severity: 9
      },
      {
        pattern: 'honeypot_contract',
        type: 'LIQUIDITY_TRAP',
        description: 'Contract with withdrawal restrictions',
        severity: 10
      }
    ];
  }
};

// Load TensorFlow model
const loadModel = async (): Promise<tf.LayersModel> => {
  if (model) return model;
  
  try {
    // Try to load the model from CDN/API
    model = await tf.loadLayersModel(`${process.env.MODEL_BASE_URL}/tx-shield-model/model.json`);
    return model;
  } catch (error) {
    console.error('Failed to load model, falling back to local detection:', error);
    // Fallback to a simple model defined here
    const fallbackModel = tf.sequential();
    fallbackModel.add(tf.layers.dense({units: 64, activation: 'relu', inputShape: [128]}));
    fallbackModel.add(tf.layers.dense({units: 32, activation: 'relu'}));
    fallbackModel.add(tf.layers.dense({units: 1, activation: 'sigmoid'}));
    
    fallbackModel.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
    
    model = fallbackModel;
    return model;
  }
};

// Convert transaction calldata to feature vector
const encodeCalldata = (calldata: string): number[] => {
  // Remove 0x prefix
  const cleanData = calldata.startsWith('0x') ? calldata.slice(2) : calldata;
  
  // Create feature vector (in production this would be more sophisticated)
  const features = new Array(128).fill(0);
  
  // Extract function signature
  const funcSig = cleanData.slice(0, 8);
  
  // Simple byte frequency analysis
  for (let i = 0; i < cleanData.length; i += 2) {
    const byteVal = parseInt(cleanData.slice(i, i + 2), 16);
    const idx = Math.floor((byteVal / 256) * features.length);
    features[idx] += 1;
  }
  
  // Check for specific patterns (e.g., unlimited approvals)
  if (funcSig === '095ea7b3') { // approve(address,uint256)
    const valueHex = cleanData.slice(8 + 64); // Skip function sig and first param
    if (valueHex.match(/^f{64}$/i)) { // All f's indicates max uint
      features[0] = 5; // Strong indicator
    }
  }
  
  return features;
};

// Analyze transaction with multiple detection methods
export interface ThreatAnalysisResult {
  threatLevel: 'SAFE' | 'SUSPICIOUS' | 'HIGH' | 'CRITICAL';
  confidence: number;
  details: {
    mlScore: number;
    signatureMatches: {
      pattern: string;
      type: string;
      description: string;
      severity: number;
    }[];
    similarTransactions: {
      txHash: string;
      similarityScore: number;
      isScam: boolean;
    }[];
    llmAnalysis?: {
      assessment: string;
      reasoning: string;
    };
  };
  mitigationSuggestions: string[];
}

// Main analysis function
export const analyzeThreat = async (
  transaction: {
    to: string;
    value: string;
    data: string;
    from: string;
    chainId: number;
  }
): Promise<ThreatAnalysisResult> => {
  // Initial result template
  const result: ThreatAnalysisResult = {
    threatLevel: 'SAFE',
    confidence: 0,
    details: {
      mlScore: 0,
      signatureMatches: [],
      similarTransactions: []
    },
    mitigationSuggestions: []
  };

  try {
    // 1. Load model and signatures in parallel
    const [tfModel, signatures] = await Promise.all([
      loadModel(),
      loadAttackSignatures()
    ]);
    
    // 2. ML-based detection
    const features = encodeCalldata(transaction.data);
    const inputTensor = tf.tensor2d([features]);
    
    const prediction = tfModel.predict(inputTensor) as tf.Tensor;
    const mlScore = (await prediction.data())[0];
    result.details.mlScore = mlScore;
    
    // Clean up tensor
    inputTensor.dispose();
    prediction.dispose();
    
    // 3. Signature-based detection
    for (const signature of signatures) {
      if (signature.callDataMatcher && signature.callDataMatcher.test(transaction.data)) {
        result.details.signatureMatches.push({
          pattern: signature.pattern,
          type: signature.type,
          description: signature.description,
          severity: signature.severity
        });
      }
    }
    
    // 4. Vector similarity search for similar known scams
    const txVector = features.slice(0, 20); // Use subset of features for vector DB
    const queryResponse = await index.query({
      vector: txVector,
      topK: 5,
      includeMetadata: true
    });
    
    result.details.similarTransactions = queryResponse.matches.map(match => ({
      txHash: match.id,
      similarityScore: match.score || 0, // Default to 0 if undefined
      isScam: match.metadata?.isScam === true
    }));
    
    // 5. LLM analysis for advanced pattern recognition (only for suspicious transactions)
    if (mlScore > 0.3 || result.details.signatureMatches.length > 0) {
      // Extract function signature and parameters
      const funcSig = transaction.data.slice(0, 10);
      const abiInterface = new ethers.utils.Interface([
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function transfer(address recipient, uint256 amount) external returns (bool)",
        "function transferFrom(address sender, address recipient, uint256 amount) external returns (bool)",
        "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) external returns (uint256[] amounts)",
        "function swapExactETHForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline) external payable returns (uint256[] amounts)"
      ]);
      
      let decodedCalldata = "Unable to decode";
      try {
        decodedCalldata = JSON.stringify(abiInterface.parseTransaction({ data: transaction.data }));
      } catch {
        // If we can't decode, use the raw data
        decodedCalldata = transaction.data;
      }
      
      // Prompt the LLM for analysis
      const llmResponse = await llm.call([
        new SystemMessage(
          "You are a blockchain security expert analyzing Ethereum transactions for potential scams, vulnerabilities, or malicious patterns. " +
          "Analyze the following transaction data and evaluate if it appears suspicious or malicious. " +
          "Consider factors like: unlimited token approvals, unusual addresses, suspicious function calls, potential for exploits."
        ),
        new HumanMessage(
          `Transaction details:\n` +
          `To: ${transaction.to}\n` +
          `Value: ${transaction.value} ETH\n` +
          `Function: ${funcSig}\n` +
          `Decoded data: ${decodedCalldata}\n\n` +
          `Provide a security assessment with your reasoning. Format your response as:\n` +
          `Assessment: [SAFE/SUSPICIOUS/DANGEROUS]\n` +
          `Reasoning: [Your analysis]`
        )
      ]);
      
      // Parse LLM response
      const llmText = llmResponse.content as string;
      const assessmentMatch = llmText.match(/Assessment: (SAFE|SUSPICIOUS|DANGEROUS)/i);
      const reasoningMatch = llmText.match(/Reasoning: ([\s\S]*?)(?:\n|$)/i);

      
      if (assessmentMatch && reasoningMatch) {
        result.details.llmAnalysis = {
          assessment: assessmentMatch[1],
          reasoning: reasoningMatch[1].trim()
        };
        
        // If LLM thinks it's dangerous, increase threat level
        if (assessmentMatch[1] === 'DANGEROUS') {
          result.confidence += 0.3;
        } else if (assessmentMatch[1] === 'SUSPICIOUS') {
          result.confidence += 0.1;
        }
      }
    }
    
    // 6. Calculate final threat level and confidence
    let threatScore = result.details.mlScore * 0.4; // ML model: 40% weight
    
    // Add signature match severity
    if (result.details.signatureMatches.length > 0) {
      // Get max severity
      const maxSeverity = Math.max(...result.details.signatureMatches.map(m => m.severity));
      threatScore += (maxSeverity / 10) * 0.4; // Signature match: 40% weight
    }
    
    // Add similar transaction weight
    const scamMatches = result.details.similarTransactions.filter(tx => tx.isScam);
    if (scamMatches.length > 0) {
      const avgSimilarity = scamMatches.reduce((sum, tx) => sum + tx.similarityScore, 0) / scamMatches.length;
      threatScore += avgSimilarity * 0.2; // Similar transactions: 20% weight
    }
    
    result.confidence = parseFloat(threatScore.toFixed(2));
    
    // Set threat level based on score
    if (threatScore >= 0.8) {
      result.threatLevel = 'CRITICAL';
    } else if (threatScore >= 0.5) {
      result.threatLevel = 'HIGH';
    } else if (threatScore >= 0.2) {
      result.threatLevel = 'SUSPICIOUS';
    } else {
      result.threatLevel = 'SAFE';
    }
    
    // 7. Generate mitigation suggestions
    if (result.threatLevel !== 'SAFE') {
      result.mitigationSuggestions = generateMitigationSuggestions(
        transaction,
        result.details.signatureMatches
      );
    }
    
    return result;
    
  } catch (error) {
    console.error('Error in threat analysis:', error);
    // In case of error, return suspicious with lower confidence
    return {
      threatLevel: 'SUSPICIOUS',
      confidence: 0.3,
      details: {
        mlScore: 0.3,
        signatureMatches: [],
        similarTransactions: [],
        llmAnalysis: {
          assessment: 'SUSPICIOUS',
          reasoning: 'Error during analysis - proceeding with caution'
        }
      },
      mitigationSuggestions: [
        'Use a limited approval amount instead of unlimited',
        'Verify the contract address on a block explorer',
        'Consider splitting the transaction into smaller amounts'
      ]
    };
  }
};

// Generate mitigation suggestions based on detected threats
const generateMitigationSuggestions = (
  transaction: {
    to: string;
    value: string;
    data: string;
    from: string;
    chainId: number;
  },
  signatureMatches: {
    pattern: string;
    type: string;
    description: string;
    severity: number;
  }[]
): string[] => {
  const suggestions: string[] = [];
  
  // Default suggestions
  suggestions.push('Verify the contract address on a trusted block explorer');
  
  // Pattern-specific suggestions
  for (const match of signatureMatches) {
    if (match.pattern === 'unlimited_approval') {
      suggestions.push('Use a time-limited or amount-limited approval instead of unlimited');
      suggestions.push(`Specify an exact approval amount needed for this transaction instead of ${ethers.constants.MaxUint256.toString()}`);
    }
    
    if (match.pattern === 'multiple_approvals') {
      suggestions.push('Split approvals into separate transactions for better control');
      suggestions.push('Revoke unnecessary approvals after use via https://revoke.cash');
    }
    
    if (match.pattern === 'flashloan_attack') {
      suggestions.push('Use contracts with price manipulation protections');
      suggestions.push('Add minimum time delays between significant actions');
    }
    
    if (match.pattern === 'honeypot_contract') {
      suggestions.push('Test with a small amount first and verify withdrawal functionality');
      suggestions.push('Use TX Shield simulation to verify actual token flow');
    }
  }
  
  // Value-based suggestions
  if (ethers.utils.formatEther(transaction.value) > '10') {
    suggestions.push('Consider splitting into smaller transactions for safety');
    suggestions.push('Use a hardware wallet for additional security');
  }
  
  // Deduplicate and return top suggestions
  return [...new Set(suggestions)].slice(0, 5);
};

// Export functions for API routes
export default {
  analyzeThreat,
  encodeCalldata,
  loadModel
};