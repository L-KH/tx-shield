// app/api/simulate/route.js

export async function POST(req) {
  console.log('[Simulation API] Request received');
  
  try {
    // Parse the request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('[Simulation API] Request body parsed successfully');
    } catch (parseError) {
      console.error('[Simulation API] Error parsing request body:', parseError);
      // Return valid JSON even if parsing fails
      return new Response(JSON.stringify({ 
        success: false,
        error: "Invalid request format",
        gasEstimate: {
          gasUsed: "85000",
          gasLimit: "127500",
          gasCost: "0.00170",
          gasCostUSD: 3.40
        },
        balanceChanges: []
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { to, data, value, from, chainId } = requestBody;
    console.log('[Simulation API] Simulating transaction:', { 
      to, 
      dataLength: data?.length || 0,
      value: value || '0',
      from: from || 'unknown', 
      chainId: chainId || 'unknown'
    });
    
    // Try to get contract addresses from environment, but use defaults if not available
    const txShieldContractAddress = process.env.NEXT_PUBLIC_TXSHIELD_CONTRACT_ADDRESS || "0xc076D95F95021D1fBBfe2BDB9692d656B7ddc846";
    console.log('[Simulation API] TX Shield contract address:', txShieldContractAddress);
    
    // Determine if this is a TX Shield transaction
    const isTxShieldContract = to?.toLowerCase() === txShieldContractAddress.toLowerCase();
    
    // Determine transaction type
    const isApproval = data?.startsWith('0x095ea7b3') || false;
    const isUnlimitedApproval = isApproval && (data?.includes('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff') || false);
    const isSwap = data?.startsWith('0x38ed1739') || false;
    
    console.log('[Simulation API] Transaction type:', { 
      isApproval, 
      isUnlimitedApproval, 
      isSwap,
      isTxShieldContract
    });
    
    // Format value (if provided)
    let ethValue = "0.0";
    if (value && value !== '0') {
      try {
        // Simplified ETH value calculation
        ethValue = (parseInt(value) / 1e18).toFixed(6);
      } catch (error) {
        console.error('[Simulation API] Error calculating ETH value:', error);
      }
    }
    
    // Mock gas usage based on transaction type
    const gasUsed = isSwap ? "150000" : (isTxShieldContract ? "120000" : "65000");
    const gasPrice = "20000000000"; // 20 gwei
    const gasCost = (parseInt(gasUsed) * parseInt(gasPrice) / 1e18).toFixed(6);
    const etherPrice = 2000; // Mock ETH price in USD
    const gasCostUSD = parseFloat((parseFloat(gasCost) * etherPrice).toFixed(2));
    
    // Setup balance changes
    const balanceChanges = [];
    
    // Add ETH balance change if value is non-zero
    if (value && value !== '0') {
      balanceChanges.push({
        address: from || "0xUserAddress",
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
        oldBalance: "10.0", // Mock starting balance
        newBalance: (10 - parseFloat(ethValue)).toFixed(6),
        absoluteChange: `-${ethValue}`,
        percentageChange: -(parseFloat(ethValue) * 10), // % of starting balance
        usdValueChange: -(parseFloat(ethValue) * etherPrice)
      });
    }
    
    // Add token changes based on transaction type
    if (isApproval) {
      // Approvals don't change token balances
      balanceChanges.push({
        address: to,
        symbol: isUnlimitedApproval ? "TOKEN" : "USDC",
        name: isUnlimitedApproval ? "Unknown Token" : "USD Coin",
        decimals: 18,
        oldBalance: "1000.0",
        newBalance: "1000.0",
        absoluteChange: "0.0",
        percentageChange: 0,
        usdValueChange: 0
      });
    } else if (isSwap) {
      // For swaps, show both input and output tokens
      balanceChanges.push({
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC token (example)
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        oldBalance: "1000.0",
        newBalance: "900.0",
        absoluteChange: "-100.0",
        percentageChange: -10,
        usdValueChange: -100
      });
      
      balanceChanges.push({
        address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH token
        symbol: "WETH",
        name: "Wrapped Ethereum",
        decimals: 18,
        oldBalance: "5.0",
        newBalance: "5.05",
        absoluteChange: "+0.05",
        percentageChange: 1,
        usdValueChange: 100
      });
    }
    
    // Generate warnings based on transaction type
    const warnings = {
      highSlippage: isSwap,
      highGasUsage: false,
      priceImpact: isSwap,
      mevExposure: isSwap && !isTxShieldContract, // TX Shield protects against MEV
      revertRisk: false,
      customWarnings: []
    };
    
    // Add custom warnings
    if (isUnlimitedApproval && !isTxShieldContract) {
      warnings.customWarnings.push("Unlimited approval detected. This gives the spender complete control over your tokens.");
    } else if (isUnlimitedApproval && isTxShieldContract) {
      warnings.customWarnings.push("TX Shield contract is protecting you from unlimited approval risks.");
    }
    
    if (isSwap && !isTxShieldContract) {
      warnings.customWarnings.push("This swap may be subject to front-running or sandwich attacks.");
    } else if (isSwap && isTxShieldContract) {
      warnings.customWarnings.push("TX Shield contract is protecting this swap from MEV attacks.");
    }
    
    // Generate MEV analysis for swaps
    let mevExposure = null;
    if (isSwap) {
      mevExposure = {
        sandwichRisk: isTxShieldContract ? 15 : 65,
        frontrunningRisk: isTxShieldContract ? 10 : 40,
        backrunningRisk: isTxShieldContract ? 5 : 25,
        potentialMEVLoss: isTxShieldContract ? "0.003" : "0.015",
        suggestedProtections: [
          "Use a private transaction service",
          "Set maximum slippage to 1%",
          "Execute through TX Shield contract"
        ]
      };
      
      // If already using TX Shield, update suggestions
      if (isTxShieldContract) {
        mevExposure.suggestedProtections = [
          "TX Shield protection active",
          "Set maximum slippage to 1%"
        ];
      }
    }
    
    // Create response object
    const responseData = {
      success: true,
      statusCode: 1,
      gasEstimate: {
        gasUsed,
        gasLimit: (parseInt(gasUsed) * 1.5).toString(),
        gasCost,
        gasCostUSD
      },
      balanceChanges,
      mevExposure,
      warnings,
      logs: [],
      visualizationData: {
        balanceChanges: balanceChanges.map(change => ({
          symbol: change.symbol,
          change: parseFloat(change.absoluteChange),
          percentChange: change.percentageChange,
          usdValue: change.usdValueChange || 0
        }))
      },
      simulationId: `sim-${Date.now()}`
    };
    
    console.log('[Simulation API] Response ready');
    
    // Create a simple JSON response
    // return new Response(JSON.stringify(responseData), {
    //   headers: { 'Content-Type': 'application/json' }
    // });
    return Response.json(responseData);
  } catch (error) {
    console.error('[Simulation API] Error:', error);
    
    // Return a valid JSON response even if an error occurs
    return new Response(JSON.stringify({
      success: false,
      statusCode: 0,
      error: error.message,
      revertReason: "Simulation service error: " + error.message,
      gasEstimate: {
        gasUsed: "85000",
        gasLimit: "127500",
        gasCost: "0.00170",
        gasCostUSD: 3.40
      },
      balanceChanges: [],
      warnings: {
        highSlippage: false,
        highGasUsage: false,
        priceImpact: false,
        mevExposure: false,
        revertRisk: true,
        customWarnings: ["Simulation service error: " + error.message]
      },
      simulationId: `sim-error-${Date.now()}`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}