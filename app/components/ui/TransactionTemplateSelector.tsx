import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, FileCode, AlertTriangle } from 'lucide-react';

// Interface for transaction template
interface TransactionTemplate {
  name: string;
  to: string;
  data: string;
  value: string;
  description: string;
}

interface TemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: TransactionTemplate) => void;
  templates: TransactionTemplate[];
}

const TransactionTemplateSelector: React.FC<TemplateDialogProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  templates
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  
  if (!isOpen) return null;
  
  return (
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
        className="relative w-full max-w-lg bg-gray-800 p-6 rounded-lg shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-300 hover:text-white"
        >
          <X size={24} />
        </button>
        
        <div className="mb-4">
          <h2 className="text-xl font-medium">Choose a Transaction Template</h2>
          <p className="text-sm text-gray-400 mt-1">
            Select a template to load a sample transaction for analysis
          </p>
        </div>
        
        <div className="space-y-3 mb-6 max-h-80 overflow-y-auto pr-2">
          {templates.map((template, index) => (
            <div 
              key={index}
              className={`p-4 rounded-lg cursor-pointer transition-colors ${
                selectedTemplate === index 
                  ? 'bg-blue-900/50 border border-blue-700' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              onClick={() => setSelectedTemplate(index)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-gray-600 p-2 rounded-full mr-3">
                    <FileCode size={18} />
                  </div>
                  <div>
                    <h3 className="font-medium">{template.name}</h3>
                    <p className="text-sm text-gray-400">{template.description}</p>
                  </div>
                </div>
                
                {selectedTemplate === index && (
                  <div className="h-6 w-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <Check size={14} />
                  </div>
                )}
              </div>
              
              {selectedTemplate === index && (
                <div className="mt-3 pt-3 border-t border-gray-600 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-400">To:</span>{' '}
                      <span className="font-mono">{template.to.substring(0, 10)}...</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Value:</span>{' '}
                      <span>{template.value === '0' ? '0 ETH' : `${parseInt(template.value) / 1e18} ETH`}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={() => {
              if (selectedTemplate !== null) {
                onSelectTemplate(templates[selectedTemplate]);
              }
            }}
            disabled={selectedTemplate === null}
            className={`px-4 py-2 rounded-md transition-colors flex items-center ${
              selectedTemplate === null 
                ? 'bg-gray-600 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            Load Template
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default TransactionTemplateSelector;