export async function POST(req) {
  try {
    const alternatives = [
      {
        title: 'Limited Token Approval',
        description: 'Approve only the exact amount needed instead of infinite approval',
        riskReduction: 85,
        gasDifference: '+0%',
        implementation: 'Modified transaction with max approval of 1000 tokens',
        transactionData: {
          to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          data: '0x095ea7b3000000000000000000000000000000000000000000000000000000000000007b',
          value: '0'
        }
      }
    ];

    return new Response(JSON.stringify({ alternatives }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error in alternatives API:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}