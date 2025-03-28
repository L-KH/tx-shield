// app/components/SimulationView.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Check, 
  X, 
  Activity, 
  ArrowRight, 
  ArrowDown, 
  ChevronDown, 
  ChevronUp,
  Zap, 
  DollarSign,
  Shield,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

// Types for simulation data
interface BalanceChange {
  address: string;
  symbol: string;
  name: string;
  logo?: string;
  decimals: number;
  oldBalance: string;
  newBalance: string;
  absoluteChange: string;
  percentageChange: number;
  usdValueChange?: number;
}

interface GasEstimate {
  gasUsed: string;
  gasLimit: string;
  gasCost: string;
  gasCostUSD: number;
  optimizedGasCost?: string;
  potentialSavings?: string;
}

interface MEVExposure {
  sandwichRisk: number;
  frontrunningRisk: number;
  backrunningRisk: number;
  potentialMEVLoss: string;
  suggestedProtections: string[];
}

interface SimulationWarnings {
  highSlippage?: boolean;
  highGasUsage?: boolean;
  priceImpact?: boolean;
  mevExposure?: boolean;
  revertRisk?: boolean;
  customWarnings: string[];
}

interface SimulationResult {
  success: boolean;
  statusCode: number;
  gasEstimate: GasEstimate;
  balanceChanges: BalanceChange[];
  mevExposure?: MEVExposure;
  warnings: SimulationWarnings;
  revertReason?: string;
  logs: string[];
  visualizationData: any;
  fullTraceUrl?: string;
  blockExplorerPreview?: string;
  simulationId: string;
}

interface SimulationViewProps {
  data: SimulationResult;
  isLoading?: boolean;
  onViewTrace?: () => void;
}

const SimulationView: React.FC<SimulationViewProps> = ({
  data,
  isLoading = false,
  onViewTrace
}) => {
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    tokenChanges: true,
    gas: false,
    mev: false,
    warnings: false
  });

  // Toggle section visibility
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Colors for charts
  const colors = {
    primary: '#3B82F6', // blue
    success: '#10B981', // green
    warning: '#F59E0B', // amber
    danger: '#EF4444', // red
    secondary: '#8B5CF6', // purple
    background: '#1F2937', // dark gray
    chartColors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg flex items-center justify-center h-60">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mr-2"></div>
        <span className="text-lg">Simulating transaction...</span>
      </div>
    );
  }

  // Render overview section
  const renderOverview = () => {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <div 
          className="bg-gray-800 p-4 rounded-lg flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('overview')}
        >
          <h3 className="text-lg font-medium flex items-center">
            <Activity className="mr-2" size={20} />
            Simulation Overview
          </h3>
          {expandedSections.overview ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        
        {expandedSections.overview && (
          <div className="bg-gray-800 p-4 pt-0 rounded-b-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-gray-900 p-4 rounded-lg">
                <h4 className="text-sm text-gray-400 mb-2">Status</h4>
                <div className="flex items-center">
                  {data.success ? (
                    <>
                      <Check size={20} className="mr-2 text-green-500" />
                      <span className="text-green-500 font-medium">Success</span>
                    </>
                  ) : (
                    <>
                      <X size={20} className="mr-2 text-red-500" />
                      <span className="text-red-500 font-medium">Failed</span>
                    </>
                  )}
                </div>
                {!data.success && data.revertReason && (
                  <div className="mt-2 text-sm text-red-400">
                    Reason: {data.revertReason}
                  </div>
                )}
              </div>
              
              <div className="bg-gray-900 p-4 rounded-lg">
                <h4 className="text-sm text-gray-400 mb-2">Gas Used</h4>
                <div className="text-xl font-bold">
                  {parseInt(data.gasEstimate.gasUsed).toLocaleString()}
                  <span className="text-sm text-gray-400 ml-1">units</span>
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  Est. Cost: {parseFloat(data.gasEstimate.gasCost).toFixed(6)} ETH 
                  (${data.gasEstimate.gasCostUSD.toFixed(2)})
                </div>
              </div>
              
              <div className="bg-gray-900 p-4 rounded-lg">
                <h4 className="text-sm text-gray-400 mb-2">Balance Changes</h4>
                <div className="text-xl font-bold">
                  {data.balanceChanges.length}
                  <span className="text-sm text-gray-400 ml-1">tokens affected</span>
                </div>
                {data.balanceChanges.length > 0 && (
                  <div className="text-sm text-gray-400 mt-1">
                    Including {data.balanceChanges.filter(c => c.symbol === 'ETH').length > 0 ? 'ETH' : 'no ETH'}
                  </div>
                )}
              </div>
            </div>

            {/* Warnings summary */}
            {data.warnings && data.warnings.customWarnings.length > 0 && (
              <div className="mt-4 bg-red-900/30 p-3 rounded-lg">
                <div className="flex items-start">
                  <AlertTriangle size={18} className="mr-2 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-red-400 mb-1">Warnings Detected</h4>
                    <ul className="text-xs text-gray-300 space-y-1">
                      {data.warnings.customWarnings.map((warning, i) => (
                        <li key={i} className="flex items-start">
                          <span className="mr-1">•</span>
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  // Render token changes section
  const renderTokenChanges = () => {
    if (data.balanceChanges.length === 0) return null;
    
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mb-6"
      >
        <div 
          className="bg-gray-800 p-4 rounded-lg flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('tokenChanges')}
        >
          <h3 className="text-lg font-medium flex items-center">
            <ArrowRight className="mr-2" size={20} />
            Token Balance Changes
          </h3>
          {expandedSections.tokenChanges ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        
        {expandedSections.tokenChanges && (
          <div className="bg-gray-800 p-4 pt-0 rounded-b-lg">
            {/* Token changes chart */}
            <div className="mt-4 bg-gray-900 p-4 rounded-lg">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={data.balanceChanges.map(change => ({
                    name: change.symbol,
                    value: parseFloat(change.absoluteChange),
                    percentChange: change.percentageChange,
                    usdValue: change.usdValueChange || 0
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={50} 
                    stroke="#9CA3AF"
                  />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    formatter={(value: any) => {
                      // Ensure value is a number before using toFixed
                      const numValue = typeof value === 'number' ? value : parseFloat(String(value));
                      return [isNaN(numValue) ? '0.00' : numValue.toFixed(6), 'Amount'];
                    }}
                    labelFormatter={(value) => `Token: ${value}`}
                    contentStyle={{ backgroundColor: '#374151', borderColor: '#4B5563' }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="value" 
                    fill={colors.primary} 
                    name="Token Amount"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Token changes table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-700">
                    <th className="pb-2 pr-4">Token</th>
                    <th className="pb-2 pr-4">Old Balance</th>
                    <th className="pb-2 pr-4">New Balance</th>
                    <th className="pb-2 pr-4">Change</th>
                    <th className="pb-2">USD Value</th>
                  </tr>
                </thead>
                <tbody>
                  {data.balanceChanges.map((change, i) => (
                    <tr key={i} className="border-b border-gray-700">
                      <td className="py-3 pr-4">
                        <div className="flex items-center">
                          {change.logo ? (
                            <img src={change.logo} alt={change.symbol} className="w-5 h-5 mr-2 rounded-full" />
                          ) : (
                            <div className="w-5 h-5 bg-gray-700 rounded-full mr-2 flex items-center justify-center text-xs">
                              {change.symbol.charAt(0)}
                            </div>
                          )}
                          <span className="font-medium">{change.symbol}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        {parseFloat(change.oldBalance).toFixed(change.symbol === 'ETH' ? 6 : 2)}
                      </td>
                      <td className="py-3 pr-4">
                        {parseFloat(change.newBalance).toFixed(change.symbol === 'ETH' ? 6 : 2)}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={parseFloat(change.absoluteChange) >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {parseFloat(change.absoluteChange) >= 0 ? '+' : ''}
                          {parseFloat(change.absoluteChange).toFixed(change.symbol === 'ETH' ? 6 : 2)}
                          {' '}
                          ({change.percentageChange >= 0 ? '+' : ''}
                          {change.percentageChange.toFixed(2)}%)
                        </span>
                      </td>
                      <td className="py-3">
                        {change.usdValueChange !== undefined ? (
                          <span className={change.usdValueChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                            {change.usdValueChange >= 0 ? '+' : ''}
                            ${Math.abs(change.usdValueChange).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-500">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  // Render gas details section
  const renderGasDetails = () => {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="mb-6"
      >
        <div 
          className="bg-gray-800 p-4 rounded-lg flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('gas')}
        >
          <h3 className="text-lg font-medium flex items-center">
            <Zap className="mr-2" size={20} />
            Gas Details
          </h3>
          {expandedSections.gas ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        
        {expandedSections.gas && (
          <div className="bg-gray-800 p-4 pt-0 rounded-b-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-gray-900 p-4 rounded-lg">
                <h4 className="text-sm text-gray-400 mb-2">Gas Usage</h4>
                <div className="flex items-center mb-2">
                  <div className="text-xl font-bold mr-3">
                    {parseInt(data.gasEstimate.gasUsed).toLocaleString()}
                  </div>
                  <div className="w-full bg-gray-700 h-3 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full" 
                      style={{ 
                        width: `${(parseInt(data.gasEstimate.gasUsed) / parseInt(data.gasEstimate.gasLimit)) * 100}%` 
                      }}
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-400">
                  of {parseInt(data.gasEstimate.gasLimit).toLocaleString()} gas limit
                  ({((parseInt(data.gasEstimate.gasUsed) / parseInt(data.gasEstimate.gasLimit)) * 100).toFixed(1)}%)
                </div>
              </div>
              
              <div className="bg-gray-900 p-4 rounded-lg">
                <h4 className="text-sm text-gray-400 mb-2">Gas Cost</h4>
                <div className="text-xl font-bold mb-1">
                  {parseFloat(data.gasEstimate.gasCost).toFixed(6)} ETH
                </div>
                <div className="text-sm text-gray-400 flex items-center">
                  <DollarSign size={14} className="mr-1" />
                  ${data.gasEstimate.gasCostUSD.toFixed(2)} USD
                </div>
                
                {data.gasEstimate.optimizedGasCost && (
                  <div className="mt-2 text-xs">
                    <span className="text-green-500">
                      Potential savings: {data.gasEstimate.potentialSavings} ETH
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {data.warnings?.highGasUsage && (
              <div className="mt-4 bg-yellow-900/30 p-3 rounded-lg">
                <div className="flex items-start">
                  <AlertTriangle size={18} className="mr-2 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-400">High Gas Usage Warning</h4>
                    <p className="text-xs text-gray-300 mt-1">
                      This transaction uses more gas than typical transactions of this type.
                      Consider optimizing your transaction or waiting for lower network congestion.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  // Render MEV exposure section
  const renderMEVExposure = () => {
    if (!data.mevExposure) return null;
    
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="mb-6"
      >
        <div 
          className="bg-gray-800 p-4 rounded-lg flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('mev')}
        >
          <h3 className="text-lg font-medium flex items-center">
            <Shield className="mr-2" size={20} />
            MEV Exposure Analysis
          </h3>
          {expandedSections.mev ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        
        {expandedSections.mev && (
          <div className="bg-gray-800 p-4 pt-0 rounded-b-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-gray-900 p-4 rounded-lg">
                <h4 className="text-sm text-gray-400 mb-2">Sandwich Attack Risk</h4>
                <div className="flex items-center mb-2">
                  <div className="w-full bg-gray-700 h-3 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: `${data.mevExposure.sandwichRisk}%`,
                        backgroundColor: data.mevExposure.sandwichRisk > 70 ? colors.danger :
                          data.mevExposure.sandwichRisk > 40 ? colors.warning : colors.success
                      }}
                    />
                  </div>
                  <span className="ml-2 text-sm">{data.mevExposure.sandwichRisk}%</span>
                </div>
                <p className="text-xs text-gray-400">
                  Risk of price manipulation before and after your swap
                </p>
              </div>
              
              <div className="bg-gray-900 p-4 rounded-lg">
                <h4 className="text-sm text-gray-400 mb-2">Frontrunning Risk</h4>
                <div className="flex items-center mb-2">
                  <div className="w-full bg-gray-700 h-3 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: `${data.mevExposure.frontrunningRisk}%`,
                        backgroundColor: data.mevExposure.frontrunningRisk > 70 ? colors.danger :
                          data.mevExposure.frontrunningRisk > 40 ? colors.warning : colors.success
                      }}
                    />
                  </div>
                  <span className="ml-2 text-sm">{data.mevExposure.frontrunningRisk}%</span>
                </div>
                <p className="text-xs text-gray-400">
                  Risk of transactions executing before yours
                </p>
              </div>
              
              <div className="bg-gray-900 p-4 rounded-lg">
                <h4 className="text-sm text-gray-400 mb-2">Potential MEV Loss</h4>
                <div className="text-xl font-bold text-red-500 mb-1">
                  ~ {data.mevExposure.potentialMEVLoss} ETH
                </div>
                <p className="text-xs text-gray-400">
                  Estimated value that could be extracted
                </p>
              </div>
            </div>
            
            {data.mevExposure.suggestedProtections.length > 0 && (
              <div className="mt-4 bg-gray-900 p-4 rounded-lg">
                <h4 className="text-sm text-gray-400 mb-2">Suggested Protections</h4>
                <ul className="space-y-2">
                  {data.mevExposure.suggestedProtections.map((protection, i) => (
                    <li key={i} className="flex items-start">
                      <Shield size={16} className="text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{protection}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  // Render warnings section
  const renderWarnings = () => {
    if (!data.warnings || data.warnings.customWarnings.length === 0) return null;
    
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="mb-6"
      >
        <div 
          className="bg-gray-800 p-4 rounded-lg flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('warnings')}
        >
          <h3 className="text-lg font-medium flex items-center">
            <AlertTriangle className="mr-2" size={20} />
            Transaction Warnings
          </h3>
          {expandedSections.warnings ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        
        {expandedSections.warnings && (
          <div className="bg-gray-800 p-4 pt-0 rounded-b-lg">
            <div className="space-y-3 mt-4">
              {data.warnings.customWarnings.map((warning, i) => (
                <div key={i} className="bg-gray-900 p-3 rounded-lg flex items-start">
                  <AlertTriangle size={18} className="text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm">{warning}</p>
                  </div>
                </div>
              ))}
              
              {data.warnings.highSlippage && (
                <div className="bg-gray-900 p-3 rounded-lg flex items-start">
                  <AlertTriangle size={18} className="text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium mb-1">High Slippage Detected</h4>
                    <p className="text-sm text-gray-400">
                      Your transaction may result in significant price slippage. Consider using a more liquid trading pair or reducing your transaction size.
                    </p>
                  </div>
                </div>
              )}
              
              {data.warnings.priceImpact && (
                <div className="bg-gray-900 p-3 rounded-lg flex items-start">
                  <AlertTriangle size={18} className="text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium mb-1">High Price Impact</h4>
                    <p className="text-sm text-gray-400">
                      Your transaction will significantly impact the market price. Consider breaking it into smaller transactions.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      {renderOverview()}
      {renderTokenChanges()}
      {renderGasDetails()}
      {renderMEVExposure()}
      {renderWarnings()}
      
      {/* View full trace button */}
      {data.fullTraceUrl && (
        <div className="text-center">
          <a
            href={data.fullTraceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            <ExternalLink size={16} className="mr-2" />
            View Full Transaction Trace
          </a>
        </div>
      )}
    </div>
  );
};

export default SimulationView;