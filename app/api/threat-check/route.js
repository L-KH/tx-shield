export async function POST(req) {
  // Static mock data - no try/catch, no request parsing
  const mockData = {
    threatLevel: 'HIGH',
    confidence: 0.9,
    mitigationSuggestions: [
      'Use limited approvals instead of unlimited',
      'Verify the contract address on a trusted block explorer'
    ],
    details: {
      mlScore: 0.5,
      signatureMatches: [],
      similarTransactions: [],
      llmAnalysis: null
    }
  };

  // Explicitly stringify and set content-type
  const jsonString = JSON.stringify(mockData);
  console.log("API: Sending response with length:", jsonString.length);

  return new Response(jsonString, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}