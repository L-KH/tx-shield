// components/ui/Toast.tsx
"use client";
import React, { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';

// Define toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  showConfirm: (message: string, onConfirm: () => void, onCancel?: () => void) => void;
}

// Create context for toast management
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Hook to use the toast system
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Individual toast component
const ToastComponent = ({ toast, onRemove }: { toast: Toast; onRemove: () => void }) => {
  // Set up auto-dismiss timer
  useEffect(() => {
    if (toast.duration) {
      const timer = setTimeout(() => {
        onRemove();
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, onRemove]);

  // Define colors based on toast type
  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    warning: 'bg-amber-500',
    info: 'bg-blue-600',
  };

  const icons = {
    success: <CheckCircle size={18} />,
    error: <AlertCircle size={18} />,
    warning: <AlertTriangle size={18} />,
    info: <Info size={18} />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
      className={`${colors[toast.type]} text-white p-4 rounded-lg shadow-lg flex items-start max-w-sm w-full`}
    >
      <div className="mr-2 mt-0.5">
        {icons[toast.type]}
      </div>
      <div className="flex-1">
        <p className="text-sm">{toast.message}</p>
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-2 text-xs bg-white bg-opacity-20 px-2 py-1 rounded hover:bg-opacity-30 transition-colors"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button onClick={onRemove} className="ml-2 text-white opacity-70 hover:opacity-100">
        <X size={16} />
      </button>
    </motion.div>
  );
};

// Confirmation dialog component
const ConfirmDialog = ({ 
  message, 
  isOpen, 
  onConfirm, 
  onCancel 
}: { 
  message: string; 
  isOpen: boolean; 
  onConfirm: () => void; 
  onCancel?: () => void; 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-2xl"
      >
        <div className="flex items-start mb-4">
          <div className="mr-3 text-amber-500">
            <AlertTriangle size={24} />
          </div>
          <p className="text-white">{message}</p>
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => onCancel?.()}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Provider component that wraps the application
export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
  });

  // Add a new toast
  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id, duration: toast.duration || 5000 }]);
    return id;
  };

  // Remove a toast by ID
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Show confirmation dialog
  const showConfirm = (message: string, onConfirm: () => void, onCancel?: () => void) => {
    setConfirmState({
      isOpen: true,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
      },
      onCancel: () => {
        onCancel?.();
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, showConfirm }}>
      {children}
      
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 space-y-3 z-50">
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastComponent
              key={toast.id}
              toast={toast}
              onRemove={() => removeToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>
      
      {/* Confirmation dialog */}
      <AnimatePresence>
        {confirmState.isOpen && (
          <ConfirmDialog
            message={confirmState.message}
            isOpen={confirmState.isOpen}
            onConfirm={confirmState.onConfirm}
            onCancel={confirmState.onCancel}
          />
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
};

// Utility function to format error messages
export const formatErrorMessage = (error: any): string => {
  if (!error) return 'An unknown error occurred';
  
  if (typeof error === 'string') return error;
  
  // For ethers.js errors
  if (error.reason) return error.reason;
  if (error.message) {
    // Clean up common error messages
    let message = error.message;
    
    // Remove technical details
    if (message.includes('execution reverted')) {
        const match = message.match(/execution reverted: (.*?)(?=")/i);
        if (match && match[1]) return match[1];
    }
    
    // Handle MetaMask rejections
    if (message.includes('user rejected transaction')) {
      return 'Transaction was rejected';
    }
    
    // Truncate long messages
    if (message.length > 100) {
      return message.substring(0, 97) + '...';
    }
    
    return message;
  }
  
  return 'An error occurred while processing your request';
};