'use client';

import React, { useState } from 'react';

export default function ApiTestPage() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [endpoint, setEndpoint] = useState<string>('/api/test');

  const testApi = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transaction: {
            to: '0x1234567890123456789012345678901234567890',
            data: '0x095ea7b30000000000000000000000004648a43b2c14da09fdf38bb7cf8ff5ba58f95b9fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
            value: '0',
            from: '0x0987654321098765432109876543210987654321',
            chainId: 1
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('API test error:', error);
      setError(error instanceof Error ? error.message : String(error));
      setResult('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">API Test Tool</h1>

      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-1">API Endpoint</label>
        <div className="flex">
          <input
            type="text"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 rounded-l-md focus:outline-none"
          />
          <button
            onClick={testApi}
            disabled={loading}
            className={`px-4 py-2 rounded-r-md ${
              loading ? 'bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Testing...' : 'Test API'}
          </button>
        </div>
      </div>

      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setEndpoint('/api/test')}
          className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-md text-sm"
        >
          Test API
        </button>
        <button
          onClick={() => setEndpoint('/api/threat-check')}
          className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-md text-sm"
        >
          Threat Check
        </button>
        <button
          onClick={() => setEndpoint('/api/simulate')}
          className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-md text-sm"
        >
          Simulate
        </button>
        <button
          onClick={() => setEndpoint('/api/alternatives')}
          className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-md text-sm"
        >
          Alternatives
        </button>
      </div>

      {error && (
        <div className="bg-red-900/40 p-4 rounded-md mb-6">
          <h2 className="text-lg font-medium text-red-400 mb-2">Error</h2>
          <pre className="text-sm bg-red-900/30 p-3 rounded overflow-x-auto">{error}</pre>
        </div>
      )}

      {result && (
        <div className="bg-gray-800 p-4 rounded-md">
          <h2 className="text-lg font-medium mb-2">API Response</h2>
          <pre className="text-sm bg-gray-900 p-3 rounded overflow-x-auto">{result}</pre>
        </div>
      )}
    </div>
  );
}