import { getSupabaseCredentials } from '../../utils/supabaseHelpers';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, AlertCircle, CheckCircle, CreditCard, Building, Wallet, Clock } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useBalanceStore } from '../../store/balanceStore';
import { useToastStore } from '../../store/toastStore';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentBalance: number;
}

const WithdrawModal: React.FC<WithdrawModalProps> = ({ isOpen, onClose, onSuccess, currentBalance }) => {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [amount, setAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('bank');
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'amount' | 'method' | 'processing' | 'success'>('amount');
  const [accountDetails, setAccountDetails] = useState({
    bankAccount: '',
    iban: '',
    cardNumber: '',
    email: ''
  });

  const minWithdraw = 100;
  const withdrawFee = 0.015; // 1.5%

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const calculateFee = (amount: number) => {
    return amount * withdrawFee;
  };

  const calculateNetAmount = (amount: number) => {
    return amount - calculateFee(amount);
  };

  const handleAmountNext = () => {
    const withdrawAmount = parseFloat(amount);
    if (!withdrawAmount || withdrawAmount < minWithdraw || withdrawAmount > currentBalance) return;
    setStep('method');
  };

  const handleWithdraw = async () => {
    if (!user) {
      addToast({
        type: 'error',
        title: 'Authentication Error',
        message: 'Please log in to withdraw funds'
      });
      return;
    }
    
    const withdrawAmount = parseFloat(amount);
    const fee = calculateFee(withdrawAmount);
    const netAmount = calculateNetAmount(withdrawAmount);
    
    setProcessing(true);
    setStep('processing');

    try {
      console.log('=== PROCESSING WITHDRAWAL ===');
      console.log('User:', user.steamId);
      console.log('Amount:', withdrawAmount);
      console.log('Method:', withdrawMethod);
      console.log('Net amount:', netAmount);
      
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      
      // Create withdrawal transaction
      const response = await fetch(`${supabaseUrl}/functions/v1/balance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          steam_id: user.steamId,
          type: 'withdrawal',
          amount: withdrawAmount, // Deduct full amount from balance
          description: `Withdrawal via ${withdrawMethod} - Fee: ${fee.toLocaleString('cs-CZ')} Kč, Net: ${netAmount.toLocaleString('cs-CZ')} Kč`,
          reference_id: `withdrawal_${user.steamId}_${Date.now()}`,
          metadata: {
            withdrawal_method: withdrawMethod,
            gross_amount: withdrawAmount,
            fee_amount: fee,
            net_amount: netAmount,
            account_details: withdrawMethod === 'bank' ? accountDetails.iban :
                           withdrawMethod === 'card' ? accountDetails.cardNumber :
                           accountDetails.email,
            processing_time: withdrawMethod === 'bank' ? '1-3 business days' :
                           withdrawMethod === 'card' ? '1-5 business days' :
                           'Instant to 24 hours'
          }
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Withdrawal transaction created:', result.transaction_id);
        
        setStep('success');
        
        addToast({
          type: 'success',
          title: '💸 Withdrawal Initiated!',
          message: `${netAmount.toLocaleString('cs-CZ')} Kč will be transferred to your ${withdrawMethod} account`,
          duration: 4000
        });
      
        setTimeout(() => {
          onSuccess();
          resetModal();
        }, 2000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Withdrawal request failed');
      }

    } catch (error) {
      console.error('Withdrawal failed:', error);
      addToast({
        type: 'error',
        title: '❌ Withdrawal Failed',
        message: error instanceof Error ? error.message : 'Please try again later'
      });
      setProcessing(false);
      setStep('method');
    }
  };

  const resetModal = () => {
    setAmount('');
    setWithdrawMethod('bank');
    setProcessing(false);
    setStep('amount');
    setAccountDetails({
      bankAccount: '',
      iban: '',
      cardNumber: '',
      email: ''
    });
  };

  const handleClose = () => {
    if (step !== 'processing') {
      onClose();
      resetModal();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3 }}
          className="bg-gray-900 rounded-2xl w-full max-w-md border border-gray-700/50"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
            <h2 className="text-xl font-bold text-white flex items-center">
              <DollarSign className="w-6 h-6 text-green-500 mr-2" />
              Withdraw Funds
            </h2>
            {step !== 'processing' && (
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            )}
          </div>

          <div className="p-6">
            {step === 'amount' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Current Balance Display */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30"
                  style={{ boxShadow: '0 8px 25px rgba(168, 85, 247, 0.2)' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-gray-400 text-sm mb-2">Current Balance</div>
                      <div className="text-3xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                        {currentBalance.toLocaleString('cs-CZ')} Kč
                      </div>
                    </div>
                    <motion.div
                      animate={{ 
                        boxShadow: ['0 0 20px rgba(168, 85, 247, 0.3)', '0 0 30px rgba(168, 85, 247, 0.6)', '0 0 20px rgba(168, 85, 247, 0.3)']
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center"
                    >
                      <Wallet className="w-8 h-8 text-white" />
                    </motion.div>
                  </div>
                </motion.div>

                {/* Amount Input Section */}
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent mb-2">
                      Withdrawal Amount
                    </h3>
                    <p className="text-gray-400 text-sm">Enter the amount you'd like to withdraw</p>
                  </div>

                  {/* Custom Amount Input */}
                  <div className="relative">
                    <motion.input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount"
                      min={minWithdraw}
                      max={currentBalance}
                      whileFocus={{ scale: 1.02 }}
                      className="w-full bg-gray-800/50 border border-purple-500/30 focus:border-purple-500 rounded-xl px-6 py-4 pr-16 text-white placeholder-gray-400 focus:outline-none transition-all duration-300 text-xl text-center font-bold"
                      style={{
                        boxShadow: amount ? '0 0 25px rgba(168, 85, 247, 0.4)' : '0 8px 20px rgba(0, 0, 0, 0.3)'
                      }}
                    />
                    <div className="absolute right-6 top-1/2 transform -translate-y-1/2">
                      <span className="text-purple-400 font-bold">Kč</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 text-center">
                    Minimum withdrawal: {minWithdraw.toLocaleString('cs-CZ')} Kč
                  </p>

                  {/* Validation Messages */}
                  <div className="space-y-2">
                    {amount && parseFloat(amount) < minWithdraw && (
                      <div className="flex items-center space-x-2 text-red-400 text-sm">
                        <AlertCircle size={16} />
                        <span>Minimum withdrawal amount is {minWithdraw.toLocaleString('cs-CZ')} Kč</span>
                      </div>
                    )}
                    
                    {amount && parseFloat(amount) > currentBalance && (
                      <div className="flex items-center space-x-2 text-red-400 text-sm">
                        <AlertCircle size={16} />
                        <span>Amount exceeds your current balance</span>
                      </div>
                    )}
                  </div>

                  {/* Fee Calculation */}
                  {amount && parseFloat(amount) >= minWithdraw && parseFloat(amount) <= currentBalance && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                      <h4 className="text-red-300 font-medium mb-2">Withdrawal Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Withdrawal Amount</span>
                          <span className="text-white">{parseFloat(amount).toLocaleString('cs-CZ')} Kč</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Processing Fee (1.5%)</span>
                          <span className="text-red-400">-{calculateFee(parseFloat(amount)).toLocaleString('cs-CZ')} Kč</span>
                        </div>
                        <div className="border-t border-red-500/30 pt-2 flex justify-between font-bold">
                          <span className="text-white">You'll Receive</span>
                          <span className="text-green-400">{calculateNetAmount(parseFloat(amount)).toLocaleString('cs-CZ')} Kč</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Continue Button */}
                <motion.button
                  onClick={handleAmountNext}
                  disabled={!amount || parseFloat(amount) < minWithdraw || parseFloat(amount) > currentBalance}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg transition-all duration-300"
                  style={amount && parseFloat(amount) >= minWithdraw && parseFloat(amount) <= currentBalance ? {
                    boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)'
                  } : {}}
                >
                  Continue to Payment Method
                </motion.button>
              </motion.div>
            )}

            {step === 'method' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Withdrawal Summary */}
                <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 backdrop-blur-sm rounded-xl p-6 border border-red-500/30">
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center">
                    <DollarSign className="w-5 h-5 text-red-400 mr-2" />
                    Withdrawal Summary
                  </h4>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400">Withdrawal Amount</span>
                    <span className="text-2xl font-bold text-white">
                      {parseFloat(amount).toLocaleString('cs-CZ')} Kč
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400">Processing Fee</span>
                    <span className="text-red-400 font-bold">-{calculateFee(parseFloat(amount)).toLocaleString('cs-CZ')} Kč</span>
                  </div>
                  <div className="border-t border-red-500/30 pt-3 flex justify-between items-center">
                    <span className="text-gray-400">You'll Receive</span>
                    <span className="text-green-400 font-bold text-xl">
                      {calculateNetAmount(parseFloat(amount)).toLocaleString('cs-CZ')} Kč
                    </span>
                  </div>
                </div>

                {/* Withdrawal Method Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Withdrawal Method
                  </label>
                  <div className="space-y-3">
                    {[
                      { id: 'bank', label: 'Bank Transfer', icon: Building, description: 'Direct to your bank account' },
                      { id: 'card', label: 'Debit Card', icon: CreditCard, description: 'To your registered card' },
                      { id: 'paypal', label: 'PayPal', icon: Wallet, description: 'PayPal account' }
                    ].map(({ id, label, icon: Icon, description }) => (
                      <label key={id} className="flex items-center space-x-3 cursor-pointer group">
                        <input
                          type="radio"
                          name="withdrawMethod"
                          value={id}
                          checked={withdrawMethod === id}
                          onChange={() => setWithdrawMethod(id)}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded-full border-2 transition-all duration-300 ${
                          withdrawMethod === id 
                            ? 'border-purple-500 bg-purple-500 shadow-lg' 
                            : 'border-gray-500 group-hover:border-purple-400'
                        }`}>
                          {withdrawMethod === id && (
                            <motion.div 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-2.5 h-2.5 bg-white rounded-full m-0.5"
                            />
                          )}
                        </div>
                        <div className="flex items-center space-x-3 flex-1 bg-gray-800/30 border border-gray-700/30 rounded-lg p-4 group-hover:border-purple-500/30 transition-all duration-300">
                          <Icon size={20} className={withdrawMethod === id ? 'text-purple-400' : 'text-gray-400 group-hover:text-purple-400'} />
                          <div>
                            <div className={`font-medium transition-colors ${
                              withdrawMethod === id ? 'text-purple-300' : 'text-white group-hover:text-purple-200'
                            }`}>
                              {label}
                            </div>
                            <div className="text-xs text-gray-400">{description}</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Account Details Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {withdrawMethod === 'bank' ? 'Bank Account / IBAN' :
                     withdrawMethod === 'card' ? 'Card Number' : 'PayPal Email'}
                  </label>
                  <input
                    type={withdrawMethod === 'paypal' ? 'email' : 'text'}
                    value={
                      withdrawMethod === 'bank' ? accountDetails.iban :
                      withdrawMethod === 'card' ? accountDetails.cardNumber :
                      accountDetails.email
                    }
                    onChange={(e) => setAccountDetails(prev => ({
                      ...prev,
                      [withdrawMethod === 'bank' ? 'iban' : 
                        withdrawMethod === 'card' ? 'cardNumber' : 'email']: e.target.value
                    }))}
                    placeholder={
                      withdrawMethod === 'bank' ? 'CZ1234567890123456789012' :
                      withdrawMethod === 'card' ? '1234 5678 9012 3456' :
                      'your.email@example.com'
                    }
                    className="w-full bg-gray-800/50 border border-purple-500/30 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none transition-all duration-300"
                    style={{
                      boxShadow: '0 0 15px rgba(168, 85, 247, 0.1)'
                    }}
                  />
                </div>

                {/* Processing Time */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <div className="text-blue-300 text-sm flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>
                      <strong>Processing Time:</strong> {
                        withdrawMethod === 'bank' ? '1-3 business days' :
                        withdrawMethod === 'card' ? '1-5 business days' :
                        'Instant to 24 hours'
                      }
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <motion.button
                    onClick={() => setStep('amount')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-medium transition-all duration-300"
                  >
                    Back
                  </motion.button>
                  <motion.button
                    onClick={handleWithdraw}
                    disabled={!accountDetails[withdrawMethod === 'bank' ? 'iban' : withdrawMethod === 'card' ? 'cardNumber' : 'email']}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition-all duration-300"
                    style={!accountDetails[withdrawMethod === 'bank' ? 'iban' : withdrawMethod === 'card' ? 'cardNumber' : 'email'] ? {} : {
                      boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)'
                    }}
                  >
                    Withdraw {calculateNetAmount(parseFloat(amount)).toLocaleString('cs-CZ')} Kč
                  </motion.button>
                </div>
              </motion.div>
            )}

            {step === 'processing' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-6"
                />
                <h3 className="text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent mb-2">
                  Processing Withdrawal
                </h3>
                <p className="text-gray-400">Please wait while we process your withdrawal request...</p>
                <div className="mt-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30">
                  <div className="text-sm text-gray-400">
                    Amount: <span className="text-white font-bold">{calculateNetAmount(parseFloat(amount)).toLocaleString('cs-CZ')} Kč</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    Method: <span className="text-white font-bold capitalize">{withdrawMethod}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6"
                  style={{ boxShadow: '0 8px 25px rgba(34, 197, 94, 0.4)' }}
                >
                  <CheckCircle className="w-10 h-10 text-white" />
                </motion.div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-2">
                  Withdrawal Initiated!
                </h3>
                <p className="text-gray-400 mb-4">
                  Your withdrawal request has been submitted successfully
                </p>
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
                  <div className="text-sm text-green-300">
                    <div>Amount: <span className="font-bold">{calculateNetAmount(parseFloat(amount)).toLocaleString('cs-CZ')} Kč</span></div>
                    <div>Method: <span className="font-bold capitalize">{withdrawMethod}</span></div>
                    <div>Processing Time: <span className="font-bold">
                      {withdrawMethod === 'bank' ? '1-3 business days' :
                       withdrawMethod === 'card' ? '1-5 business days' :
                       'Instant to 24 hours'}
                    </span></div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WithdrawModal;