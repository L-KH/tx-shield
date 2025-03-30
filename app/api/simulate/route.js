// app/api/simulate/route.js
import { NextResponse } from 'next/server';

export async function POST(req) {
  console.log('[Simulation API] Request received');
  
  try {
    // Parse the request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('[Simulation API] Request body:', requestBody);
    } catch (parseError) {
      console.error('[Simulation API] Error parsing request body:', parseError);
      return NextResponse.json({
        success: false,
        error: "Invalid request format"
      }, { status: 400 });
    }
    
    const { to, data, value, from, chainId } = requestBody;
    
    // Determine transaction type
    const functionSignature = data?.slice(0, 10) || '0x';
    let transactionType = 'unknown';
    
    if (functionSignature === '0x') {
      transactionType = 'ethTransfer';
    } else if (functionSignature === '0xa9059cbb') {
      transactionType = 'transfer';
    } else if (functionSignature === '0x095ea7b3') {
      transactionType = 'approval';
    } else if (['0x38ed1739', '0x7ff36ab5', '0x18cbafe5', '0x8803dbee'].includes(functionSignature)) {
      transactionType = 'swap';
    }
    
    console.log(`[Simulation API] Transaction type: ${transactionType}`);
    
    // Check for unlimited approval
    const isApproval = transactionType === 'approval';
    const isUnlimitedApproval = isApproval && data?.includes('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    const isSwap = transactionType === 'swap';
    
    // Calculate ETH value from transaction
    let valueInEth = 0;
    if (value && value !== '0') {
      valueInEth = parseInt(value) / 1e18;
      console.log(`[Simulation API] Transaction value: ${valueInEth} ETH`);
    }
    
    // Mock ETH price
    const ethPrice = 3500;
    
    // Calculate mock gas usage
    const gasUsage = isSwap ? 150000 : (isApproval ? (isUnlimitedApproval ? 55000 : 46000) : 21000);
    
    // Calculate mock gas cost (30 gwei)
    const gasCostEth = (gasUsage * 30 * 1e-9).toFixed(6);
    const gasCostUSD = (parseFloat(gasCostEth) * ethPrice).toFixed(2);
    
    // Generate mock balance changes based on transaction type
    const balanceChanges = [];
    
    if (transactionType === 'ethTransfer') {
      // For ETH transfers, use the actual value
      if (valueInEth > 0) {
        // Sender loses ETH
        balanceChanges.push({
          address: from,
          symbol: "ETH",
          name: "Ethereum",
          decimals: 18,
          oldBalance: (valueInEth + 5).toFixed(6), // Assume they had valueInEth + 5
          newBalance: "5.000000", // Remaining after transfer
          absoluteChange: `-${valueInEth.toFixed(6)}`,
          percentageChange: -((valueInEth / (valueInEth + 5)) * 100),
          usdValueChange: -(valueInEth * ethPrice)
        });
        
        // Recipient gains ETH
        balanceChanges.push({
          address: to,
          symbol: "ETH",
          name: "Ethereum",
          decimals: 18,
          oldBalance: "Unknown",
          newBalance: `Unknown + ${valueInEth.toFixed(6)}`,
          absoluteChange: `+${valueInEth.toFixed(6)}`,
          percentageChange: 0,
          usdValueChange: valueInEth * ethPrice
        });
      }
    } 
    else if (transactionType === 'approval') {
      // For approvals, no balance changes but show token
      balanceChanges.push({
        address: to,
        symbol: isUnlimitedApproval ? "TOKEN" : "USDC",
        name: isUnlimitedApproval ? "Unknown Token" : "USD Coin",
        decimals: isUnlimitedApproval ? 18 : 6,
        oldBalance: isUnlimitedApproval ? "1000.000000" : "2000.00",
        newBalance: isUnlimitedApproval ? "1000.000000" : "2000.00",
        absoluteChange: "0.000000",
        percentageChange: 0,
        usdValueChange: 0,
        approvalDetails: {
          spender: data?.substring(34, 74) || "0x0000000000000000000000000000000000000000",
          oldAllowance: "0",
          newAllowance: isUnlimitedApproval ? "Unlimited" : "1000.00",
          isUnlimited: isUnlimitedApproval
        }
      });
    }
    else if (transactionType === 'transfer') {
      // For token transfers
      balanceChanges.push({
        address: from,
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        oldBalance: "2000.00",
        newBalance: "1500.00",
        absoluteChange: "-500.00",
        percentageChange: -25,
        usdValueChange: -500
      });
    }
    else if (transactionType === 'swap') {
      // For swaps
      balanceChanges.push({
        address: from,
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        oldBalance: "2000.00",
        newBalance: "1000.00",
        absoluteChange: "-1000.00",
        percentageChange: -50,
        usdValueChange: -1000
      });
      
      balanceChanges.push({
        address: from,
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
        oldBalance: "1.000000",
        newBalance: "1.285714",
        absoluteChange: "+0.285714",
        percentageChange: 28.57,
        usdValueChange: 1000
      });
    }
    else {
      // Default for unknown transactions
      balanceChanges.push({
        address: from,
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
        oldBalance: "10.000000",
        newBalance: "9.900000",
        absoluteChange: "-0.100000",
        percentageChange: -1,
        usdValueChange: -350
      });
    }
    
    // Create mock MEV exposure for swaps
    const mevExposure = isSwap ? {
      sandwichRisk: 65,
      frontrunningRisk: 40,
      backrunningRisk: 25,
      potentialMEVLoss: "0.015",
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
      mevExposure: isSwap,
      revertRisk: false,
      customWarnings: isUnlimitedApproval ? ["Unlimited approval detected"] : []
    };
    
    // Create response object
    const responseData = {
      success: true,
      statusCode: 1,
      gasEstimate: {
        gasUsed: gasUsage.toString(),
        gasLimit: Math.ceil(gasUsage * 1.5).toString(),
        gasCost: gasCostEth,
        gasCostUSD: parseFloat(gasCostUSD)
      },
      balanceChanges,
      mevExposure,
      warnings,
      logs: [],
      simulationId: `sim-${Date.now()}`
    };
    
    console.log('[Simulation API] Sending response:', JSON.stringify(responseData).substring(0, 200) + '...');
    
    // Use NextResponse to correctly return JSON
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('[Simulation API] Error:', error);
    
    // Return error response with NextResponse
    return NextResponse.json({
      success: false,
      error: error.message || "Unknown error",
      gasEstimate: {
        gasUsed: "85000",
        gasLimit: "127500",
        gasCost: "0.00297",
        gasCostUSD: 10.40
      },
      balanceChanges: [],
      warnings: {
        revertRisk: true,
        customWarnings: ["Simulation error: " + (error.message || "Unknown error")]
      },
      simulationId: `sim-error-${Date.now()}`
    }, { status: 500 });
  }
}