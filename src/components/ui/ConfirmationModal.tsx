import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  isProcessing?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Yes',
  cancelText = 'No',
  variant = 'warning',
  isProcessing = false,
}) => {
  const variantStyles = {
    danger: {
      icon: AlertCircle,
      iconColor: 'text-red-400',
      iconBg: 'bg-red-500/10',
      confirmBg: 'bg-red-600 hover:bg-red-500',
      borderColor: 'border-red-500/30',
    },
    warning: {
      icon: AlertCircle,
      iconColor: 'text-yellow-400',
      iconBg: 'bg-yellow-500/10',
      confirmBg: 'bg-yellow-600 hover:bg-yellow-500',
      borderColor: 'border-yellow-500/30',
    },
    info: {
      icon: AlertCircle,
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-500/10',
      confirmBg: 'bg-blue-600 hover:bg-blue-500',
      borderColor: 'border-blue-500/30',
    },
    success: {
      icon: CheckCircle,
      iconColor: 'text-green-400',
      iconBg: 'bg-green-500/10',
      confirmBg: 'bg-green-600 hover:bg-green-500',
      borderColor: 'border-green-500/30',
    },
  };

  const style = variantStyles[variant];
  const Icon = style.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
            onClick={onClose}
          />

          <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className={`bg-gray-900 rounded-2xl border ${style.borderColor} max-w-md w-full shadow-2xl`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-start space-x-4 mb-4">
                  <div className={`p-3 rounded-full ${style.iconBg}`}>
                    <Icon className={`w-6 h-6 ${style.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                    <p className="text-gray-300 text-sm leading-relaxed">{message}</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors"
                    disabled={isProcessing}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={onClose}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200"
                  >
                    {cancelText}
                  </button>
                  <button
                    onClick={() => {
                      onConfirm();
                      onClose();
                    }}
                    disabled={isProcessing}
                    className={`flex-1 px-4 py-3 ${style.confirmBg} disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200 shadow-lg`}
                  >
                    {isProcessing ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Processing...</span>
                      </div>
                    ) : (
                      confirmText
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;
