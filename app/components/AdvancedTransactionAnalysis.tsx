// components/AdvancedTransactionAnalysis.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  AlertTriangle, 
  Check, 
  X, 
  Info, 
  ChevronDown, 
  ChevronUp,
  Zap,
  Unlock,
  Eye,
  Hash,
  ArrowRight
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { SecurityRiskLevel, TransactionType } from '@/lib/analysis/transaction-type-detector';
import { RecommendationType } from '@/lib/analysis/transaction-recommendations';
import InfoTooltip, { DeFiGlossary } from './ui/Tooltip';

// Types for props
interface AdvancedTransactionAnalysisProps {
  analysisResult: {
    txType: TransactionType;
    description: string;
    securityScore: number;
    riskLevel: SecurityRiskLevel;
    riskBreakdown: {
      contractSecurity: number;
      transactionSpecific: number;
      userTrust: number;
      externalFactors: number;
      implementation: number;
    };
    details: {
      tokenAddress?: string;
      spenderAddress?: string;
      isUnlimited?: boolean;
      amount?: string;
      protocol?: string;
      ethValue?: string;
      humanReadableFunctionName?: string;
    };
    flags: {
      riskFlags: string[];
      protectiveFlags: string[];
    };
    recommendations: {
      type: RecommendationType;
      title: string;
      description: string;
      actionable: boolean;
      action?: {
        type: string;
        description: string;
        data?: any;
      };
      priority: 'critical' | 'high' | 'medium' | 'low';
    }[];
  };
  onApplyRecommendation: (recommendation: any) => void;
}

const AdvancedTransactionAnalysis: React.FC<AdvancedTransactionAnalysisProps> = ({
  analysisResult,
  onApplyRecommendation
}) => {
  const [expanded, setExpanded] = useState({
    details: true,
    riskBreakdown: false,
    flags: false,
    recommendations: true
  });
  
  const toggleSection = (section: keyof typeof expanded) => {
    setExpanded(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Color mapping for risk levels
  const riskLevelColors = {
    [SecurityRiskLevel.Low]: '#10B981', // green
    [SecurityRiskLevel.Medium]: '#F59E0B', // amber
    [SecurityRiskLevel.High]: '#EF4444', // red
    [SecurityRiskLevel.Critical]: '#991B1B', // dark red
  };
  
  // Priority colors
  const priorityColors = {
    critical: '#991B1B', // dark red
    high: '#EF4444', // red
    medium: '#F59E0B', // amber
    low: '#10B981', // green
  };
  
  // Transaction type icons
  const getTransactionTypeIcon = () => {
    switch (analysisResult.txType) {
      case TransactionType.Transfer:
        return <ArrowRight size={20} />;
      case TransactionType.Approval:
      case TransactionType.UnlimitedApproval:
        return <Unlock size={20} />;
      case TransactionType.Swap:
      case TransactionType.SwapETHForTokens:
      case TransactionType.SwapTokensForETH:
      case TransactionType.SwapTokensForTokens:
        return <Zap size={20} />;
      case TransactionType.NFTTransfer:
      case TransactionType.NFTApproval:
        return <Hash size={20} />;
      default:
        return <Info size={20} />;
    }
  };
  
  // Risk score indicator
  const renderRiskScoreIndicator = () => {
    const score = analysisResult.securityScore;
    const color = riskLevelColors[analysisResult.riskLevel];
    
    return (
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <div className="relative w-20 h-20">
            <svg className="w-full h-full" viewBox="0 0 36 36">
              <path
                className="text-gray-700"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="100, 100"
              />
              <path
                className="text-current"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={color}
                strokeWidth="3"
                strokeDasharray={`${100 - score}, 100`}
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
              <text x="18" y="21" textAnchor="middle" fontSize="10" fill="white">
                {score}
              </text>
            </svg>
            <div 
              className="absolute inset-0 flex items-center justify-center text-2xl font-bold"
              style={{ color }}
            >
              {score}
            </div>
          </div>
        </div>
        
        <div>
          <div className="flex items-center">
            <h3 className="text-xl font-bold" style={{ color }}>
              {analysisResult.riskLevel} RISK
            </h3>
            <InfoTooltip
              content="Security score is calculated based on contract security, transaction parameters, and historical data. Lower score means higher risk."
              position="right"
            />
          </div>
          <p className="text-gray-400 mt-1">{analysisResult.description}</p>
        </div>
      </div>
    );
  };
  
  // Render transaction details
  const renderTransactionDetails = () => {
    return (
      <div className="bg-gray-800 rounded-lg overflow-hidden mt-6">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer bg-gray-700"
          onClick={() => toggleSection('details')}
        >
          <h3 className="text-lg font-medium flex items-center">
            {getTransactionTypeIcon()}
            <span className="ml-2">Transaction Details</span>
          </h3>
          {expanded.details ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        
        {expanded.details && (
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-900 p-4 rounded-lg">
                <h4 className="text-sm text-gray-400 mb-2">Transaction Type</h4>
                <div className="flex items-center">
                  {getTransactionTypeIcon()}
                  <span className="ml-2">{analysisResult.txType.replace(/_/g, ' ')}</span>
                </div>
                {analysisResult.details.humanReadableFunctionName && (
                  <div className="text-sm text-gray-400 mt-1">
                    Function: {analysisResult.details.humanReadableFunctionName}
                  </div>
                )}
              </div>
              
              {analysisResult.details.protocol && (
                <div className="bg-gray-900 p-4 rounded-lg">
                  <h4 className="text-sm text-gray-400 mb-2">Protocol</h4>
                  <div>{analysisResult.details.protocol}</div>
                </div>
              )}
              
              {analysisResult.details.tokenAddress && (
                <div className="bg-gray-900 p-4 rounded-lg">
                  <h4 className="text-sm text-gray-400 mb-2">Token Address</h4>
                  <div className="text-sm break-all">{analysisResult.details.tokenAddress}</div>
                </div>
              )}
              
              {analysisResult.details.spenderAddress && (
                <div className="bg-gray-900 p-4 rounded-lg">
                  <h4 className="text-sm text-gray-400 mb-2">Spender Address</h4>
                  <div className="text-sm break-all">{analysisResult.details.spenderAddress}</div>
                </div>
              )}
              
              {analysisResult.details.amount && (
                <div className="bg-gray-900 p-4 rounded-lg">
                  <h4 className="text-sm text-gray-400 mb-2">Amount</h4>
                  <div>{analysisResult.details.amount}</div>
                  {analysisResult.details.isUnlimited && (
                    <div className="text-red-500 text-sm mt-1">Unlimited Approval</div>
                  )}
                </div>
              )}
              
              {analysisResult.details.ethValue && (
                <div className="bg-gray-900 p-4 rounded-lg">
                  <h4 className="text-sm text-gray-400 mb-2">ETH Value</h4>
                  <div>{analysisResult.details.ethValue} ETH</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Render risk breakdown
  const renderRiskBreakdown = () => {
    const data = [
      { name: 'Contract Security', value: analysisResult.riskBreakdown.contractSecurity, color: '#3B82F6' },
      { name: 'Transaction Specific', value: analysisResult.riskBreakdown.transactionSpecific, color: '#10B981' },
      { name: 'User Trust', value: analysisResult.riskBreakdown.userTrust, color: '#F59E0B' },
      { name: 'External Factors', value: analysisResult.riskBreakdown.externalFactors, color: '#EF4444' },
      { name: 'Implementation', value: analysisResult.riskBreakdown.implementation, color: '#8B5CF6' }
    ];
    
    return (
      <div className="bg-gray-800 rounded-lg overflow-hidden mt-6">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer bg-gray-700"
          onClick={() => toggleSection('riskBreakdown')}
        >
          <h3 className="text-lg font-medium flex items-center">
            <Eye size={20} className="mr-2" />
            Risk Breakdown
          </h3>
          {expanded.riskBreakdown ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        
        {expanded.riskBreakdown && (
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} points`, 'Risk Score']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-4">
                {data.map((category, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: category.color }}
                        />
                        <span>{category.name}</span>
                      </div>
                      <span>{category.value} points</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="h-full rounded-full" 
                        style={{ 
                          width: `${(category.value / 25) * 100}%`,
                          backgroundColor: category.color
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Render flags
  const renderFlags = () => {
    return (
      <div className="bg-gray-800 rounded-lg overflow-hidden mt-6">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer bg-gray-700"
          onClick={() => toggleSection('flags')}
        >
          <h3 className="text-lg font-medium flex items-center">
            <AlertTriangle size={20} className="mr-2" />
            Risk Factors
          </h3>
          {expanded.flags ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        
        {expanded.flags && (
          <div className="p-4">
            <div className="space-y-4">
              {analysisResult.flags.riskFlags.length > 0 && (
                <div>
                  <h4 className="text-sm text-gray-400 mb-2">Risk Flags</h4>
                  <ul className="space-y-2">
                    {analysisResult.flags.riskFlags.map((flag, index) => (
                      <li key={index} className="flex items-start bg-red-900/20 p-3 rounded-lg">
                        <AlertTriangle size={16} className="text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>{flag}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {analysisResult.flags.protectiveFlags.length > 0 && (
                <div>
                  <h4 className="text-sm text-gray-400 mb-2">Protective Factors</h4>
                  <ul className="space-y-2">
                    {analysisResult.flags.protectiveFlags.map((flag, index) => (
                      <li key={index} className="flex items-start bg-green-900/20 p-3 rounded-lg">
                        <Check size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>{flag}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Render recommendations
  const renderRecommendations = () => {
    return (
      <div className="bg-gray-800 rounded-lg overflow-hidden mt-6">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer bg-gray-700"
          onClick={() => toggleSection('recommendations')}
        >
          <h3 className="text-lg font-medium flex items-center">
            <Shield size={20} className="mr-2" />
            Recommended Actions
          </h3>
          {expanded.recommendations ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        
        {expanded.recommendations && (
          <div className="p-4">
            <div className="space-y-4">
              {analysisResult.recommendations.map((recommendation, index) => (
                <div 
                  key={index} 
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: `${priorityColors[recommendation.priority]}20` }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center mb-1">
                        <div 
                          className="w-2 h-2 rounded-full mr-2" 
                          style={{ backgroundColor: priorityColors[recommendation.priority] }}
                        />
                        <h4 className="font-medium">{recommendation.title}</h4>
                      </div>
                      <p className="text-sm text-gray-300">{recommendation.description}</p>
                    </div>
                    
                    {recommendation.actionable && recommendation.action && (
                      <button
                        onClick={() => onApplyRecommendation(recommendation)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-md text-sm flex items-center whitespace-nowrap ml-4"
                      >
                        Apply
                        <ArrowRight size={14} className="ml-1" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      {renderRiskScoreIndicator()}
      {renderTransactionDetails()}
      {renderRiskBreakdown()}
      {renderFlags()}
      {renderRecommendations()}
    </div>
  );
};

export default AdvancedTransactionAnalysis;