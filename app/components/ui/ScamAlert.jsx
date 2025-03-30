// ScamAlert.jsx
import React from 'react';
import { AlertTriangle, Shield, ExternalLink } from 'lucide-react';

const ScamAlert = ({ scamDetails, contractAddress }) => {
  if (!scamDetails) return null;
  
  const { isScam, confidence, reason } = scamDetails;
  
  // If not flagged as a risk, don't show the component
  if (!isScam && confidence < 0.4) return null;
  
  // Determine the severity level
  const isHighRisk = isScam || confidence > 0.7;
  const isMediumRisk = !isHighRisk && confidence >= 0.4;
  
  // Set styling based on risk level
  const bgColor = isHighRisk ? 'bg-red-900/50' : isMediumRisk ? 'bg-yellow-900/50' : 'bg-gray-800';
  const textColor = isHighRisk ? 'text-red-400' : isMediumRisk ? 'text-yellow-400' : 'text-gray-300';
  const iconColor = isHighRisk ? 'text-red-500' : isMediumRisk ? 'text-yellow-500' : 'text-gray-400';
  const title = isHighRisk 
    ? '⚠️ Potential Scam Detected!' 
    : isMediumRisk 
      ? 'Suspicious Address'
      : 'Address Check';
  
  return (
    <div className={`p-4 mb-6 rounded-lg ${bgColor} border ${isHighRisk ? 'border-red-800' : isMediumRisk ? 'border-yellow-800' : 'border-gray-700'}`}>
      <div className="flex items-start">
        <div className="mr-3 flex-shrink-0">
          <AlertTriangle size={24} className={iconColor} />
        </div>
        <div className="flex-1">
          <h3 className={`text-lg font-medium ${textColor}`}>
            {title}
          </h3>
          <p className="mt-1 text-sm">
            {reason || 'This address has been flagged in our security database.'}
          </p>
          <div className="mt-2 flex items-center">
            <span className="text-sm mr-2">Risk Level:</span>
            <div className="w-32 bg-gray-700 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full ${isHighRisk ? 'bg-red-500' : isMediumRisk ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(confidence * 100, 100)}%` }}
              ></div>
            </div>
            <span className="ml-2 text-sm font-medium">{Math.round(confidence * 100)}%</span>
          </div>
          
          {contractAddress && (
            <div className="mt-2 text-sm">
              <a 
                href={`https://etherscan.io/address/${contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 flex items-center w-fit"
              >
                <ExternalLink size={14} className="mr-1" />
                Verify on Etherscan
              </a>
            </div>
          )}
        </div>
      </div>
      
      {isHighRisk && (
        <div className="mt-3 p-3 border border-red-800/50 rounded bg-red-950/30">
          <p className="text-sm font-medium text-red-400">Recommended actions:</p>
          <ul className="mt-1 text-sm space-y-1">
            <li className="flex items-start">
              <Shield size={14} className="mt-1 mr-2 flex-shrink-0 text-red-500" />
              Do NOT proceed with this transaction
            </li>
            <li className="flex items-start">
              <Shield size={14} className="mt-1 mr-2 flex-shrink-0 text-red-500" />
              Report this address to your wallet provider
            </li>
            <li className="flex items-start">
              <Shield size={14} className="mt-1 mr-2 flex-shrink-0 text-red-500" />
              Ask for help in community forums before interacting
            </li>
          </ul>
        </div>
      )}
      
      {isMediumRisk && (
        <div className="mt-3 p-3 border border-yellow-800/50 rounded bg-yellow-950/30">
          <p className="text-sm font-medium text-yellow-400">Proceed with caution:</p>
          <ul className="mt-1 text-sm space-y-1">
            <li className="flex items-start">
              <Shield size={14} className="mt-1 mr-2 flex-shrink-0 text-yellow-500" />
              Verify this address on Etherscan and in community forums
            </li>
            <li className="flex items-start">
              <Shield size={14} className="mt-1 mr-2 flex-shrink-0 text-yellow-500" />
              Consider using TX Shield secure execution for additional protection
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ScamAlert;