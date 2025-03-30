// lib/simulation/transaction-simulation.ts
import { ethers } from 'ethers';
import axios from 'axios';

interface SimulationOptions {
  chainId: number;
  createFork?: boolean;
  forkBlockNumber?: number;
  saveFork?: boolean;
  gasPrice?: string;
  avoidRevert?: boolean;
  // Tenderly-specific options
  tenderlyApiKey?: string;
  // Experimental feature flags
  enableMEVSimulation?: boolean;
  enablePrivacyPreservingMode?: boolean;
  calculateGasOptimizations?: boolean;
}
interface StorageChange {
  old: string;
  new: string;
}

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
  sandwichRisk: number; // 0-100 scale
  frontrunningRisk: number; // 0-100 scale
  backrunningRisk: number; // 0-100 scale
  potentialMEVLoss: string; // ETH value
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

export interface SimulationResult {
  success: boolean;
  statusCode: number;
  gasEstimate: GasEstimate;
  balanceChanges: BalanceChange[];
  mevExposure?: MEVExposure;
  warnings: SimulationWarnings;
  revertReason?: string;
  logs: string[];
  visualizationData: any; // For frontend charts
  fullTraceUrl?: string; // Link to full trace explorer
  blockExplorerPreview?: string; // Preview on Etherscan
  simulationId: string;
}

// Base class for simulation providers
abstract class SimulationProvider {
  protected apiKey: string;
  protected baseUrl: string;
  
  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }
  
  abstract simulateTransaction(
    tx: ethers.providers.TransactionRequest,
    options: SimulationOptions
  ): Promise<SimulationResult>;
}

// Tenderly simulation provider
class TenderlySimulation extends SimulationProvider {
  constructor(apiKey: string) {
    super(apiKey, 'https://api.tenderly.co/api/v1');
  }
  
  async simulateTransaction(
    tx: ethers.providers.TransactionRequest,
    options: SimulationOptions
  ): Promise<SimulationResult> {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'X-Access-Key': this.apiKey
      };
      
      const payload = {
        network_id: options.chainId.toString(),
        from: tx.from,
        to: tx.to,
        input: tx.data,
        gas: tx.gasLimit?.toString() || '8000000',
        gas_price: tx.gasPrice?.toString() || options.gasPrice || '0',
        value: tx.value?.toString() || '0',
        save: options.saveFork === true,
        save_if_fails: true,
        block_number: options.forkBlockNumber
      };
      
      const response = await axios.post(
        `${this.baseUrl}/account/${process.env.TENDERLY_USER}/project/${process.env.TENDERLY_PROJECT}/simulate`,
        payload,
        { headers }
      );
      
      const simData = response.data;
      
      // Transform Tenderly specific response to our standard format
      const balanceChanges: BalanceChange[] = [];
      
      // Process state changes to extract balance changes
      if (simData.transaction.state_diff) {
        // Process ERC20 token balance changes
        for (const [contractAddr, storage] of Object.entries(simData.transaction.state_diff)) {
          // Only process contracts with balance changes (simplified)
          if (storage && typeof storage === 'object' && 'storage' in storage) {
            // Check if it's an ERC20 contract
            try {
              // This is simplified - in a real implementation, we would look for ERC20 signatures
              // in the contract and properly decode the storage slots
              const storageChanges = storage.storage;

              // Cast storageChanges to a Record type
              const typedStorageChanges = storageChanges as Record<string, StorageChange>;
              
              for (const [slot, change] of Object.entries(typedStorageChanges)) {
                try {
                  // Simplified - we'd need to decode properly based on ERC20 storage layout
                  const oldVal = ethers.BigNumber.from(change.old);
                  const newVal = ethers.BigNumber.from(change.new);
                  
                  if (!oldVal.eq(newVal)) {
                    // Try to identify token details - this would use a token registry in production
                    balanceChanges.push({
                      address: contractAddr,
                      symbol: '???', // Would fetch from token API
                      name: 'Unknown Token',
                      decimals: 18, // Assume 18 for unknown tokens
                      oldBalance: oldVal.toString(),
                      newBalance: newVal.toString(),
                      absoluteChange: newVal.sub(oldVal).toString(),
                      percentageChange: oldVal.isZero() ? 100 : 
                        parseFloat(ethers.utils.formatUnits(newVal.sub(oldVal).mul(100), 0)) / 
                        parseFloat(ethers.utils.formatUnits(oldVal, 0))
                    });
                  }
                } catch (e) {
                  console.error('Error processing storage change:', e);
                }
              }
            } catch (e) {
              console.error('Error processing balance changes:', e);
            }
          }
        }
      }
      
      // ETH balance changes
      if (simData.transaction.balance_diff) {
        for (const [address, change] of Object.entries(simData.transaction.balance_diff)) {
          const oldVal = ethers.BigNumber.from((change as { old: string }).old);
          const newVal =ethers.BigNumber.from((change as { new: string }).new);
          
          balanceChanges.push({
            address,
            symbol: 'ETH',
            name: 'Ethereum',
            decimals: 18,
            oldBalance: ethers.utils.formatEther(oldVal),
            newBalance: ethers.utils.formatEther(newVal),
            absoluteChange: ethers.utils.formatEther(newVal.sub(oldVal)),
            percentageChange: oldVal.isZero() ? 100 : 
              parseFloat(ethers.utils.formatUnits(newVal.sub(oldVal).mul(100), 0)) / 
              parseFloat(ethers.utils.formatUnits(oldVal, 0)),
            usdValueChange: parseFloat(ethers.utils.formatEther(newVal.sub(oldVal))) * 3000 // Simplified USD value
          });
        }
      }
      
      // Generate warnings
      const warnings: SimulationWarnings = {
        customWarnings: []
      };
      
      // Check for high gas usage
      if (simData.transaction.gas_used > 1000000) {
        warnings.highGasUsage = true;
        warnings.customWarnings.push('This transaction uses unusually high gas');
      }
      
      // Check for revert risk
      if (simData.transaction.status === false) {
        warnings.revertRisk = true;
        warnings.customWarnings.push(`Transaction may revert: ${simData.transaction.error_message || 'Unknown reason'}`);
      }
      
      // Calculate token price impact (simplified)
      const tokenChanges = balanceChanges.filter(c => c.symbol !== 'ETH');
      if (tokenChanges.length > 0) {
        const hasLargeChange = tokenChanges.some(c => Math.abs(c.percentageChange) > 5);
        if (hasLargeChange) {
          warnings.priceImpact = true;
          warnings.customWarnings.push('High price impact detected (>5%)');
        }
      }
      
      // Convert gas info
      const gasEstimate: GasEstimate = {
        gasUsed: simData.transaction.gas_used.toString(),
        gasLimit: tx.gasLimit?.toString() || '0',
        gasCost: ethers.utils.formatEther(
          ethers.BigNumber.from(simData.transaction.gas_used).mul(
            ethers.BigNumber.from(tx.gasPrice?.toString() || options.gasPrice || '0')
          )
        ),
        gasCostUSD: parseFloat(ethers.utils.formatEther(
          ethers.BigNumber.from(simData.transaction.gas_used).mul(
            ethers.BigNumber.from(tx.gasPrice?.toString() || options.gasPrice || '0')
          )
        )) * 3000 // Simplified USD calculation
      };
      
      // If requested, calculate gas optimizations
      if (options.calculateGasOptimizations) {
        // In production this would use more sophisticated analysis
        const optimizedGas = Math.floor(parseInt(gasEstimate.gasUsed) * 0.9);
        gasEstimate.optimizedGasCost = ethers.utils.formatEther(
          ethers.BigNumber.from(optimizedGas).mul(
            ethers.BigNumber.from(tx.gasPrice?.toString() || options.gasPrice || '0')
          )
        );
        gasEstimate.potentialSavings = ethers.utils.formatEther(
          ethers.BigNumber.from(simData.transaction.gas_used - optimizedGas).mul(
            ethers.BigNumber.from(tx.gasPrice?.toString() || options.gasPrice || '0')
          )
        );
      }
      
      // Add MEV exposure analysis if requested
      let mevExposure: MEVExposure | undefined;
      
      if (options.enableMEVSimulation) {
        // In production this would call to specialized MEV simulation API
        // For now, we'll create a simplified risk model
        
        // Check for common MEV-exposed operations
        const isSwap = tx.data?.toString().includes('swap');
        const isLargeValue = ethers.BigNumber.from(tx.value || '0').gt(
          ethers.utils.parseEther('1')
        );
        
        if (isSwap || isLargeValue) {
          const sandwichRisk = isSwap ? 75 : 25;
          const frontrunningRisk = isLargeValue ? 80 : 40;
          
          mevExposure = {
            sandwichRisk,
            frontrunningRisk,
            backrunningRisk: isSwap ? 60 : 20,
            potentialMEVLoss: isSwap ? '0.05' : '0.02',
            suggestedProtections: [
              'Use a private transaction service',
              'Add minimum output requirements',
              'Consider using an MEV-protected RPC'
            ]
          };
          
          warnings.mevExposure = true;
          warnings.customWarnings.push('This transaction may be vulnerable to MEV attacks');
        }
      }
      
      // Prepare visualization data
      const visualizationData = {
        balanceChanges: balanceChanges.map(change => ({
          symbol: change.symbol,
          change: parseFloat(change.absoluteChange),
          percentChange: change.percentageChange,
          usdValue: change.usdValueChange || 0
        })),
        gasUsage: parseInt(gasEstimate.gasUsed),
        success: simData.transaction.status
      };
      
      return {
        success: simData.transaction.status,
        statusCode: simData.transaction.status ? 1 : 0,
        gasEstimate,
        balanceChanges,
        mevExposure,
        warnings,
        logs: simData.transaction.logs || [],
        revertReason: simData.transaction.error_message,
        visualizationData,
        fullTraceUrl: `https://dashboard.tenderly.co/tx/${simData.simulation.id}`,
        simulationId: simData.simulation.id
      };
      
    } catch (error) {
      console.error('Simulation error:', error);
      throw new Error(`Simulation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Class for advanced transaction simulation
export class TransactionSimulator {
  private provider: SimulationProvider;
  private ethersProvider: ethers.providers.Provider;
  
  constructor(apiKey: string, providerType: 'tenderly' | 'custom' = 'tenderly') {
    // Create provider based on type
    if (providerType === 'tenderly') {
      this.provider = new TenderlySimulation(apiKey);
    } else {
      throw new Error('Unsupported simulation provider');
    }
    
    // Setup ethers provider
    const network = process.env.ETHEREUM_NETWORK || 'mainnet';
    this.ethersProvider = new ethers.providers.JsonRpcProvider(
      process.env.RPC_URL || `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`
    );
  }
  
  // Main simulation method
  async simulateTransaction(
    transaction: ethers.providers.TransactionRequest,
    options: SimulationOptions
  ): Promise<SimulationResult> {
    try {
      // Enhance transaction with missing data if needed
      const enhancedTx = await this.enhanceTransaction(transaction);
      
      // Perform simulation
      const simulationResult = await this.provider.simulateTransaction(enhancedTx, options);
      
      // Enrich with additional data
      const enrichedResult = await this.enrichSimulationResult(simulationResult, enhancedTx, options);
      
      return enrichedResult;
    } catch (error) {
      console.error('Simulation error:', error);
      throw new Error(`Simulation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Add missing data to transaction
  private async enhanceTransaction(tx: ethers.providers.TransactionRequest): Promise<ethers.providers.TransactionRequest> {
    const enhanced = { ...tx };
    
    // Set default gas price if missing
    if (!enhanced.gasPrice) {
      const gasPrice = await this.ethersProvider.getGasPrice();
      enhanced.gasPrice = gasPrice;
    }
    
    // Set reasonable gas limit if missing
    if (!enhanced.gasLimit) {
      try {
        const gasEstimate = await this.ethersProvider.estimateGas({
          from: enhanced.from,
          to: enhanced.to,
          value: enhanced.value || 0,
          data: enhanced.data
        });
        
        // Add 20% buffer for safety
        enhanced.gasLimit = gasEstimate.mul(120).div(100);
      } catch (error) {
        // If estimation fails, use a high default
        enhanced.gasLimit = ethers.BigNumber.from(1000000);
      }
    }
    
    return enhanced;
  }
  
  // Add additional insights to simulation result
  private async enrichSimulationResult(
    result: SimulationResult,
    tx: ethers.providers.TransactionRequest,
    options: SimulationOptions
  ): Promise<SimulationResult> {
    // Add block explorer link
    if (tx.to) {
      const chainId = options.chainId || 1;
      const explorerBaseUrl = this.getExplorerUrl(chainId);
      
      if (explorerBaseUrl) {
        result.blockExplorerPreview = `${explorerBaseUrl}/address/${tx.to}`;
      }
    }
    
    // Fetch and add token logos and USD values
    const enrichedBalanceChanges = await Promise.all(
      result.balanceChanges.map(async change => {
        if (change.symbol !== 'ETH' && change.symbol !== '???') {
          try {
            // In production, this would call a token API
            const tokenInfo = await this.getTokenInfo(change.address, options.chainId || 1);
            return {
              ...change,
              logo: tokenInfo.logoURI,
              usdValueChange: parseFloat(change.absoluteChange) * tokenInfo.usdPrice
            };
          } catch (error) {
            console.warn('Failed to fetch token data:', error);
          }
        }
        return change;
      })
    );
    
    result.balanceChanges = enrichedBalanceChanges;
    
    return result;
  }
  
  // Helper to get block explorer URL for a chain
  private getExplorerUrl(chainId: number): string {
    const explorers: Record<number, string> = {
      1: 'https://etherscan.io',
      10: 'https://optimistic.etherscan.io',
      137: 'https://polygonscan.com',
      42161: 'https://arbiscan.io',
      43114: 'https://snowtrace.io'
    };
    
    return explorers[chainId] || '';
  }
  
  // Helper to get token information
  private async getTokenInfo(address: string, chainId: number): Promise<{ logoURI: string, usdPrice: number }> {
    // In production, this would call a token API
    // For now, return mock data
    return {
      logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
      usdPrice: Math.random() * 100 + 0.01 // Mock price
    };
  }
}

// Export the TransactionSimulator class
export default TransactionSimulator;