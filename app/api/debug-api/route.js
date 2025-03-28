// Super simple route for testing API functionality
export async function GET() {
    return new Response('{"status":"API is working"}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  export async function POST() {
    // No parsing of the request body, just return a fixed response
    return new Response('{"message":"POST endpoint is working","timestamp":"' + new Date().toISOString() + '"}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }