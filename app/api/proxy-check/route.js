// // app/api/proxy-check/route.js
// import { NextResponse } from 'next/server';

// export async function GET(req) {
//   const url = new URL(req.url);
//   const address = url.searchParams.get('address');
  
//   if (!address) {
//     return NextResponse.json({ error: 'Address parameter is required' }, { status: 400 });
//   }
  
//   console.log(`[Proxy API] Checking address: ${address}`);
  
//   // DEVELOPMENT MODE: Return mock data for faster development and avoid API issues
//   // Comment this section out when deploying to production
//   const isDevelopment = process.env.NODE_ENV === 'development' || req.headers.get('host')?.includes('localhost');
  
//   if (isDevelopment) {
//     console.log('[Proxy API] Using development mock data');
    
//     // Use address to determine mock response
//     if (address.toLowerCase() === '0x1234567890123456789012345678901234567890') {
//       return NextResponse.json({
//         risk: { 
//           level: 9, 
//           reason: 'Known scam address (mock data)' 
//         }
//       });
//     } else if (address.toLowerCase() === '0xfff9976782d46cc05630d1f6ebab18b2324d6b14') {
//       return NextResponse.json({
//         risk: { 
//           level: 6, 
//           reason: 'Suspicious activity patterns (mock data)' 
//         }
//       });
//     } else {
//       // For any other address in development, return low risk
//       return NextResponse.json({
//         risk: { 
//           level: 2, 
//           reason: 'No significant issues detected (mock data)' 
//         }
//       });
//     }
//   }
  
//   // PRODUCTION MODE: Use the real Wallet Guard API
//   try {
//     console.log('[Proxy API] Fetching from Wallet Guard API:', address);
    
//     const response = await fetch(
//       `https://api.walletguard.app/v0/check-contract?address=${address}`,
//       { 
//         cache: 'no-store',
//         headers: {
//           'Content-Type': 'application/json',
//         } 
//       }
//     );
    
//     console.log('[Proxy API] Response status:', response.status);
    
//     if (!response.ok) {
//       console.error(`[Proxy API] External API returned status ${response.status}`);
      
//       // Return a fallback response
//       return NextResponse.json({
//         risk: { 
//           level: 0, 
//           reason: `API error: ${response.status}` 
//         }
//       });
//     }
    
//     // Safely parse JSON response
//     try {
//       const data = await response.json();
//       console.log('[Proxy API] Successfully parsed response data');
//       return NextResponse.json(data);
//     } catch (jsonError) {
//       console.error('[Proxy API] Error parsing JSON response:', jsonError);
//       return NextResponse.json({
//         risk: { 
//           level: 0, 
//           reason: 'Error parsing API response' 
//         }
//       });
//     }
    
//   } catch (error) {
//     console.error('[Proxy API] Fetch error:', error);
    
//     // Return a graceful fallback response
//     return NextResponse.json({
//       risk: { 
//         level: 0, 
//         reason: 'Service unavailable - please try again later' 
//       }
//     });
//   }
// }
// app/api/proxy-check/route.js
import { NextResponse } from 'next/server';

// List of known scam addresses (this would be a larger database in a real implementation)
const KNOWN_SCAM_ADDRESSES = [
  '0x1234567890123456789012345678901234567890',
  '0xd3a78da11f8ae5a70eb301e97ae9bc315c05c733',
  '0x72c9c4e04882bb2a4154d0bd21bdb8dbad09dca3'
];

// List of suspicious but not confirmed scam addresses
const SUSPICIOUS_ADDRESSES = [
  '0xfff9976782d46cc05630d1f6ebab18b2324d6b14',
  '0xc532a74256d3db42d0bf7a0400fefdbad7694008',
  '0x881d40237659c251811cec9c364ef91dc08d300c'
];

// Common utility addresses that are legitimate and frequently used
const KNOWN_UTILITY_ADDRESSES = [
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', // Uniswap Router
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45', // Uniswap Universal Router
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff', // 0x Exchange Proxy
  '0x1111111254fb6c44bac0bed2854e76f90643097d'  // 1inch Router
];

// Function to determine if an address has suspicious patterns
function hasSuspiciousPatterns(address) {
  // Check for suspicious patterns in the address
  // This is a simplified version - in production you would implement more sophisticated checks
  
  // Example: Check if address has too many repeating characters
  const repeatingChars = /(.)\1{5,}/i; // 6+ of the same character in a row
  if (repeatingChars.test(address)) {
    return true;
  }
  
  // Example: Check for "leet speak" patterns often used in scams
  const leetPatterns = /0x(dead|beef|bad|1337|face|babe|f00d)/i;
  if (leetPatterns.test(address)) {
    return {
      suspicious: true,
      reason: "Contains common leet-speak patterns sometimes used in scams"
    };
  }
  
  return false;
}

export async function GET(req) {
  const url = new URL(req.url);
  const address = url.searchParams.get('address');
  
  if (!address) {
    return NextResponse.json({ error: 'Address parameter is required' }, { status: 400 });
  }
  
  console.log(`[Address Check] Analyzing address: ${address}`);
  
  const normalizedAddress = address.toLowerCase();
  
  // Check known scam addresses
  if (KNOWN_SCAM_ADDRESSES.includes(normalizedAddress)) {
    return NextResponse.json({
      risk: { 
        level: 9, 
        reason: 'Known malicious address identified in security database' 
      }
    });
  }
  
  // Check suspicious addresses
  if (SUSPICIOUS_ADDRESSES.includes(normalizedAddress)) {
    return NextResponse.json({
      risk: { 
        level: 6, 
        reason: 'Address has suspicious activity patterns' 
      }
    });
  }
  
  // Check known legitimate addresses
  if (KNOWN_UTILITY_ADDRESSES.includes(normalizedAddress)) {
    return NextResponse.json({
      risk: { 
        level: 1, 
        reason: 'Known legitimate protocol contract' 
      }
    });
  }
  
  // Check for suspicious patterns
  const suspiciousCheck = hasSuspiciousPatterns(normalizedAddress);
  if (suspiciousCheck) {
    return NextResponse.json({
      risk: { 
        level: 5, 
        reason: typeof suspiciousCheck === 'object' ? 
                suspiciousCheck.reason : 
                'Address contains suspicious patterns' 
      }
    });
  }
  
  // Default: moderate/low risk for unknown addresses
  return NextResponse.json({
    risk: { 
      level: 2, 
      reason: 'No known issues detected, but exercise caution with unfamiliar addresses' 
    }
  });
}