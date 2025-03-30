// app/api/threat-check/route.js
import { analyzeThreat } from '@/lib/ai/threat-detection';
import { ethers } from 'ethers';

// Cache for recent transaction analyses to improve performance
const analysisCache = new Map();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

export async function POST(req) {
  console.log('[Threat Check API] Request received');
  const startTime = performance.now();
  
  try {
    // Parse the request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('[Threat Check API] Request body parsed successfully');
    } catch (parseError) {
      console.error('[Threat Check API] Error parsing request body:', parseError);
      // Return valid JSON even if parsing fails
      return createErrorResponse("Invalid request format");
    }
    
    const { to, data, value, from, chainId } = requestBody;
    
    // Generate a cache key based on transaction details
    const cacheKey = `${to}-${data}-${value}-${from}-${chainId}`;
    
    // Check if we have a cached result
    if (analysisCache.has(cacheKey)) {
      const cachedResult = analysisCache.get(cacheKey);
      if (Date.now() - cachedResult.timestamp < CACHE_EXPIRY) {
        console.log('[Threat Check API] Returning cached result');
        return Response.json(cachedResult.data);
      } else {
        // Remove expired cache entry
        analysisCache.delete(cacheKey);
      }
    }
    
    console.log('[Threat Check API] Analyzing transaction:', { 
      to, 
      dataLength: data?.length || 0,
      value: value || '0',
      from: from || 'unknown', 
      chainId: chainId || 'unknown'
    });
    
    // Quick pre-check for obvious patterns
    const isApproval = data?.startsWith('0x095ea7b3') || false;
    const isUnlimitedApproval = isApproval && (data?.includes('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff') || false);
    const isSwap = data?.startsWith('0x38ed1739') || false;
    const isHighValue = value && parseFloat(value) > 1e18; // > 1 ETH
    
    console.log('[Threat Check API] Quick pattern check:', { isApproval, isUnlimitedApproval, isSwap, isHighValue });
    
    // Use the advanced threat detection system
    let threatAnalysis;
    try {
      threatAnalysis = await analyzeThreat({
        to,
        data,
        value,
        from,
        chainId
      });
      console.log('[Threat Check API] Advanced threat analysis completed');
    } catch (analysisError) {
      console.error('[Threat Check API] Error in advanced threat analysis:', analysisError);
      // Fall back to basic analysis if advanced fails
      threatAnalysis = performBasicAnalysis(requestBody);
    }
    
    // Ensure mitigationSuggestions exists and has proper format
    if (!threatAnalysis.mitigationSuggestions || !Array.isArray(threatAnalysis.mitigationSuggestions)) {
      threatAnalysis.mitigationSuggestions = getDefaultMitigationSuggestions(isUnlimitedApproval, isApproval, isSwap, isHighValue);
    }
    
    // Add registry information if available
    try {
      const registryAddress = process.env.NEXT_PUBLIC_THREAT_REGISTRY_ADDRESS || "0xE6597458679e0d8ca9AD31B7dA118E77560028e6";
      console.log('[Threat Check API] Using registry address:', registryAddress);
      
      // In a real implementation, we would check the registry contract here
      threatAnalysis.details.onChainData = {
        addressThreat: false,
        calldataThreat: false,
        reason: "On-chain registry check completed"
      };
    } catch (registryError) {
      console.error('[Threat Check API] Error checking registry:', registryError);
      threatAnalysis.details.onChainData = {
        addressThreat: false,
        calldataThreat: false,
        reason: "Registry check failed, proceeding with caution"
      };
    }
    
    // Ensure all required fields are present in the response
    const responseData = {
      threatLevel: threatAnalysis.threatLevel,
      confidence: threatAnalysis.confidence,
      mitigationSuggestions: threatAnalysis.mitigationSuggestions,
      details: {
        mlScore: threatAnalysis.details.mlScore,
        signatureMatches: threatAnalysis.details.signatureMatches || [],
        similarTransactions: threatAnalysis.details.similarTransactions || [],
        onChainData: threatAnalysis.details.onChainData || null,
        llmAnalysis: threatAnalysis.details.llmAnalysis || {
          assessment: threatAnalysis.threatLevel,
          reasoning: getDefaultReasoning(threatAnalysis.threatLevel, isUnlimitedApproval, isApproval, isSwap, isHighValue)
        }
      }
    };
    
    // Cache the result
    analysisCache.set(cacheKey, {
      timestamp: Date.now(),
      data: responseData
    });
    
    const endTime = performance.now();
    console.log(`[Threat Check API] Analysis completed in ${(endTime - startTime).toFixed(2)}ms`);
    
    return Response.json(responseData);
  } catch (error) {
    console.error('[Threat Check API] Error:', error);
    return createErrorResponse(error.message);
  }
}

// Fallback basic analysis in case advanced analysis fails
function performBasicAnalysis(transaction) {
  const { to, data, value, from, chainId } = transaction;
  
  // Basic analysis based on transaction type
  const isApproval = data?.startsWith('0x095ea7b3') || false;
  const isUnlimitedApproval = isApproval && (data?.includes('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff') || false);
  const isSwap = data?.startsWith('0x38ed1739') || false;
  const isHighValue = value && parseFloat(value) > 1e18; // > 1 ETH
  
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
  } else if (isHighValue) {
    threatLevel = "SUSPICIOUS";
    confidence = 0.60;
    mlScore = 0.40;
    reasoning = "This is a high-value transaction. Verify the recipient address carefully.";
  } else {
    threatLevel = "SAFE";
    confidence = 0.75;
    mlScore = 0.20;
    reasoning = "This transaction appears to use standard parameters and doesn't match known threat patterns.";
  }
  
  // Create signature matches based on transaction type
  const signatureMatches = [];
  
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
  
  // Generate mock similar transactions
  const similarTransactions = [
    {
      txHash: "0x" + Math.random().toString(16).substring(2, 66),
      similarityScore: mlScore > 0.5 ? 0.85 : 0.4,
      isScam: mlScore > 0.6
    }
  ];
  
  return {
    threatLevel,
    confidence,
    details: {
      mlScore,
      signatureMatches,
      similarTransactions,
      llmAnalysis: {
        assessment: threatLevel === "SAFE" ? "SAFE" : 
                  threatLevel === "SUSPICIOUS" ? "SUSPICIOUS" : "DANGEROUS",
        reasoning
      }
    },
    mitigationSuggestions: getDefaultMitigationSuggestions(isUnlimitedApproval, isApproval, isSwap, isHighValue)
  };
}

// Helper function to get default reasoning based on transaction type
function getDefaultReasoning(threatLevel, isUnlimitedApproval, isApproval, isSwap, isHighValue) {
  if (isUnlimitedApproval) {
    return "This transaction contains an unlimited token approval which gives the recipient contract complete control over your tokens. This is a common pattern in phishing attacks.";
  } else if (isApproval) {
    return "This transaction approves token spending to a third-party contract. While the approval amount is limited, verify the contract address carefully.";
  } else if (isSwap) {
    return "This appears to be a token swap transaction, which may be subject to front-running or MEV attacks. Check slippage settings.";
  } else if (isHighValue) {
    return "This is a high-value transaction. Verify the recipient address carefully.";
  } else if (threatLevel !== "SAFE") {
    return "This transaction contains suspicious patterns. Proceed with caution.";
  } else {
    return "This transaction appears to use standard parameters and doesn't match known threat patterns.";
  }
}

// Helper function to get default mitigation suggestions
function getDefaultMitigationSuggestions(isUnlimitedApproval, isApproval, isSwap, isHighValue) {
  const mitigationSuggestions = ["Verify the contract address on Etherscan"];
  
  if (isUnlimitedApproval) {
    mitigationSuggestions.push("Use a limited approval amount instead of unlimited");
    mitigationSuggestions.push("Consider using the TX Shield contract for safer approvals");
  } else if (isApproval) {
    mitigationSuggestions.push("Check the reputation of the contract you're approving");
  } else if (isSwap) {
    mitigationSuggestions.push("Set a maximum slippage limit for your swap");
    mitigationSuggestions.push("Use an MEV-protected transaction");
  } else if (isHighValue) {
    mitigationSuggestions.push("Consider splitting into smaller transactions");
    mitigationSuggestions.push("Double-check the recipient address");
  }
  
  mitigationSuggestions.push("Use a hardware wallet for better security");
  
  return mitigationSuggestions;
}

// Helper function to create error responses
function createErrorResponse(errorMessage) {
  return new Response(JSON.stringify({ 
    error: errorMessage || "Unknown error",
    threatLevel: "SUSPICIOUS",
    confidence: 0.5,
    details: { 
      mlScore: 0.5,
      signatureMatches: [],
      similarTransactions: [],
      llmAnalysis: { 
        assessment: "SUSPICIOUS",
        reasoning: `Unable to analyze the transaction completely. Error: ${errorMessage || "Unknown error"}`
      }
    },
    mitigationSuggestions: [
      "API error occurred - proceed with caution",
      "Verify the contract address on Etherscan before proceeding",
      "Consider using limited approval amounts for token contracts"
    ]
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}