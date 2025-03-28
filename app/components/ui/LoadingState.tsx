// components/ui/LoadingState.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';

type LoadingStage = 'initializing' | 'analyzing' | 'simulating' | 'finalizing';

interface LoadingStateProps {
  stage: LoadingStage;
  progress?: number; // 0-100
  message?: string;
  error?: string;
}

const stageInfo = {
  initializing: {
    title: 'Initializing Analysis',
    defaultMessage: 'Setting up security analysis...',
    icon: Shield
  },
  analyzing: {
    title: 'Analyzing Transaction',
    defaultMessage: 'Running AI-powered threat detection...',
    icon: Shield
  },
  simulating: {
    title: 'Simulating Execution',
    defaultMessage: 'Simulating transaction outcome...',
    icon: Loader2
  },
  finalizing: {
    title: 'Finalizing Results',
    defaultMessage: 'Calculating risk assessment...',
    icon: Shield
  }
};

const LoadingState: React.FC<LoadingStateProps> = ({ 
  stage, 
  progress = 0, 
  message,
  error
}) => {
  const currentStage = stageInfo[stage];
  const Icon = currentStage.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-gray-800 p-6 rounded-lg flex flex-col items-center justify-center text-center"
    >
      {error ? (
        <div className="text-red-400 space-y-4">
          <AlertTriangle size={48} className="mx-auto" />
          <h3 className="text-xl font-medium">Analysis Error</h3>
          <p>{error}</p>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors">
            Try Again
          </button>
        </div>
      ) : (
        <>
          <div className="relative mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="h-16 w-16 rounded-full border-4 border-blue-600 border-t-transparent"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon size={24} className="text-blue-500" />
            </div>
          </div>
          
          <h3 className="text-xl font-medium mb-2">{currentStage.title}</h3>
          <p className="text-gray-400 mb-6">{message || currentStage.defaultMessage}</p>
          
          {progress > 0 && (
            <div className="w-full max-w-md">
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-blue-600"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="mt-2 text-sm text-right">{progress}%</div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default LoadingState;