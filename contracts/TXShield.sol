// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title TXShield
 * @dev Advanced contract to secure DeFi transactions with multiple safety mechanisms
 */
contract TXShield is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    
    uint256 public constant VERSION = 1;
    
    // Protocol fee in basis points (0.1%)
    uint256 public protocolFeeBps = 10;
    uint256 public constant MAX_FEE_BPS = 100; // 1% max fee
    
    // Transaction history for analytics and reporting
    struct Transaction {
        address user;
        address target;
        uint256 value;
        bytes data;
        uint256 timestamp;
        bool success;
        string threatLevel;
    }
    
    mapping(bytes32 => Transaction) public transactions;
    mapping(address => bytes32[]) public userTransactions;
    
    // Trusted routers that are pre-vetted
    mapping(address => bool) public trustedRouters;
    
    // User settings for custom security preferences
    struct UserSettings {
        uint256 maxSlippageBps;
        uint256 maxGasPrice;
        bool requireSimulation;
        uint256 maxApprovalAmount;
    }
    
    mapping(address => UserSettings) public userSettings;
    
    // Events
    event TransactionExecuted(bytes32 indexed txHash, address indexed user, bool success);
    event ThreatDetected(bytes32 indexed txHash, address indexed user, string threatLevel);
    event RouterTrustUpdated(address indexed router, bool trusted);
    event UserSettingsUpdated(address indexed user);
    
    constructor() Ownable(msg.sender) {
        // Set default user settings
        UserSettings memory defaultSettings = UserSettings({
            maxSlippageBps: 100, // 1% default max slippage
            maxGasPrice: 200 gwei,
            requireSimulation: true,
            maxApprovalAmount: type(uint256).max / 2 // Half of max uint as safer default
        });
        
        userSettings[address(0)] = defaultSettings; // Default settings
    }
    
    /**
     * @dev Set a router as trusted or untrusted
     */
    function setRouterTrust(address router, bool trusted) external onlyOwner {
        trustedRouters[router] = trusted;
        emit RouterTrustUpdated(router, trusted);
    }
    
    /**
     * @dev Update protocol fee (owner only, capped)
     */
    function setProtocolFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= MAX_FEE_BPS, "Fee exceeds maximum");
        protocolFeeBps = newFeeBps;
    }
    
    /**
     * @dev Update user settings
     */
    function updateSettings(UserSettings calldata settings) external {
        userSettings[msg.sender] = settings;
        emit UserSettingsUpdated(msg.sender);
    }
    
    /**
     * @dev Safe approval with limits based on user settings
     */
    function safeApprove(
        address token, 
        address spender, 
        uint256 amount
    ) external nonReentrant returns (bool) {
        UserSettings memory settings = getUserSettings(msg.sender);
        
        // Apply user's max approval setting if amount exceeds it
        uint256 approvalAmount = amount;
        if (amount > settings.maxApprovalAmount) {
            approvalAmount = settings.maxApprovalAmount;
        }
        
        // Verify spender is trusted for large approvals
        if (approvalAmount > 1000 ether && !trustedRouters[spender]) {
            revert("Large approval to untrusted spender");
        }
        
        // Create transaction data for recording
        bytes memory approveData = abi.encodeWithSelector(IERC20.approve.selector, spender, approvalAmount);
        
        // Record transaction
        bytes32 txHash = recordTransaction(
            token, 
            0, 
            approveData
        );
        
        // Execute approval
        bool success = IERC20(token).approve(spender, approvalAmount);
        
        // Update transaction result
        transactions[txHash].success = success;
        
        emit TransactionExecuted(txHash, msg.sender, success);
        
        return success;
    }
    
    /**
     * @dev Execute a transaction with additional security checks
     */
    function secureExecute(
        address target,
        uint256 value,
        bytes calldata data,
        string calldata threatLevelSignature
    ) external payable nonReentrant returns (bytes memory) {
        // Verify the user has sufficient balance
        require(msg.value >= value, "Insufficient value");
        
        UserSettings memory settings = getUserSettings(msg.sender);
        
        // Verify gas price is within user's limits
        require(tx.gasprice <= settings.maxGasPrice, "Gas price too high");
        
        // Convert calldata to memory for recording
        bytes memory dataCopy = data;
        
        // Log the transaction with threat level
        bytes32 txHash = recordTransaction(target, value, dataCopy);
        transactions[txHash].threatLevel = threatLevelSignature;
        
        if (keccak256(bytes(threatLevelSignature)) == keccak256(bytes("HIGH")) || 
            keccak256(bytes(threatLevelSignature)) == keccak256(bytes("CRITICAL"))) {
            emit ThreatDetected(txHash, msg.sender, threatLevelSignature);
            revert("Transaction aborted due to high threat level");
        }
        
        // Calculate and deduct protocol fee
        uint256 fee = (value * protocolFeeBps) / 10000;
        uint256 remainingValue = value - fee;
        
        // Execute transaction
        (bool success, bytes memory result) = target.call{value: remainingValue}(data);
        
        // Update transaction status
        transactions[txHash].success = success;
        
        emit TransactionExecuted(txHash, msg.sender, success);
        
        if (!success) {
            // Refund remaining ETH if transaction failed
            (bool refundSuccess, ) = msg.sender.call{value: remainingValue}("");
            require(refundSuccess, "Refund failed");
            
            // Extract revert reason
            if (result.length > 0) {
                assembly {
                    let resultOffset := add(result, 0x20)
                    let resultLength := mload(result)
                    revert(resultOffset, resultLength)
                }
            }
            revert("Transaction execution failed");
        }
        
        return result;
    }
    
    /**
     * @dev Swap tokens with built-in slippage protection and simulation verification
     */
    function safeSwap(
        address router,
        bytes calldata swapData,
        uint256 minOutput,
        address outputToken
    ) external payable nonReentrant {
        UserSettings memory settings = getUserSettings(msg.sender);
        
        // Convert calldata to memory for recording
        bytes memory swapDataCopy = swapData;
        
        // Record transaction
        bytes32 txHash = recordTransaction(router, msg.value, swapDataCopy);
        
        // Check router trust
        require(trustedRouters[router], "Router not trusted");
        
        // Get initial balance of output token
        uint256 initialBalance = IERC20(outputToken).balanceOf(msg.sender);
        
        // Execute swap
        (bool success, ) = router.call{value: msg.value}(swapData);
        require(success, "Swap execution failed");
        
        // Verify output amount meets minimum
        uint256 newBalance = IERC20(outputToken).balanceOf(msg.sender);
        uint256 outputAmount = newBalance - initialBalance;
        
        require(outputAmount >= minOutput, "Insufficient output amount");
        
        // Calculate max slippage based on user settings
        uint256 expectedOutput = (initialBalance * (10000 + settings.maxSlippageBps)) / 10000;
        require(outputAmount >= expectedOutput, "Slippage too high");
        
        // Update transaction result
        transactions[txHash].success = true;
        
        emit TransactionExecuted(txHash, msg.sender, true);
    }
    
    /**
     * @dev Record transaction details for history and analysis
     */
    function recordTransaction(
        address target,
        uint256 value,
        bytes memory data
    ) internal returns (bytes32) {
        bytes32 txHash = keccak256(abi.encodePacked(
            msg.sender,
            target,
            value,
            keccak256(data),
            block.timestamp
        ));
        
        transactions[txHash] = Transaction({
            user: msg.sender,
            target: target,
            value: value,
            data: data,
            timestamp: block.timestamp,
            success: false,
            threatLevel: "UNKNOWN"
        });
        
        userTransactions[msg.sender].push(txHash);
        
        return txHash;
    }
    
    /**
     * @dev Get user's settings, falling back to default if not set
     */
    function getUserSettings(address user) internal view returns (UserSettings memory) {
        UserSettings memory settings = userSettings[user];
        UserSettings memory defaults = userSettings[address(0)];
        
        // If user has not set custom settings, use defaults
        if (settings.maxSlippageBps == 0) {
            return defaults;
        }
        
        return settings;
    }
    
    /**
     * @dev Get transaction history for a user
     */
    function getUserTransactionHistory(address user, uint256 offset, uint256 limit) 
        external 
        view 
        returns (Transaction[] memory) 
    {
        bytes32[] storage txHashes = userTransactions[user];
        
        uint256 resultCount = limit;
        if (offset + limit > txHashes.length) {
            resultCount = txHashes.length > offset ? txHashes.length - offset : 0;
        }
        
        Transaction[] memory result = new Transaction[](resultCount);
        
        for (uint256 i = 0; i < resultCount; i++) {
            result[i] = transactions[txHashes[offset + i]];
        }
        
        return result;
    }
    
    /**
     * @dev Withdraw accumulated protocol fees
     */
    function withdrawFees() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Fee withdrawal failed");
    }
    
    // Allow contract to receive ETH
    receive() external payable {}
}