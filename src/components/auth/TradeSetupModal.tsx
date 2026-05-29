import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  Loader, 
  Copy, 
  ArrowRight,
  Shield,
  Lock,
  Gift
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';

interface TradeSetupModalProps {
  isOpen: boolean;
  onComplete: () => void;
  canSkip?: boolean;
  onForceClose?: () => void;
}

const TradeSetupModal: React.FC<TradeSetupModalProps> = ({ 
  isOpen, 
  onComplete, 
  canSkip = false,
  onForceClose
}) => {
  const { user, updateTradeLink } = useAuthStore();
  const { addToast } = useToastStore();
  const [tradeLink, setTradeLink] = useState('');
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'welcome' | 'setup' | 'success'>('welcome');

  const handleSave = async () => {
    if (!tradeLink.trim()) {
      addToast({
        type: 'warning',
        title: 'Trade Link Required',
        message: 'Please enter your Steam trade link'
      });
      return;
    }

    setSaving(true);

    try {
      console.log('=== SAVING TRADE LINK FROM MODAL ===');
      console.log('Trade link:', tradeLink);
      
      const success = await updateTradeLink(tradeLink.trim());
      
      if (success) {
        console.log('✅ Trade link saved successfully');
        setStep('success');
        
        addToast({
          type: 'success',
          title: '🎉 Trade Link Saved!',
          message: 'Your trade link has been saved successfully'
        });
        
        // Complete setup after short delay
        setTimeout(() => {
          onComplete();
        }, 2000);
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      console.error('Failed to save trade link:', error);
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: error instanceof Error ? error.message : 'Failed to save trade link'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    if (canSkip) {
      addToast({
        type: 'info',
        title: 'Trade Link Skipped',
        message: 'You can set your trade link later in your profile'
      });
      onComplete();
    } else if (onForceClose) {
      // Force close for mandatory setup
      onForceClose();
    }
  };

  const copyInstructions = () => {
    const instructions = [
      '1. Click the button below to open Steam',
      '2. Sign in to Steam if not already signed in',
      '3. Go to Inventory → Trade Offers → Who can send me Trade Offers?',
      '4. Copy the URL that appears',
      '5. Paste it in the field below'
    ].join('\n');
    
    navigator.clipboard.writeText(instructions);
    addToast({
      type: 'success',
      title: 'Instructions Copied',
      message: 'Setup instructions copied to clipboard'
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
          className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl w-full max-w-lg border-2 border-blue-500/30 overflow-hidden shadow-2xl"
          style={{ boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 40px rgba(59, 130, 246, 0.2)' }}
        >
          {step === 'welcome' && (
            <div className="p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <Gift className="w-10 h-10 text-white" />
                </motion.div>
                
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
                  Welcome, {user?.displayName}! 🎉
                </h1>
                <p className="text-gray-300 text-lg leading-relaxed">
                  To start trading on Skinify, we need to set up your Steam trade link. 
                  This allows sellers to send you items directly.
                </p>
              </div>

              {/* Benefits */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center space-x-3 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <Shield className="w-6 h-6 text-green-400" />
                  <div>
                    <h3 className="text-green-300 font-semibold">Secure Trading</h3>
                    <p className="text-gray-400 text-sm">Direct Steam trades with escrow protection</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <Lock className="w-6 h-6 text-blue-400" />
                  <div>
                    <h3 className="text-blue-300 font-semibold">Safe & Private</h3>
                    <p className="text-gray-400 text-sm">Your trade link is stored securely and never shared</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <motion.button
                  onClick={() => setStep('setup')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center space-x-2"
                  style={{ boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)' }}
                >
                  <span>Set Up Trade Link</span>
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
                
                {canSkip && (
                  <motion.button
                    onClick={handleSkip}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`w-full py-3 rounded-lg transition-all duration-300 ${
                      canSkip 
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        : 'bg-red-600 hover:bg-red-500 text-white font-bold'
                    }`}
                  >
                    {canSkip ? 'Skip for Now' : 'Logout (Trade Link Required)'}
                  </motion.button>
                )}
              </div>
            </div>
          )}

          {step === 'setup' && (
            <div className="p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-4">Steam Trade Link Setup</h2>
                <p className="text-gray-300">
                  Follow these steps to get your Steam trade link
                </p>
              </div>

              {/* Instructions */}
              <div className="bg-gray-800/50 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold mr-2">
                    1
                  </div>
                  Get Your Trade Link from Steam
                </h3>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-xs">1</div>
                    <span className="text-gray-300">Click the button below to open Steam</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-xs">2</div>
                    <span className="text-gray-300">Go to Inventory → Trade Offers</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-xs">3</div>
                    <span className="text-gray-300">Click "Who can send me Trade Offers?"</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-xs">4</div>
                    <span className="text-gray-300">Copy the URL that appears</span>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <motion.button
                    onClick={() => window.open('https://steamcommunity.com/my/tradeoffers/privacy', '_blank')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 bg-[#171a21] hover:bg-[#2a475e] text-white py-3 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open Steam</span>
                  </motion.button>
                  
                  <motion.button
                    onClick={copyInstructions}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg transition-all duration-300"
                    title="Copy instructions"
                  >
                    <Copy className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>

              {/* Trade Link Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <span>Paste Your Trade Link Here</span>
                  </div>
                </label>
                
                <textarea
                  value={tradeLink}
                  onChange={(e) => setTradeLink(e.target.value)}
                  placeholder="https://steamcommunity.com/tradeoffer/new/?partner=XXXXXXXX&token=XXXXXXXX"
                  rows={3}
                  className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
                
                {tradeLink && (
                  <div className="mt-2 text-xs">
                    {tradeLink.includes('steamcommunity.com/tradeoffer/new') ? (
                      <div className="text-green-400 flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>Valid trade link format</span>
                      </div>
                    ) : (
                      <div className="text-red-400 flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>Invalid format - should start with https://steamcommunity.com/tradeoffer/new</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <motion.button
                  onClick={handleSave}
                  disabled={!tradeLink.trim() || saving}
                  whileHover={{ scale: saving ? 1 : 1.02 }}
                  whileTap={{ scale: saving ? 1 : 0.98 }}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center space-x-2"
                  style={!saving && tradeLink.trim() ? { boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)' } : {}}
                >
                  {saving ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Save Trade Link</span>
                    </>
                  )}
                </motion.button>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => setStep('welcome')}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition-all duration-300"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSkip}
                    className={`flex-1 py-3 rounded-lg transition-all duration-300 ${
                      canSkip 
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        : 'bg-red-600 hover:bg-red-500 text-white font-bold'
                    }`}
                  >
                    {canSkip ? 'Skip for Now' : 'Logout (Required)'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="p-8 text-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle className="w-10 h-10 text-white" />
              </motion.div>
              
              <h2 className="text-3xl font-bold text-white mb-4">All Set! 🎉</h2>
              <p className="text-gray-300 mb-6">
                Your trade link has been saved successfully. You can now start trading on Skinify!
              </p>
              
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
                <h3 className="text-green-300 font-semibold mb-2">What's Next?</h3>
                <ul className="text-gray-300 text-sm space-y-2 text-left">
                  <li>• Browse the marketplace for CS2 items</li>
                  <li>• Add items to your cart</li>
                  <li>• Complete secure purchases</li>
                  <li>• Receive items via Steam trade offers</li>
                </ul>
              </div>
            </div>
          )}

          {/* Close button only on welcome step or if can skip */}
          {(step === 'welcome' && canSkip) && step !== 'success' && (
            <div className="absolute top-4 right-4">
              <motion.button
                onClick={handleSkip}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </motion.button>
            </div>
          )}
          
          {/* Forced close button for mandatory setup */}
          {!canSkip && step === 'welcome' && onForceClose && (
            <div className="absolute top-4 right-4">
              <motion.button
                onClick={onForceClose}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="text-red-400 hover:text-red-300 transition-colors"
                title="This will log you out"
              >
                ✕
              </motion.button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TradeSetupModal;