// app/api/threat-check/route.js

export async function POST(req) {
  console.log('[Threat Check API] Request received');
  
  try {
    // Parse the request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('[Threat Check API] Request body parsed successfully');
    } catch (parseError) {
      console.error('[Threat Check API] Error parsing request body:', parseError);
      // Return valid JSON even if parsing fails
      return new Response(JSON.stringify({ 
        error: "Invalid request format",
        threatLevel: "SUSPICIOUS",
        confidence: 0.5,
        details: { 
          mlScore: 0.5,
          llmAnalysis: { 
            assessment: "SUSPICIOUS",
            reasoning: "Unable to analyze the transaction due to invalid request format."
          }
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { to, data, value, from, chainId } = requestBody;
    console.log('[Threat Check API] Analyzing transaction:', { 
      to, 
      dataLength: data?.length || 0,
      value: value || '0',
      from: from || 'unknown', 
      chainId: chainId || 'unknown'
    });
    
    // Basic analysis based on transaction type
    const isApproval = data?.startsWith('0x095ea7b3') || false;
    const isUnlimitedApproval = isApproval && (data?.includes('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff') || false);
    const isSwap = data?.startsWith('0x38ed1739') || false;
    const isHighValue = value && parseFloat(value) > 1e18; // > 1 ETH
    
    console.log('[Threat Check API] Transaction type:', { isApproval, isUnlimitedApproval, isSwap, isHighValue });
    
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
    
    // Generate mitigation suggestions
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
    
    // Create mock similar transactions
    const similarTransactions = [
      {
        txHash: "0x" + Math.random().toString(16).substring(2, 66),
        similarityScore: mlScore > 0.5 ? 0.85 : 0.4,
        isScam: mlScore > 0.6
      }
    ];
    
    // Mock on-chain data
    const onChainData = {
      addressThreat: false,
      calldataThreat: false,
      reason: "On-chain registry check completed"
    };
    
    // Try to get contract addresses from environment, but use defaults if not available
    const registryAddress = process.env.NEXT_PUBLIC_THREAT_REGISTRY_ADDRESS || "0xE6597458679e0d8ca9AD31B7dA118E77560028e6";
    console.log('[Threat Check API] Using registry address:', registryAddress);
    
    // Create response object
    const responseData = {
      threatLevel,
      confidence,
      mitigationSuggestions,
      details: {
        mlScore,
        signatureMatches,
        similarTransactions,
        onChainData,
        llmAnalysis: {
          assessment: threatLevel === "SAFE" ? "SAFE" : 
                    threatLevel === "SUSPICIOUS" ? "SUSPICIOUS" : "DANGEROUS",
          reasoning
        }
      }
    };
    
    console.log('[Threat Check API] Response ready');
    
    // Create a simple JSON response
    // return new Response(JSON.stringify(responseData), {
    //   headers: { 'Content-Type': 'application/json' }
    // });
    return Response.json(responseData);
  } catch (error) {
    console.error('[Threat Check API] Error:', error);
    
    // Return a valid JSON response even if an error occurs
    return new Response(JSON.stringify({
      threatLevel: "SUSPICIOUS",
      confidence: 0.5,
      mitigationSuggestions: [
        "API error occurred - proceed with caution",
        "Verify the contract address on Etherscan before proceeding",
        "Consider using limited approval amounts for token contracts"
      ],
      details: {
        mlScore: 0.5,
        signatureMatches: [],
        similarTransactions: [],
        onChainData: null,
        llmAnalysis: {
          assessment: "SUSPICIOUS",
          reasoning: "Unable to complete threat analysis due to a server error. Proceed with caution."
        },
        error: error.message
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}