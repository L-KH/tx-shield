// components/TransactionHistory.tsx
import React, { useState, useEffect } from 'react';
import { 
  Check, 
  X, 
  AlertTriangle, 
  Shield, 
  ArrowUpRight, 
  Clock,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter
} from 'lucide-react';
import { Transaction } from '@/lib/hooks/useBlockchainData';
import { BLOCK_EXPLORERS } from '@/lib/blockchain/network';
import useMetaMask from '@/lib/hooks/useMetaMask';

// Function to format date
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
};

// Function to truncate address
const truncateAddress = (address: string): string => {
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

// Function to determine transaction type from data
const determineTransactionType = (data: string): string => {
  if (!data || data === '0x') return 'ETH Transfer';
  
  // Extract function signature (first 10 characters)
  const signature = data.substring(0, 10).toLowerCase();
  
  switch (signature) {
    case '0xa9059cbb': return 'Token Transfer';
    case '0x095ea7b3': return 'Token Approval';
    case '0x23b872dd': return 'Token TransferFrom';
    case '0x38ed1739': return 'Swap Tokens';
    case '0x7ff36ab5': return 'Swap ETH for Tokens';
    case '0x18cbafe5': return 'Swap Tokens for ETH';
    case '0xfb3bdb41': return 'Swap ETH for Exact Tokens';
    case '0x4a25d94a': return 'Swap Tokens for Exact ETH';
    case '0x8803dbee': return 'Swap Tokens for Exact Tokens';
    case '0x2e1a7d4d': return 'Withdraw ETH';
    case '0xd0e30db0': return 'Deposit ETH';
    default: return 'Contract Interaction';
  }
};

// Interface for the component props
interface TransactionHistoryProps {
  transactions: Transaction[];
  loading: boolean;
  onRefresh: () => void;
  onPageChange?: (page: number) => void;
  className?: string;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  loading,
  onRefresh,
  onPageChange,
  className = '',
}) => {
  const { chainId } = useMetaMask();
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const itemsPerPage = 10;
  
  // Reset pagination when transactions change
  useEffect(() => {
    setCurrentPage(1);
  }, [transactions]);
  
  // Check if block explorer is available
  const blockExplorerUrl = chainId && BLOCK_EXPLORERS[chainId] ? BLOCK_EXPLORERS[chainId] : '';
  
  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    // Filter by search term (address)
    const matchesSearch = filter === '' || 
      tx.target.toLowerCase().includes(filter.toLowerCase()) ||
      determineTransactionType(tx.data).toLowerCase().includes(filter.toLowerCase());
    
    // Filter by status
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'success' && tx.success) ||
      (statusFilter === 'failed' && !tx.success);
    
    // Filter by type
    const txType = determineTransactionType(tx.data);
    const matchesType = typeFilter === 'all' || txType.toLowerCase().includes(typeFilter.toLowerCase());
    
    return matchesSearch && matchesStatus && matchesType;
  });
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (onPageChange) {
      onPageChange(page);
    }
  };
  
  // Get unique transaction types for filter dropdown
  const transactionTypes = ['all', ...new Set(transactions.map(tx => 
    determineTransactionType(tx.data).toLowerCase()
  ))];
  
  // Determine risk badge color based on threat level
  const getRiskBadgeColor = (threatLevel: string) => {
    switch (threatLevel.toUpperCase()) {
      case 'CRITICAL': return 'bg-red-700';
      case 'HIGH': return 'bg-red-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-green-500';
      case 'SAFE': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };
  
  // Empty state
  if (!loading && transactions.length === 0) {
    return (
      <div className={`bg-gray-800 p-6 rounded-lg ${className}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium">Transaction History</h2>
          <button 
            onClick={onRefresh}
            className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
        
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Shield size={48} className="text-gray-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">No transactions found</h3>
          <p className="text-gray-400 mb-4">You haven't made any transactions yet with TX Shield.</p>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex items-center"
          >
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`bg-gray-800 p-6 rounded-lg ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-medium">Transaction History</h2>
        <button 
          onClick={onRefresh}
          className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors"
          title="Refresh"
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      
      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="flex-grow flex items-center bg-gray-700 rounded-md">
          <Search size={18} className="ml-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by address or transaction type"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full px-3 py-2 bg-transparent outline-none"
          />
        </div>
        
        <div className="flex items-center">
          <Filter size={16} className="mr-2 text-gray-400" />
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="mr-2 px-3 py-2 rounded-md bg-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-md bg-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            {transactionTypes.map((type, index) => (
              <option key={index} value={type}>
                {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Transactions table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="text-left text-gray-400 text-sm border-b border-gray-700">
                <tr>
                  <th className="pb-3 pr-4">Transaction</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Value</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Risk</th>
                  <th className="pb-3 pr-4">Time</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {paginatedTransactions.map((tx, index) => (
                  <tr 
                    key={index} 
                    className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="py-4 pr-4">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center mr-3">
                          {tx.success ? (
                            <ArrowUpRight size={16} />
                          ) : (
                            <X size={16} className="text-red-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">
                            {tx.hash ? truncateAddress(tx.hash) : `TX-${index}`}
                          </div>
                          <div className="text-gray-400 text-xs">
                            To: {truncateAddress(tx.target)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      {determineTransactionType(tx.data)}
                    </td>
                    <td className="py-4 pr-4">
                      {tx.value ? `${tx.value} ETH` : '-'}
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex items-center">
                        {tx.success ? (
                          <>
                            <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                            <span>Success</span>
                          </>
                        ) : (
                          <>
                            <div className="h-2 w-2 rounded-full bg-red-500 mr-2"></div>
                            <span>Failed</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${getRiskBadgeColor(tx.threatLevel)}`}>
                        {tx.threatLevel || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex items-center">
                        <Clock size={14} className="mr-2" />
                        {formatDate(tx.timestamp)}
                      </div>
                    </td>
                    <td className="py-4 text-right">
                      {blockExplorerUrl && tx.hash && (
                        <a
                          href={`${blockExplorerUrl}/tx/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors"
                          title="View on Block Explorer"
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-400">
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} transactions
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-md ${
                    currentPage === 1 ? 'text-gray-500 cursor-not-allowed' : 'text-white hover:bg-gray-700'
                  }`}
                >
                  <ChevronLeft size={18} />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => 
                    page === 1 || 
                    page === totalPages || 
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  )
                  .map((page, index, array) => (
                    <React.Fragment key={page}>
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span className="text-gray-500">...</span>
                      )}
                      <button
                        onClick={() => handlePageChange(page)}
                        className={`h-8 w-8 rounded-md flex items-center justify-center ${
                          currentPage === page 
                            ? 'bg-blue-600' 
                            : 'hover:bg-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))
                }
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-md ${
                    currentPage === totalPages ? 'text-gray-500 cursor-not-allowed' : 'text-white hover:bg-gray-700'
                  }`}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TransactionHistory;