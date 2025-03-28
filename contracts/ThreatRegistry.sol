// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title ThreatRegistry
 * @dev Decentralized registry for tracking and verifying malicious addresses and attack signatures
 */
contract ThreatRegistry is AccessControl {
    bytes32 public constant REPORTER_ROLE = keccak256("REPORTER_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    
    // Threat types
    enum ThreatType {
        PHISHING,
        RUGPULL,
        SANDWICH_ATTACK,
        APPROVAL_SCAM,
        HONEYPOT,
        FRONTRUNNING,
        FLASH_LOAN_ATTACK,
        OTHER
    }
    
    // Detailed threat data
    struct ThreatData {
        address reporter;
        ThreatType threatType;
        string evidence;
        uint256 reportedAt;
        uint256 validationCount;
        bool confirmed;
        string callDataFingerprint; // Hashed pattern of suspicious calldata
    }
    
    // Mappings to store threat data
    mapping(address => ThreatData) public addressThreats;
    mapping(bytes32 => ThreatData) public signatureThreats;
    
    // Merkle root for efficient verification
    bytes32 public threatMerkleRoot;
    uint256 public lastUpdateBlock;
    
    // Required validations for auto-confirmation
    uint256 public requiredValidations = 3;
    
    // Events
    event ThreatReported(address indexed target, ThreatType threatType, address reporter);
    event ThreatValidated(address indexed target, address validator);
    event ThreatConfirmed(address indexed target);
    event SignatureThreatReported(bytes32 indexed signatureHash, ThreatType threatType);
    event MerkleRootUpdated(bytes32 newRoot);
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REPORTER_ROLE, msg.sender);
        _grantRole(VALIDATOR_ROLE, msg.sender);
    }
    
    /**
     * @dev Report a malicious address
     */
    function reportThreat(
        address target,
        ThreatType threatType,
        string calldata evidence,
        string calldata callDataFingerprint
    ) external onlyRole(REPORTER_ROLE) {
        // Only allow new reports or updates from original reporter
        require(
            addressThreats[target].reporter == address(0) || 
            addressThreats[target].reporter == msg.sender,
            "Address already reported by another account"
        );
        
        addressThreats[target] = ThreatData({
            reporter: msg.sender,
            threatType: threatType,
            evidence: evidence,
            reportedAt: block.timestamp,
            validationCount: 0,
            confirmed: false,
            callDataFingerprint: callDataFingerprint
        });
        
        emit ThreatReported(target, threatType, msg.sender);
    }
    
    /**
     * @dev Report a malicious transaction signature pattern
     */
    function reportSignatureThreat(
        bytes32 signatureHash,
        ThreatType threatType,
        string calldata evidence,
        string calldata callDataFingerprint
    ) external onlyRole(REPORTER_ROLE) {
        // Only allow new reports or updates from original reporter
        require(
            signatureThreats[signatureHash].reporter == address(0) || 
            signatureThreats[signatureHash].reporter == msg.sender,
            "Signature already reported by another account"
        );
        
        signatureThreats[signatureHash] = ThreatData({
            reporter: msg.sender,
            threatType: threatType,
            evidence: evidence,
            reportedAt: block.timestamp,
            validationCount: 0,
            confirmed: false,
            callDataFingerprint: callDataFingerprint
        });
        
        emit SignatureThreatReported(signatureHash, threatType);
    }
    
    /**
     * @dev Validate a reported threat (multi-sig consensus)
     */
    function validateThreat(address target) external onlyRole(VALIDATOR_ROLE) {
        require(addressThreats[target].reporter != address(0), "Threat not reported");
        require(!addressThreats[target].confirmed, "Threat already confirmed");
        require(addressThreats[target].reporter != msg.sender, "Reporter cannot validate own report");
        
        addressThreats[target].validationCount += 1;
        
        emit ThreatValidated(target, msg.sender);
        
        // Auto-confirm if threshold reached
        if (addressThreats[target].validationCount >= requiredValidations) {
            addressThreats[target].confirmed = true;
            emit ThreatConfirmed(target);
        }
    }
    
    /**
     * @dev Check if an address is a confirmed threat
     */
    function isThreat(address target) external view returns (bool) {
        return addressThreats[target].confirmed;
    }
    
    /**
     * @dev Check if a signature is a confirmed threat
     */
    function isSignatureThreat(bytes32 signatureHash) external view returns (bool) {
        return signatureThreats[signatureHash].confirmed;
    }
    
    /**
     * @dev Get threat data for an address
     */
    function getThreatData(address target) external view returns (
        address reporter,
        ThreatType threatType,
        string memory evidence,
        uint256 reportedAt,
        uint256 validationCount,
        bool confirmed
    ) {
        ThreatData storage data = addressThreats[target];
        return (
            data.reporter,
            data.threatType,
            data.evidence,
            data.reportedAt,
            data.validationCount,
            data.confirmed
        );
    }
    
    /**
     * @dev Update Merkle root with latest threat data (for efficient client-side verification)
     */
    function updateMerkleRoot(bytes32 newRoot) external onlyRole(DEFAULT_ADMIN_ROLE) {
        threatMerkleRoot = newRoot;
        lastUpdateBlock = block.number;
        emit MerkleRootUpdated(newRoot);
    }
    
    /**
     * @dev Verify address is a threat using Merkle proof (gas-efficient)
     */
    function verifyThreatWithProof(
        address target, 
        bytes32[] calldata proof
    ) external view returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(target));
        return MerkleProof.verify(proof, threatMerkleRoot, leaf);
    }
    
    /**
     * @dev Set required validations threshold
     */
    function setRequiredValidations(uint256 count) external onlyRole(DEFAULT_ADMIN_ROLE) {
        requiredValidations = count;
    }
    
    /**
     * @dev Analyze transaction calldata for threat patterns
     */
    function analyzeCalldata(bytes calldata data) external pure returns (
        bool isThreatening,
        string memory patternMatch
    ) {
        // This is a stub function - in a real implementation, this would
        // use a more sophisticated on-chain pattern matching algorithm
        // and/or call to an off-chain oracle for threat analysis
        
        // Example simple pattern detection - check for infinite approvals
        if (bytes4(data[:4]) == bytes4(keccak256("approve(address,uint256)"))) {
            uint256 approvalAmount;
            assembly {
                approvalAmount := calldataload(add(data.offset, 36))
            }
            
            if (approvalAmount == type(uint256).max) {
                return (true, "Unlimited token approval detected");
            }
        }
        
        return (false, "");
    }
}