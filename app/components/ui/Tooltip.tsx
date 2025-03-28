// components/ui/Tooltip.tsx
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
  width?: 'narrow' | 'medium' | 'wide';
  position?: 'top' | 'bottom' | 'left' | 'right';
  showIcon?: boolean;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  width = 'medium',
  position = 'top',
  showIcon = true
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const tipRef = useRef<HTMLDivElement>(null);
  
  const widthClasses = {
    narrow: 'w-48',
    medium: 'w-64',
    wide: 'w-80'
  };
  
  const positionStyles = {
    top: {
      container: 'mb-1',
      tooltip: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
      arrow: 'top-full left-1/2 transform -translate-x-1/2 border-l-8 border-r-8 border-t-8 border-transparent border-t-gray-800'
    },
    bottom: {
      container: 'mt-1',
      tooltip: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
      arrow: 'bottom-full left-1/2 transform -translate-x-1/2 border-l-8 border-r-8 border-b-8 border-transparent border-b-gray-800'
    },
    left: {
      container: 'mr-1',
      tooltip: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
      arrow: 'left-full top-1/2 transform -translate-y-1/2 border-t-8 border-b-8 border-l-8 border-transparent border-l-gray-800'
    },
    right: {
      container: 'ml-1',
      tooltip: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
      arrow: 'right-full top-1/2 transform -translate-y-1/2 border-t-8 border-b-8 border-r-8 border-transparent border-r-gray-800'
    }
  };
  
  return (
    <div
      className={`inline-flex items-center relative ${positionStyles[position].container}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      ref={tipRef}
    >
      {children}
      {showIcon && (
        <HelpCircle 
          size={16} 
          className="ml-1 text-gray-400 cursor-help" 
        />
      )}
      
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 ${positionStyles[position].tooltip} ${widthClasses[width]}`}
          >
            <div className="bg-gray-800 text-white p-3 rounded-lg shadow-lg text-sm">
              {content}
            </div>
            <div className={`absolute h-0 w-0 ${positionStyles[position].arrow}`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Also create a glossary of DeFi terms that can be used with the tooltip
export const DeFiGlossary = {
  MEV: "Maximal Extractable Value: The maximum value that can be extracted from block production beyond the standard block reward and gas fees by including, excluding, or re-ordering transactions.",
  "Unlimited Approval": "Granting a smart contract permission to spend an unlimited amount of your tokens, which poses a security risk if the contract is compromised.",
  "Front-running": "When someone sees your pending transaction and quickly inserts their own transaction with a higher gas price to execute before yours.",
  "Sandwich Attack": "A form of front-running where attackers place two transactions, one before and one after a victim's transaction, to profit from price movements.",
  "Slippage": "The difference between the expected price of a trade and the actual executed price due to market movement.",
  "Gas": "The computational cost required to perform specific operations on the Ethereum network, paid in ETH.",
  "Gas Limit": "The maximum amount of gas you're willing to use for a transaction.",
  "Gas Price": "The amount of ETH you're willing to pay per unit of gas.",
  "Smart Contract": "Self-executing code deployed on the blockchain that automatically enforces agreements between parties.",
  "Approval": "Permission granted to a smart contract to spend a specific token on your behalf.",
  "Liquidity Pool": "A collection of funds locked in a smart contract used to facilitate trading by providing liquidity.",
};

export default Tooltip;