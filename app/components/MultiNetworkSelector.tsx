// components/MultiNetworkSelector.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Shield, AlertTriangle, Check, ExternalLink, Info, ChevronDown, Settings } from 'lucide-react';
import { CHAIN_ID, NETWORK_NAMES, BLOCK_EXPLORERS } from '@/lib/blockchain/network';
import { CONTRACT_ADDRESSES } from '@/lib/blockchain/contractService';
import useMetaMask from '@/lib/hooks/useMetaMask';

// Network details interface
interface NetworkDetail {
  id: number;
  name: string;
  icon?: string; // Path to network icon
  isSupported: boolean;
  isTXShieldAvailable: boolean;
  blockExplorer: string;
  description?: string;
  testnet: boolean;
}

interface MultiNetworkSelectorProps {
  className?: string;
  expanded?: boolean;
  onNetworkChange?: (chainId: number) => void;
}

const MultiNetworkSelector: React.FC<MultiNetworkSelectorProps> = ({
  className = '',
  expanded = false,
  onNetworkChange
}) => {
  const { 
    chainId, 
    networkName, 
    connect,
    account,
    switchToLinea
  } = useMetaMask();
  
  // Local state
  const [showNetworkList, setShowNetworkList] = useState(expanded);
  const [networkDetails, setNetworkDetails] = useState<NetworkDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Manually determine if we're on the correct network
  const isCorrectNetwork = chainId === CHAIN_ID.LINEA;
  
  // Network icons - in a real app, import actual image files
  const getNetworkIcon = (networkId: number): string => {
    switch (networkId) {
      case CHAIN_ID.MAINNET:
        return '/icons/ethereum.svg';
      case CHAIN_ID.LINEA:
        return '/icons/sepolia.svg';
      case CHAIN_ID.POLYGON:
        return '/icons/polygon.svg';
      case CHAIN_ID.ARBITRUM:
        return '/icons/arbitrum.svg';
      default:
        return '/icons/network.svg';
    }
  };
  
  // Build network details
  useEffect(() => {
    const networks: NetworkDetail[] = [
      { 
        id: CHAIN_ID.MAINNET, 
        name: NETWORK_NAMES[CHAIN_ID.MAINNET], 
        icon: getNetworkIcon(CHAIN_ID.MAINNET),
        isSupported: true,
        isTXShieldAvailable: CONTRACT_ADDRESSES.TXShield[CHAIN_ID.MAINNET] !== '0x0000000000000000000000000000000000000000',
        blockExplorer: BLOCK_EXPLORERS[CHAIN_ID.MAINNET],
        description: 'Main Ethereum network',
        testnet: false
      },
      {
        id: CHAIN_ID.LINEA, 
        name: NETWORK_NAMES[CHAIN_ID.LINEA], 
        icon: getNetworkIcon(CHAIN_ID.LINEA),
        isSupported: true,
        isTXShieldAvailable: CONTRACT_ADDRESSES.TXShield[CHAIN_ID.LINEA] !== '0x0000000000000000000000000000000000000000',
        blockExplorer: BLOCK_EXPLORERS[CHAIN_ID.LINEA],
        description: 'Ethereum testnet',
        testnet: true
      },
      {
        id: CHAIN_ID.POLYGON, 
        name: NETWORK_NAMES[CHAIN_ID.POLYGON], 
        icon: getNetworkIcon(CHAIN_ID.POLYGON),
        isSupported: true,
        isTXShieldAvailable: CONTRACT_ADDRESSES.TXShield[CHAIN_ID.POLYGON] !== '0x0000000000000000000000000000000000000000',
        blockExplorer: BLOCK_EXPLORERS[CHAIN_ID.POLYGON],
        description: 'Polygon PoS Chain',
        testnet: false
      },
      {
        id: CHAIN_ID.ARBITRUM, 
        name: NETWORK_NAMES[CHAIN_ID.ARBITRUM], 
        icon: getNetworkIcon(CHAIN_ID.ARBITRUM),
        isSupported: true,
        isTXShieldAvailable: CONTRACT_ADDRESSES.TXShield[CHAIN_ID.ARBITRUM] !== '0x0000000000000000000000000000000000000000',
        blockExplorer: BLOCK_EXPLORERS[CHAIN_ID.ARBITRUM],
        description: 'Arbitrum L2 network',
        testnet: false
      }
    ];
    
    setNetworkDetails(networks);
  }, []);
  
  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNetworkList(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Get current network details
  const getCurrentNetwork = () => {
    return networkDetails.find(network => network.id === chainId) || {
      id: chainId || 0,
      name: networkName || 'Unknown Network',
      isSupported: false,
      isTXShieldAvailable: false,
      blockExplorer: '',
      testnet: false
    };
  };
  
  // Handle network switch - using switchToSepolia for now
  const handleSwitchNetwork = async () => {
    if (!account) {
      try {
        await connect();
      } catch (error) {
        console.error('Failed to connect wallet:', error);
        return;
      }
    }
    
    setIsLoading(true);
    try {
      await switchToLinea();
      setShowNetworkList(false);
      if (onNetworkChange) {
        onNetworkChange(CHAIN_ID.LINEA);
      }
    } catch (error) {
      console.error('Failed to switch network:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Open block explorer for current network
  const openBlockExplorer = () => {
    const network = getCurrentNetwork();
    if (network.blockExplorer) {
      window.open(network.blockExplorer, '_blank');
    }
  };

  // Simple network selector (non-expanded view)
  if (!expanded && !showNetworkList) {
    const currentNetwork = getCurrentNetwork();
    
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <div 
          className={`flex items-center px-4 py-2 rounded-lg cursor-pointer border ${
            isCorrectNetwork ? 'border-gray-700 bg-gray-800 hover:bg-gray-700' : 'border-yellow-600 bg-yellow-700/20 hover:bg-yellow-700/30'
          }`}
          onClick={() => setShowNetworkList(true)}
        >
          {currentNetwork.icon ? (
            <img src={currentNetwork.icon} alt={currentNetwork.name} className="h-5 w-5 mr-2" />
          ) : (
            <div className="h-5 w-5 rounded-full bg-gray-600 mr-2"></div>
          )}
          
          <span className="mr-1">{currentNetwork.name}</span>
          
          {!isCorrectNetwork && (
            <AlertTriangle size={16} className="text-yellow-500 ml-1" />
          )}
          
          {currentNetwork.isTXShieldAvailable && (
            <Shield size={16} className="text-green-500 ml-1" />
          )}
          
          <ChevronDown size={16} className="ml-auto" />
        </div>
      </div>
    );
  }
  
  // Full network selector view
  return (
    <div className={`${className}`} ref={dropdownRef}>
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-medium">Select Network</h3>
          <p className="text-sm text-gray-400 mt-1">
            Connect to a network to interact with TX Shield
          </p>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          <div className="p-2">
            {networkDetails.map((network) => (
              <div 
                key={network.id}
                className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                  chainId === network.id
                    ? 'bg-blue-900/30 border border-blue-700'
                    : 'hover:bg-gray-700'
                }`}
                onClick={() => handleSwitchNetwork()}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {network.icon ? (
                      <img src={network.icon} alt={network.name} className="h-8 w-8 mr-3" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center mr-3">
                        <span className="text-xs">{network.name.slice(0, 2)}</span>
                      </div>
                    )}
                    
                    <div>
                      <div className="font-medium flex items-center">
                        {network.name}
                        {network.testnet && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-gray-700 rounded-full">
                            Testnet
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400">{network.description}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    {network.isTXShieldAvailable ? (
                      <div className="mr-2 px-2 py-1 text-xs bg-green-900/50 text-green-400 rounded-full flex items-center">
                        <Shield size={12} className="mr-1" />
                        Protected
                      </div>
                    ) : (
                      <div className="mr-2 px-2 py-1 text-xs bg-gray-700 text-gray-400 rounded-full flex items-center">
                        <Info size={12} className="mr-1" />
                        Not Available
                      </div>
                    )}
                    
                    {chainId === network.id && (
                      <Check size={20} className="text-green-500" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {chainId && (
          <div className="flex items-center justify-between p-4 border-t border-gray-700 bg-gray-900/50">
            <div className="text-sm text-gray-400">
              Currently connected to <span className="font-medium text-white">{getCurrentNetwork().name}</span>
            </div>
            
            {getCurrentNetwork().blockExplorer && (
              <button
                onClick={openBlockExplorer}
                className="flex items-center text-blue-400 hover:text-blue-300 transition-colors text-sm"
              >
                Block Explorer
                <ExternalLink size={14} className="ml-1" />
              </button>
            )}
          </div>
        )}
        
        {isLoading && (
          <div className="flex justify-center items-center p-4 border-t border-gray-700">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-sm">Switching network...</span>
          </div>
        )}
        
        {/* Custom network button */}
        <div className="p-4 border-t border-gray-700">
          <button 
            className="w-full flex items-center justify-center px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
            onClick={() => setShowNetworkList(false)}
          >
            <Settings size={16} className="mr-2" />
            Advanced Networks
          </button>
        </div>
      </div>
    </div>
  );
};

export default MultiNetworkSelector;