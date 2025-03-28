// app/components/ThreatIndicator.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Check, X, Info, Shield } from 'lucide-react';

interface ThreatIndicatorProps {
  level: 'SAFE' | 'SUSPICIOUS' | 'HIGH' | 'CRITICAL';
  confidence?: number;
  description?: string;
  recommendation?: string;
  onClick?: () => void;
}

const ThreatIndicator: React.FC<ThreatIndicatorProps> = ({
  level,
  confidence = 0,
  description,
  recommendation,
  onClick
}) => {
  // Define colors based on threat level
  const colors = {
    SAFE: {
      bg: '#10B981', // green
      text: 'white',
      icon: <Check size={24} />,
      title: 'SAFE'
    },
    SUSPICIOUS: {
      bg: '#F59E0B', // amber
      text: 'white',
      icon: <AlertTriangle size={24} />,
      title: 'SUSPICIOUS'
    },
    HIGH: {
      bg: '#EF4444', // red
      text: 'white',
      icon: <AlertTriangle size={24} />,
      title: 'HIGH RISK'
    },
    CRITICAL: {
      bg: '#7F1D1D', // dark red
      text: 'white',
      icon: <X size={24} />,
      title: 'CRITICAL THREAT'
    }
  };

  const currentStyle = colors[level];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-6 p-4 rounded-lg cursor-pointer"
      style={{ backgroundColor: currentStyle.bg, color: currentStyle.text }}
      onClick={onClick}
    >
      <div className="flex items-center">
        <div className="mr-4">
          {currentStyle.icon}
        </div>
        <div>
          <h3 className="text-xl font-bold">{currentStyle.title}</h3>
          {confidence > 0 && (
            <p className="text-sm opacity-90">Confidence: {(confidence * 100).toFixed(0)}%</p>
          )}
        </div>
      </div>
      
      {description && (
        <div className="mt-3 text-sm">
          <p>{description}</p>
        </div>
      )}
      
      {recommendation && (
        <div className="mt-3 flex items-center p-2 bg-black bg-opacity-20 rounded">
          <Shield size={16} className="mr-2 flex-shrink-0" />
          <p className="text-sm">{recommendation}</p>
        </div>
      )}
    </motion.div>
  );
};

export default ThreatIndicator;