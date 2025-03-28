// components/BlockchainStatus.tsx
import React, { useEffect, useState } from 'react';
import { Activity, Box, Clock, Zap, Shield, RefreshCw } from 'lucide-react';
import { ethers } from 'ethers';
import { NETWORK_NAMES } from '@/lib/blockchain/network';
import { CONTRACT_ADDRESSES } from '@/lib/blockchain/contractService';
import useMetaMask from '@/lib/hooks/useMetaMask';
import useBlockchainData from '@/lib/hooks/useBlockchainData';

interface BlockchainStatusProps {
  className?: string;
  compact?: boolean;
}

const BlockchainStatus: React.FC<BlockchainStatusProps> = ({ 
  className = '',
  compact = false
}) => {
  const { chainId, networkName, getProvider } = useMetaMask();
  const provider = getProvider();
  const { blockNumber, gasPrice, refreshAllData } = useBlockchainData();
  
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Check if TX Shield is deployed on this network
  const isTXShieldDeployed = chainId ? 
    CONTRACT_ADDRESSES.TXShield[chainId] !== '0x0000000000000000000000000000000000000000' : 
    false;
  
  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshAllData();
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };
  
  // Update last updated time when block number changes
  useEffect(() => {
    if (blockNumber) {
      setLastUpdated(new Date());
    }
  }, [blockNumber]);
  
  // Format the "last updated" time
  const formatLastUpdated = () => {
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);
    
    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`;
    } else if (diffSeconds < 3600) {
      return `${Math.floor(diffSeconds / 60)}m ago`;
    } else {
      return lastUpdated.toLocaleTimeString();
    }
  };
  
  // Compact view for dashboards and sidebars
  if (compact) {
    return (
      <div className={`bg-gray-800 rounded-lg p-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`h-2 w-2 rounded-full ${blockNumber ? 'bg-green-500' : 'bg-gray-500'}`}></div>
            <span className="text-sm">
              {blockNumber ? `Block #${blockNumber.toLocaleString()}` : 'Connecting...'}
            </span>
          </div>
          
          <button 
            onClick={handleRefresh}
            className="p-1 rounded-md hover:bg-gray-700 transition-colors"
            disabled={isRefreshing}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
        
        {gasPrice && (
          <div className="flex items-center mt-2 text-xs text-gray-400">
            <Zap size={12} className="mr-1" />
            <span>{parseFloat(gasPrice).toFixed(1)} Gwei</span>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className={`bg-gray-800 p-6 rounded-lg ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-medium">Blockchain Status</h2>
        <button 
          onClick={handleRefresh}
          className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors"
          disabled={isRefreshing}
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-700 p-4 rounded-lg">
          <div className="flex items-center mb-2 text-gray-400 text-sm">
            <Activity size={16} className="mr-2" />
            Network Status
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`h-3 w-3 rounded-full ${provider ? 'bg-green-500' : 'bg-yellow-500'} mr-2`}></div>
              <span className="font-medium">{networkName}</span>
            </div>
            
            {isTXShieldDeployed ? (
              <div className="flex items-center text-green-500 text-sm">
                <Shield size={14} className="mr-1" />
                <span>TX Shield Active</span>
              </div>
            ) : (
              <div className="flex items-center text-yellow-500 text-sm">
                <Shield size={14} className="mr-1" />
                <span>TX Shield Unavailable</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-gray-700 p-4 rounded-lg">
          <div className="flex items-center mb-2 text-gray-400 text-sm">
            <Box size={16} className="mr-2" />
            Current Block
          </div>
          
          {blockNumber ? (
            <div className="flex items-center justify-between">
              <span className="font-medium">{blockNumber.toLocaleString()}</span>
              <div className="text-sm text-gray-400">
                Updated {formatLastUpdated()}
              </div>
            </div>
          ) : (
            <div className="text-gray-400">Loading...</div>
          )}
        </div>
        
        <div className="bg-gray-700 p-4 rounded-lg">
          <div className="flex items-center mb-2 text-gray-400 text-sm">
            <Zap size={16} className="mr-2" />
            Gas Price
          </div>
          
          {gasPrice ? (
            <div className="flex items-center justify-between">
              <span className="font-medium">{parseFloat(gasPrice).toFixed(1)} Gwei</span>
              
              <div className="flex items-center">
                {parseFloat(gasPrice) < 30 ? (
                  <span className="text-green-500 text-sm">Low</span>
                ) : parseFloat(gasPrice) < 60 ? (
                  <span className="text-yellow-500 text-sm">Medium</span>
                ) : (
                  <span className="text-red-500 text-sm">High</span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-gray-400">Loading...</div>
          )}
        </div>
        
        <div className="bg-gray-700 p-4 rounded-lg">
          <div className="flex items-center mb-2 text-gray-400 text-sm">
            <Clock size={16} className="mr-2" />
            TX Shield Status
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`h-3 w-3 rounded-full ${isTXShieldDeployed ? 'bg-green-500' : 'bg-yellow-500'} mr-2`}></div>
              <span className="font-medium">
                {isTXShieldDeployed ? 'Available' : 'Not Available on this Network'}
              </span>
            </div>
            
            {isTXShieldDeployed && chainId && (
              <div className="text-sm">
                {CONTRACT_ADDRESSES.TXShield[chainId].substring(0, 6)}...
                {CONTRACT_ADDRESSES.TXShield[chainId].substring(38)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockchainStatus;