// components/ui/RiskConfirmationDialog.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Shield, Check, Info } from 'lucide-react';

interface RiskConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  threatLevel: 'SAFE' | 'SUSPICIOUS' | 'HIGH' | 'CRITICAL';
  details: {
    title: string;
    description: string;
    risks: string[];
    alternatives?: string[];
  };
}

const RiskConfirmationDialog: React.FC<RiskConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  threatLevel,
  details
}) => {
  const [checkbox, setCheckbox] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  
  // Define styles based on threat level
  const getBgColor = () => {
    switch (threatLevel) {
      case 'CRITICAL': return 'bg-red-900/90';
      case 'HIGH': return 'bg-orange-900/90';
      case 'SUSPICIOUS': return 'bg-yellow-900/90';
      default: return 'bg-blue-900/90';
    }
  };
  
  const getIcon = () => {
    switch (threatLevel) {
      case 'CRITICAL': return <AlertTriangle size={48} className="text-red-500" />;
      case 'HIGH': return <AlertTriangle size={48} className="text-orange-500" />;
      case 'SUSPICIOUS': return <Info size={48} className="text-yellow-500" />;
      default: return <Shield size={48} className="text-green-500" />;
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60"
          onClick={onClose}
        />
        
        {/* Dialog content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={`relative w-full max-w-lg p-6 rounded-lg ${getBgColor()} shadow-2xl`}
          role="alertdialog"
          aria-modal="true"
        >
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-300 hover:text-white"
          >
            <X size={24} />
          </button>
          
          <div className="flex items-start mb-4">
            <div className="mr-4 flex-shrink-0">
              {getIcon()}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{threatLevel} RISK</h2>
              <p className="text-lg text-gray-200">{details.title}</p>
            </div>
          </div>
          
          <div className="mb-6">
            <p className="text-gray-200 mb-4">{details.description}</p>
            
            <div className="bg-black/30 p-4 rounded-lg mb-4">
              <h3 className="font-medium mb-2">Potential Risks:</h3>
              <ul className="space-y-2">
                {details.risks.map((risk, i) => (
                  <li key={i} className="flex items-start">
                    <AlertTriangle size={16} className="mr-2 mt-1 flex-shrink-0 text-red-400" />
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {details.alternatives && details.alternatives.length > 0 && (
              <div>
                <button 
                  className="text-blue-400 flex items-center"
                  onClick={() => setShowAlternatives(!showAlternatives)}
                >
                  <Shield size={16} className="mr-2" />
                  {showAlternatives ? 'Hide' : 'Show'} safer alternatives
                </button>
                
                {showAlternatives && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="bg-blue-900/30 p-4 rounded-lg mt-3"
                  >
                    <ul className="space-y-2">
                      {details.alternatives.map((alt, i) => (
                        <li key={i} className="flex items-start">
                          <Check size={16} className="mr-2 mt-1 flex-shrink-0 text-green-400" />
                          <span>{alt}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </div>
            )}
          </div>
          <div className="mt-4 p-4 bg-blue-900/30 rounded-lg">
            <h3 className="font-medium mb-2 flex items-center">
              <Shield size={16} className="mr-2" />
              TX Shield Protection
            </h3>
            
            <p className="text-sm mb-3">
              TX Shield will execute your transaction through our secure smart contract,
              providing additional protection against scams and exploits.
            </p>
            
            {threatLevel === 'HIGH' || threatLevel === 'CRITICAL' ? (
              <div className="bg-blue-800/30 p-3 rounded text-sm mt-2">
                <div className="flex items-start">
                  <Info size={16} className="text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                  <p>
                    For high risk transactions, we strongly recommend using TX Shield protection
                    for additional security layers and verification.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex flex-col space-y-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={checkbox}
                onChange={() => setCheckbox(!checkbox)}
                className="h-5 w-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">
                I understand the risks and want to proceed anyway
              </span>
            </label>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md flex-1 transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={onConfirm}
                disabled={!checkbox}
                className={`px-4 py-2 rounded-md flex-1 transition-colors flex items-center justify-center ${
                  !checkbox ? 'bg-gray-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                <AlertTriangle size={16} className="mr-2" />
                Proceed Anyway
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default RiskConfirmationDialog;