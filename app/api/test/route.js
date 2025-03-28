// app/api/test/route.js - Extremely Basic
export async function GET() {
  return new Response('{"message":"API route is working"}', {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST() {
  return new Response('{"message":"POST endpoint is working"}', {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}