export async function POST(req) {
  // Static mock data - no try/catch, no request parsing
  const mockResponse = {
    success: true,
    statusCode: 1,
    gasEstimate: {
      gasUsed: '100000',
      gasLimit: '250000',
      gasCost: '0.005',
      gasCostUSD: 10.00
    },
    balanceChanges: [
      {
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        oldBalance: '1000.0',
        newBalance: '1000.0',
        absoluteChange: '0.0',
        percentageChange: 0,
        usdValueChange: 0
      }
    ],
    warnings: {
      customWarnings: []
    },
    visualizationData: {},
    simulationId: `sim-${Date.now()}`
  };

  // Explicitly stringify and set content-type
  const jsonString = JSON.stringify(mockResponse);
  console.log("API: Sending simulation response with length:", jsonString.length);

  return new Response(jsonString, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}