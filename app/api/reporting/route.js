// app/api/reporting/route.js
export async function GET(req) {
    const mockReportData = {
      threats: {
        total: 1285,
        byType: {
          unlimitedApproval: 623,
          phishing: 312,
          maliciousContract: 241,
          other: 109
        },
        recentThreats: [
          {
            date: '2025-03-24',
            type: 'Unlimited Approval',
            contract: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            severity: 'HIGH'
          },
          {
            date: '2025-03-23',
            type: 'Phishing Attempt',
            contract: '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
            severity: 'CRITICAL'
          },
          {
            date: '2025-03-22',
            type: 'Malicious Contract',
            contract: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
            severity: 'HIGH'
          }
        ]
      },
      protected: {
        value: 12800000, // $12.8M
        transactions: 36542,
        users: 8240
      },
      mev: {
        saved: 128.5, // ETH
        transactions: 1528,
        byType: {
          sandwichAttack: 942,
          frontrunning: 586
        }
      }
    };
  
    return new Response(
      JSON.stringify(mockReportData),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  export async function POST(req) {
    try {
      const { txHash, reportType, details } = await req.json();
      
      if (!txHash || !reportType) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: txHash and reportType' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Mock successful report submission
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Report submitted successfully',
          reportId: `report-${Date.now()}`
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to submit report',
          message: error.message || 'Unknown error'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }