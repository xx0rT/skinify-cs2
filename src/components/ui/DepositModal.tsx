import { getSupabaseCredentials } from '../../utils/supabaseHelpers';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, DollarSign, Loader, CheckCircle, AlertCircle, Wallet, Building, Gamepad2, Plus, ArrowRight, Gift, Tag, Percent, Sparkles, Star, Crown, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useBalanceStore } from '../../store/balanceStore';
import { useToastStore } from '../../store/toastStore';
import { supabase } from '../../lib/supabaseClient';

// Revolut Checkout types
declare global {
  interface Window {
    RevolutCheckout: any;
  }
}

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentBalance: number;
}

// Currency conversion rate (updated: October 9, 2025)
const CZK_TO_EUR_RATE = 24.37; // 1 EUR = 24.37 CZK (current market rate)

const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose, onSuccess, currentBalance }) => {
  const { user } = useAuthStore();
  const { depositFunds } = useBalanceStore();
  const { addToast } = useToastStore();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('revolut');
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'main' | 'processing' | 'success'>('main');
  const [revolutLoaded, setRevolutLoaded] = useState(false);
  const [showPromoSection, setShowPromoSection] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [affiliateCode, setAffiliateCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [affiliateBonus, setAffiliateBonus] = useState(0);

  // Helper function to convert CZK to EUR
  const convertToEur = (czk: number): number => {
    return czk / CZK_TO_EUR_RATE;
  };

  // Mock promo codes for demo
  const validPromoCodes = {
    'WELCOME50': { discount: 0, bonus: 50, description: 'Welcome bonus: +50 Kč' },
    'NEWUSER': { discount: 0, bonus: 100, description: 'New user bonus: +100 Kč' },
    'TRADING20': { discount: 0.05, bonus: 0, description: '5% bonus on deposit' },
    'VIP100': { discount: 0, bonus: 200, description: 'VIP bonus: +200 Kč' },
    'STEAM2024': { discount: 0.1, bonus: 0, description: '10% bonus on deposit' }
  };

  // Affiliate codes are validated against the database
  // No hardcoded values needed

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Load Revolut Checkout script
  useEffect(() => {
    if (!isOpen) return;

    const loadRevolutScript = () => {
      if (window.RevolutCheckout) {
        setRevolutLoaded(true);
        return;
      }

      if (document.getElementById('revolut-checkout')) {
        return;
      }

      const script = document.createElement('script');
      script.id = 'revolut-checkout';
      script.async = true;
      script.src = 'https://sandbox-merchant.revolut.com/embed.js';
      
      script.onload = () => {
        console.log('Revolut Checkout script loaded');
        setRevolutLoaded(true);
      };
      
      script.onerror = () => {
        console.error('Failed to load Revolut Checkout script');
        addToast({
          type: 'error',
          title: 'Payment System Error',
          message: 'Failed to load Revolut payment system'
        });
      };

      document.head.appendChild(script);
    };

    loadRevolutScript();
  }, [isOpen, addToast]);

  const predefinedAmounts = [500, 1000, 2500, 5000, 10000, 20000];

  const handlePromoCodeApply = () => {
    const code = promoCode.toUpperCase();
    const validPromo = validPromoCodes[code as keyof typeof validPromoCodes];
    
    if (validPromo) {
      setPromoDiscount(validPromo.discount);
      addToast({
        type: 'success',
        title: '🎉 Promo Code Applied!',
        message: validPromo.description,
        duration: 3000
      });
    } else {
      addToast({
        type: 'error',
        title: 'Invalid Promo Code',
        message: 'The promo code you entered is not valid',
        duration: 3000
      });
    }
  };

  const handleAffiliateCodeApply = async () => {
    if (!affiliateCode.trim()) {
      addToast({
        type: 'error',
        title: 'Empty Code',
        message: 'Please enter an affiliate code',
        duration: 3000
      });
      return;
    }

    try {
      // Check if the referral code exists in the database
      console.log('=== VALIDATING AFFILIATE CODE ===');
      console.log('Code entered:', affiliateCode);
      console.log('Code (uppercase):', affiliateCode.toUpperCase());
      console.log('Supabase client:', !!supabase);
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
      console.log('Has Anon Key:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, display_name, referral_code')
        .eq('referral_code', affiliateCode.toUpperCase())
        .maybeSingle();

      console.log('Query result:', { users, userError });
      console.log('User found:', !!users);
      console.log('User data:', users);

      if (userError) {
        console.error('Error fetching referral code:', userError);
        addToast({
          type: 'error',
          title: 'Database Error',
          message: `Error: ${userError.message}`,
          duration: 4000
        });
        return;
      }

      if (users) {
        // Valid affiliate code found
        const referrer = users;

        // Get the referred reward amount from settings
        const { data: settings, error: settingsError } = await supabase
          .from('referral_settings')
          .select('setting_value')
          .eq('setting_key', 'referred_reward_amount')
          .maybeSingle();

        if (settingsError) {
          console.error('Error fetching referral settings:', settingsError);
        }

        const bonusAmount = settings ? parseInt(settings.setting_value) : 50;

        setAffiliateBonus(bonusAmount);
        addToast({
          type: 'success',
          title: '🤝 Affiliate Code Applied!',
          message: `Referral bonus: +${bonusAmount} Kč from ${referrer.display_name || 'friend'}`,
          duration: 3000
        });
      } else {
        addToast({
          type: 'error',
          title: 'Invalid Affiliate Code',
          message: 'The affiliate code you entered is not valid',
          duration: 3000
        });
      }
    } catch (error: any) {
      console.error('Error validating affiliate code:', error);
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: error?.message || 'Failed to validate affiliate code. Please try again.',
        duration: 4000
      });
    }
  };

  const calculateFinalAmount = () => {
    const baseAmount = parseFloat(amount) || 0;
    const bonusFromDiscount = baseAmount * promoDiscount;
    const totalBonus = bonusFromDiscount + affiliateBonus;
    const paymentAmount = Math.max(0, baseAmount - affiliateBonus);
    return paymentAmount + bonusFromDiscount;
  };

  const getBonusBreakdown = () => {
    const baseAmount = parseFloat(amount) || 0;
    const bonusFromDiscount = baseAmount * promoDiscount;
    const paymentAmount = Math.max(0, baseAmount - affiliateBonus);
    const paymentAmountEur = convertToEur(paymentAmount);

    return {
      baseAmount,
      baseAmountEur: convertToEur(baseAmount),
      promoBonus: bonusFromDiscount,
      affiliateBonus,
      totalBonus: bonusFromDiscount + affiliateBonus,
      paymentAmount,
      paymentAmountEur,
      finalAmount: paymentAmount + bonusFromDiscount + affiliateBonus
    };
  };

  const handlePayUPayment = async () => {
    if (!user) {
      addToast({
        type: 'error',
        title: 'Authentication Required',
        message: 'Please log in to make a deposit'
      });
      return;
    }

    if (!amount || parseFloat(amount) < 50) {
      addToast({
        type: 'error',
        title: 'Invalid Amount',
        message: 'Please enter a valid amount (minimum 50 Kč)'
      });
      return;
    }

    setProcessing(true);
    setStep('processing');

    try {
      console.log('=== CREATING PAYU PAYMENT ORDER ===');

      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();

      // Fetch user ID from database if not in store
      let userId = user.id;
      if (!userId) {
        console.log('User ID not in store, fetching from database...');
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('steam_id', user.steamId)
          .maybeSingle();

        if (userError || !userData) {
          throw new Error('Failed to get user ID. Please try logging in again.');
        }
        userId = userData.id;
        console.log('Fetched user ID:', userId);
      }

      // Get customer IP address
      let customerIp = '127.0.0.1';
      try {
        console.log('Fetching customer IP from ipapi.co...');
        const ipResponse = await fetch('https://ipapi.co/json/');
        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          customerIp = ipData.ip;
          console.log('Customer IP fetched successfully:', customerIp);
        } else {
          console.warn('IP fetch failed with status:', ipResponse.status);
        }
      } catch (ipError) {
        console.warn('Failed to fetch IP, using fallback:', ipError);
      }

      const bonusBreakdown = getBonusBreakdown();
      const finalAmount = bonusBreakdown.finalAmount;

      console.log('PayU payment request:', {
        amount: finalAmount,
        userId,
        steamId: user.steamId,
        customerIp
      });

      const response = await fetch(`${supabaseUrl}/functions/v1/payu-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: finalAmount,
          userId: userId,
          steamId: user.steamId,
          customerIp: customerIp,
          userEmail: `user_${user.steamId}@csgo-marketplace.com`,
          description: `CS:GO Marketplace Deposit - ${finalAmount.toLocaleString('cs-CZ')} Kč`
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('PayU payment created:', data);

        if (data.redirectUri && data.orderId) {
          console.log('Redirecting to PayU checkout:', data.redirectUri);

          localStorage.setItem('payu_order_id', data.orderId);
          localStorage.setItem('payu_ext_order_id', data.extOrderId);
          localStorage.setItem('payu_user_id', userId);
          localStorage.setItem('payu_amount', finalAmount.toString());

          window.location.href = data.redirectUri;
        } else {
          throw new Error('No redirect URL received from PayU');
        }
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          const errorText = await response.text();
          console.error('PayU response status:', response.status);
          console.error('PayU response text:', errorText);
          throw new Error(`PayU API error (${response.status}): ${errorText}`);
        }
        console.error('PayU payment creation failed:', errorData);
        console.error('Full error details:', JSON.stringify(errorData, null, 2));
        throw new Error(errorData.error || errorData.details || 'Failed to create PayU payment');
      }
    } catch (error) {
      console.error('PayU payment error:', error);
      addToast({
        type: 'error',
        title: 'Payment Failed',
        message: error instanceof Error ? error.message : 'Failed to initiate PayU payment'
      });
      setStep('main');
      setProcessing(false);
    }
  };

  const handleRevolutPayment = async () => {
    if (!user) {
      addToast({
        type: 'error',
        title: 'Authentication Required',
        message: 'Please log in to make a deposit'
      });
      return;
    }

    if (!amount || parseFloat(amount) < 50) {
      addToast({
        type: 'error',
        title: 'Invalid Amount',
        message: 'Please enter a valid amount (minimum 50 Kč)'
      });
      return;
    }

    setProcessing(true);
    setStep('processing');

    try {
      console.log('=== CREATING REVOLUT PAYMENT ORDER ===');
      
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      
      const bonusBreakdown = getBonusBreakdown();

      console.log('Payment details:', {
        paymentAmountCZK: bonusBreakdown.paymentAmount,
        paymentAmountEUR: bonusBreakdown.paymentAmountEur,
        finalBalanceCZK: bonusBreakdown.finalAmount
      });

      const response = await fetch(`${supabaseUrl}/functions/v1/revolut-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          steam_id: user.steamId,
          amount: bonusBreakdown.paymentAmount,
          amount_czk: bonusBreakdown.paymentAmount,
          amount_eur: bonusBreakdown.paymentAmountEur,
          total_balance_to_add: bonusBreakdown.finalAmount,
          currency: 'CZK',
          conversion_rate: CZK_TO_EUR_RATE,
          promo_code: promoCode || null,
          affiliate_code: affiliateCode || null,
          bonuses: bonusBreakdown
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Revolut payment created:', data);
        
        if (data.checkout_url || data.paylink_url) {
          const paymentUrl = data.checkout_url || data.paylink_url;
          console.log('Opening Revolut checkout in new window:', paymentUrl);
          
          const paymentWindow = window.open(
            paymentUrl,
            'revolut_payment',
            'width=800,height=900,scrollbars=yes,resizable=yes,location=yes,status=yes'
          );
          
          const checkClosed = setInterval(() => {
            if (paymentWindow?.closed) {
              clearInterval(checkClosed);
              console.log('Payment window closed - checking status...');
              
              setTimeout(() => {
                checkPaymentStatus(data.order_ref, data.revolut_order_id);
              }, 1000);
            }
          }, 1000);
          
          setStep('processing');
          
          if (!paymentWindow) {
            clearInterval(checkClosed);
            throw new Error('Payment window was blocked. Please allow popups and try again.');
          }
          
        } else {
          throw new Error('No checkout URL received from Revolut');
        }
      } else {
        const errorData = await response.json();
        console.error('Backend error:', errorData);
        throw new Error(errorData.details || errorData.error || 'Failed to create Revolut payment');
      }
      
    } catch (error) {
      console.error('Payment error:', error);
      addToast({
        type: 'error',
        title: 'Payment Failed',
        message: error instanceof Error ? error.message : 'Failed to open payment window'
      });
      setProcessing(false);
      setStep('main');
    }
  };

  const checkPaymentStatus = async (transactionId: string, revolutOrderId: string) => {
    try {
      console.log('=== PAYMENT WINDOW CLOSED - CHECKING STATUS ===');
      
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      
      let attempts = 0;
      const maxAttempts = 15;
      
      const verifyActualPayment = async (): Promise<void> => {
        attempts++;
        console.log(`🔍 SECURE verification attempt ${attempts}/${maxAttempts}`);
        
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/verify-payment?order_ref=${transactionId}&amount=${amount}`, {
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            }
          });
        
          if (response.ok) {
            const result = await response.json();
            console.log('Verification response:', result);
          
            if (result.verified && result.payment_completed) {
              console.log('✅ PAYMENT VERIFIED SUCCESSFULLY!');
              
              setStep('success');
              setProcessing(false);
            
              const breakdown = getBonusBreakdown();
              addToast({
                type: 'success',
                title: '💰 Deposit Successful!',
                message: `${breakdown.finalAmount.toLocaleString('cs-CZ')} Kč verified and added to your account!`,
                duration: 5000
              });
            
              setTimeout(() => {
                onSuccess();
                onClose();
                resetModal();
              }, 2000);
            
              return;
            } else if (result.verified === false && result.payment_completed === false) {
              console.log('❌ PAYMENT NOT COMPLETED');
              
              setStep('main');
              setProcessing(false);
              
              addToast({
                type: 'warning',
                title: '⚠️ Payment Not Completed',
                message: result.message || 'Payment was cancelled or not completed.',
                duration: 5000
              });
              
              return;
            } else {
              console.log(`Attempt ${attempts}: Payment verification pending`);
            }
          } else {
            const errorData = await response.json().catch(() => ({ error: 'Unknown' }));
            console.log(`Attempt ${attempts}: Verification API error - ${response.status}: ${errorData.error || response.statusText}`);
          }
        } catch (fetchError) {
          console.error(`Attempt ${attempts} fetch error:`, fetchError);
        }
        
        if (attempts < maxAttempts) {
          const delay = attempts < 5 ? 2000 : attempts < 10 ? 3000 : 5000;
          console.log(`⏱️ Next check in ${delay/1000}s...`);
          setTimeout(verifyActualPayment, delay);
        } else {
          console.log('❌ PAYMENT VERIFICATION TIMEOUT');
          
          addToast({
            type: 'warning',
            title: '⏰ Payment Verification Timeout',
            message: 'Unable to verify payment status. If you completed the payment, please contact support.',
            duration: 6000
          });
          
          setProcessing(false);
          setStep('main');
        }
      };
      
      console.log('🚀 Starting SECURE payment verification...');
      verifyActualPayment();
      
    } catch (error) {
      console.error('Payment status check failed:', error);
      addToast({
        type: 'warning',
        title: '❌ Verification System Error',
        message: 'Unable to verify payment. Please contact support if you completed the payment.',
        duration: 3000
      });
      
      setProcessing(false);
      setStep('main');
    }
  };

  const resetModal = () => {
    setAmount('');
    setPaymentMethod('revolut');
    setProcessing(false);
    setStep('main');
    setPromoCode('');
    setAffiliateCode('');
    setPromoDiscount(0);
    setAffiliateBonus(0);
    setShowPromoSection(false);
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
      {/* Full Screen Overlay */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
        {/* Centered Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 50 }}
          transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 20 }}
          className="bg-gray-900 rounded-2xl w-full max-w-xl max-h-[90vh] border border-purple-500/20 overflow-hidden backdrop-blur-xl"
          style={{
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.6), 0 8px 32px rgba(168, 85, 247, 0.2)'
          }}
        >

          {/* Header */}
          <div className="bg-gray-800 p-6 border-b border-gray-700/50">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center"
                  style={{ boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)' }}
                >
                  <Wallet className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Deposit Funds
                  </h2>
                  <p className="text-gray-400">Add funds to your account</p>
                </div>
              </div>
              {step !== 'processing' && (
                <motion.button
                  onClick={handleClose}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700/50 rounded-lg"
                >
                  <X size={20} />
                </motion.button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
            {step === 'main' && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Current Balance Display */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50"
                  style={{ boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-gray-400 text-sm mb-2">Current Balance</div>
                      <div className="text-2xl font-bold text-white">
                        {currentBalance.toLocaleString('cs-CZ')} Kč
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/30"
                      style={{ boxShadow: '0 0 20px rgba(168, 85, 247, 0.2)' }}
                    >
                      <Wallet className="w-6 h-6 text-purple-400" />
                    </div>
                  </div>
                </motion.div>

                {/* Amount Input Section */}
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-2">How much would you like to deposit?</h3>
                    <p className="text-gray-400">Choose an amount or enter a custom value</p>
                  </div>

                  {/* Custom Amount Input */}
                  <div className="relative">
                    <motion.input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount"
                      min="50"
                      whileFocus={{ scale: 1.02 }}
                      className="w-full bg-gray-800/50 border border-gray-600 focus:border-purple-500 rounded-lg px-4 py-3 pr-16 text-white placeholder-gray-400 focus:outline-none transition-all duration-300 text-lg text-center"
                      style={{
                        boxShadow: amount ? '0 0 20px rgba(168, 85, 247, 0.2)' : '0 4px 15px rgba(0, 0, 0, 0.2)'
                      }}
                    />
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <span className="text-gray-400 font-medium">Kč</span>
                    </div>
                  </div>

                  {/* EUR Conversion Display */}
                  {amount && parseFloat(amount) > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center"
                    >
                      <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-2">
                        <span className="text-blue-400 text-sm">≈</span>
                        <span className="text-blue-300 font-bold text-lg">
                          {convertToEur(parseFloat(amount)).toFixed(2)} €
                        </span>
                        <span className="text-blue-400 text-xs">(Payment amount)</span>
                      </div>
                    </motion.div>
                  )}

                  {/* Quick Amount Buttons */}
                  <div className="space-y-3">
                    <div className="text-center text-gray-400 text-sm">Quick Amounts</div>
                    <div className="grid grid-cols-3 gap-3">
                      {predefinedAmounts.map((value, index) => (
                        <motion.button
                          key={value}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.1 + index * 0.05 }}
                          onClick={() => setAmount(value.toString())}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`py-3 px-4 rounded-lg font-semibold transition-all duration-300 border ${
                            amount === value.toString()
                              ? 'bg-purple-600 border-purple-500 text-white'
                              : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-purple-500/50 hover:text-white'
                          }`}
                          style={{
                            boxShadow: amount === value.toString() 
                              ? '0 4px 15px rgba(168, 85, 247, 0.3), 0 0 20px rgba(168, 85, 247, 0.2)' 
                              : '0 2px 8px rgba(0, 0, 0, 0.1)'
                          }}
                        >
                          {value.toLocaleString('cs-CZ')} Kč
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Promo & Affiliate Section */}
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4"
                  >
                    <motion.button
                      onClick={() => setShowPromoSection(!showPromoSection)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-gray-800/50 border border-gray-600 hover:border-gray-500 rounded-lg p-4 transition-all duration-300 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <Gift className="w-5 h-5 text-purple-400" />
                        <div className="text-left">
                          <div className="text-white font-semibold">Promo & Affiliate Codes</div>
                          <div className="text-gray-400 text-sm">Get bonus funds on your deposit</div>
                        </div>
                      </div>
                      <motion.div
                        animate={{ rotate: showPromoSection ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      </motion.div>
                    </motion.button>

                    <AnimatePresence>
                      {showPromoSection && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, scale: 0.95 }}
                          animate={{ opacity: 1, height: 'auto', scale: 1 }}
                          exit={{ opacity: 0, height: 0, scale: 0.95 }}
                          transition={{ duration: 0.4 }}
                          className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50 space-y-4"
                        >
                          {/* Promo Code Section */}
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <Tag className="w-4 h-4 text-purple-400" />
                              <h4 className="font-semibold text-white">Promo Code</h4>
                            </div>
                            <div className="flex space-x-3">
                              <input
                                type="text"
                                value={promoCode}
                                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                placeholder="Enter promo code"
                                className="flex-1 bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors uppercase text-sm"
                              />
                              <motion.button
                                onClick={handlePromoCodeApply}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.95 }}
                                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                              >
                                Apply
                              </motion.button>
                            </div>
                            {promoDiscount > 0 && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center space-x-2"
                              >
                                <Sparkles className="w-4 h-4 text-green-400" />
                                <span className="text-green-300 text-sm font-medium">
                                  {promoDiscount * 100}% bonus applied! 
                                  {parseFloat(amount) > 0 && ` (+${(parseFloat(amount) * promoDiscount).toLocaleString('cs-CZ')} Kč)`}
                                </span>
                              </motion.div>
                            )}
                          </div>

                          {/* Affiliate Code Section */}
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <Crown className="w-4 h-4 text-blue-400" />
                              <h4 className="font-semibold text-white">Affiliate Code</h4>
                            </div>
                            <div className="flex space-x-3">
                              <input
                                type="text"
                                value={affiliateCode}
                                onChange={(e) => setAffiliateCode(e.target.value.toUpperCase())}
                                placeholder="Enter affiliate code"
                                className="flex-1 bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors uppercase text-sm"
                              />
                              <motion.button
                                onClick={handleAffiliateCodeApply}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.95 }}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                              >
                                Apply
                              </motion.button>
                            </div>
                            {affiliateBonus > 0 && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-center space-x-2"
                              >
                                <Star className="w-4 h-4 text-blue-400" />
                                <span className="text-blue-300 text-sm font-medium">
                                  Affiliate bonus: +{affiliateBonus} Kč
                                </span>
                              </motion.div>
                            )}
                          </div>

                          {/* Sample Codes */}
                          <div className="bg-gray-700/30 rounded-lg p-3 border border-gray-600/50">
                            <h5 className="text-white font-medium mb-2 text-sm">Try These Sample Codes:</h5>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="text-yellow-300">
                                <span className="font-mono bg-gray-600/50 px-2 py-1 rounded">WELCOME50</span> - Bonus
                              </div>
                              <div className="text-purple-300">
                                <span className="font-mono bg-gray-600/50 px-2 py-1 rounded">FRIEND123</span> - Referral
                              </div>
                              <div className="text-yellow-300">
                                <span className="font-mono bg-gray-600/50 px-2 py-1 rounded">TRADING20</span> - 5% bonus
                              </div>
                              <div className="text-purple-300">
                                <span className="font-mono bg-gray-600/50 px-2 py-1 rounded">STREAMER</span> - Code
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Amount Breakdown */}
                  {(parseFloat(amount) > 0 && (promoDiscount > 0 || affiliateBonus > 0)) && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-800/30 border border-gray-600/50 rounded-lg p-4"
                      style={{ boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)' }}
                    >
                      <h4 className="text-green-300 font-bold text-lg mb-4 flex items-center">
                        <DollarSign className="w-5 h-5 mr-2" />
                        Deposit Breakdown
                      </h4>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">Base Amount:</span>
                          <span className="text-white font-semibold">{parseFloat(amount).toLocaleString('cs-CZ')} Kč</span>
                        </div>
                        
                        {promoDiscount > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-green-300">Promo Bonus ({(promoDiscount * 100).toFixed(0)}%):</span>
                            <span className="text-yellow-400 font-bold">+{(parseFloat(amount) * promoDiscount).toLocaleString('cs-CZ')} Kč</span>
                          </div>
                        )}
                        
                        {affiliateBonus > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-blue-300">Affiliate Bonus:</span>
                            <span className="text-blue-400 font-bold">+{affiliateBonus.toLocaleString('cs-CZ')} Kč</span>
                          </div>
                        )}
                        
                        <div className="border-t border-gray-600/50 pt-3 flex justify-between items-center">
                          <span className="text-white font-bold">Total You'll Receive:</span>
                          <span className="text-green-400 font-bold text-lg">
                            {calculateFinalAmount().toLocaleString('cs-CZ')} Kč
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Payment Method Selection */}
                  <div className="space-y-3">
                    <div className="text-center text-gray-400 text-sm font-medium">Select Payment Method</div>

                    {/* Payment Method Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <motion.button
                        onClick={() => setPaymentMethod('revolut')}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                          paymentMethod === 'revolut'
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                        }`}
                      >
                        <div className="flex flex-col items-center space-y-2">
                          <div className="bg-white rounded-lg p-2">
                            <span className="text-black font-bold text-xl">R</span>
                          </div>
                          <span className="text-white font-semibold text-sm">Revolut</span>
                          <span className="text-gray-400 text-xs">EUR Payment</span>
                        </div>
                      </motion.button>

                      <motion.button
                        onClick={() => setPaymentMethod('payu')}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                          paymentMethod === 'payu'
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                        }`}
                      >
                        <div className="flex flex-col items-center space-y-2">
                          <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-2 w-12 h-12 flex items-center justify-center">
                            <CreditCard className="text-white" size={24} />
                          </div>
                          <span className="text-white font-semibold text-sm">PayU</span>
                          <span className="text-gray-400 text-xs">USD Payment</span>
                        </div>
                      </motion.button>
                    </div>
                  </div>

                  {/* Payment Button */}
                  <motion.button
                    onClick={paymentMethod === 'payu' ? handlePayUPayment : handleRevolutPayment}
                    disabled={!amount || parseFloat(amount) < 50 || processing}
                    whileHover={{ scale: !amount || parseFloat(amount) < 50 || processing ? 1 : 1.01 }}
                    whileTap={{ scale: !amount || parseFloat(amount) < 50 || processing ? 1 : 0.98 }}
                    className={`w-full py-4 rounded-lg font-bold transition-all duration-300 flex items-center justify-center space-x-3 ${
                      !amount || parseFloat(amount) < 50 || processing
                        ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                        : paymentMethod === 'payu'
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white'
                    }`}
                    style={
                      amount && parseFloat(amount) >= 50 && !processing ?
                      { boxShadow: paymentMethod === 'payu'
                        ? '0 4px 15px rgba(34, 197, 94, 0.4), 0 0 30px rgba(16, 185, 129, 0.2)'
                        : '0 4px 15px rgba(168, 85, 247, 0.4), 0 0 30px rgba(59, 130, 246, 0.2)'
                      } : {}
                    }
                  >
                    <div className="flex items-center space-x-3">
                      {paymentMethod === 'payu' ? (
                        <CreditCard size={20} />
                      ) : (
                        <div className="bg-white rounded-lg p-1.5">
                          <span className="text-black font-bold">R</span>
                        </div>
                      )}
                      <div className="text-center">
                        <div className="font-bold">
                          {processing ? 'Opening Checkout...' : `Pay with ${paymentMethod === 'payu' ? 'PayU' : 'Revolut'}`}
                        </div>
                        {amount && parseFloat(amount) >= 50 && !processing && (
                          <div className="text-sm opacity-90">
                            {calculateFinalAmount().toLocaleString('cs-CZ')} Kč Total
                          </div>
                        )}
                      </div>
                      {!processing && <ArrowRight size={18} />}
                    </div>
                  </motion.button>

                  {/* Security Features */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-800/30 border border-gray-600/50 rounded-lg p-3 text-center">
                      <CheckCircle className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                      <div className="text-white font-semibold">Instant</div>
                      <div className="text-gray-400 text-xs">Immediate deposit</div>
                    </div>
                    <div className="bg-gray-800/30 border border-gray-600/50 rounded-lg p-3 text-center">
                      <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
                      <div className="text-white font-semibold">Secure</div>
                      <div className="text-gray-400 text-xs">Bank-grade security</div>
                    </div>
                  </div>

                  <div className="text-center text-xs text-gray-400">
                    <p>Minimum deposit: 50 Kč • {paymentMethod === 'payu' ? 'Powered by PayU' : 'Powered by Revolut'} • Instant processing</p>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'processing' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-6"
                />
                <h4 className="text-2xl font-bold text-white mb-4">Opening {paymentMethod === 'payu' ? 'PayU' : 'Revolut'} Checkout</h4>
                <p className="text-gray-400 mb-6">Preparing your secure payment...</p>
                
                <div className="bg-gray-800/50 border border-gray-600/50 rounded-lg p-4 max-w-sm mx-auto"
                     style={{ boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)' }}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Deposit Amount:</span>
                      <span className="text-white font-semibold">{parseFloat(amount).toLocaleString('cs-CZ')} Kč</span>
                    </div>
                    {affiliateBonus > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-purple-400">Affiliate Discount:</span>
                        <span className="text-purple-400 font-bold">-{affiliateBonus.toLocaleString('cs-CZ')} Kč</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-gray-600/50 pt-2">
                      <span className="text-yellow-400 font-bold">You Pay:</span>
                      <div className="text-right">
                        <div className="text-yellow-400 font-bold text-lg">{getBonusBreakdown().paymentAmountEur.toFixed(2)} €</div>
                        <div className="text-yellow-400/60 text-xs">{getBonusBreakdown().paymentAmount.toLocaleString('cs-CZ')} Kč</div>
                      </div>
                    </div>
                    {getBonusBreakdown().promoBonus > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-green-400">Promo Bonus:</span>
                        <span className="text-green-400 font-bold">+{getBonusBreakdown().promoBonus.toLocaleString('cs-CZ')} Kč</span>
                      </div>
                    )}
                    {affiliateBonus > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-green-400">Affiliate Bonus:</span>
                        <span className="text-green-400 font-bold">+{affiliateBonus.toLocaleString('cs-CZ')} Kč</span>
                      </div>
                    )}
                    <div className="border-t border-gray-600/50 pt-3 flex items-center justify-between">
                      <span className="text-white font-bold">You Receive:</span>
                      <span className="text-green-400 font-bold text-lg">{getBonusBreakdown().finalAmount.toLocaleString('cs-CZ')} Kč</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Method:</span>
                      <span className="text-white font-medium">{paymentMethod === 'payu' ? 'PayU' : 'Revolut'} Checkout</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className="text-blue-400 font-bold">Processing...</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="text-center py-12"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                  className="w-16 h-16 bg-green-500 rounded-full mx-auto mb-6 flex items-center justify-center"
                  style={{ boxShadow: '0 8px 25px rgba(34, 197, 94, 0.4)' }}
                >
                  <CheckCircle className="w-8 h-8 text-white" />
                </motion.div>
                
                <h4 className="text-2xl font-bold text-white mb-4">Deposit Successful!</h4>
                <p className="text-gray-400 mb-6">
                  {calculateFinalAmount().toLocaleString('cs-CZ')} Kč has been added to your account
                </p>
                
                <div className="bg-gray-800/50 border border-gray-600/50 rounded-lg p-4 max-w-sm mx-auto"
                     style={{ boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)' }}>
                  <div className="space-y-2">
                    <div className="text-green-300 text-lg">
                      <span className="text-gray-400">Previous Balance:</span> 
                      <span className="font-semibold ml-2">{currentBalance.toLocaleString('cs-CZ')} Kč</span>
                    </div>
                    <div className="text-green-300">
                      <span className="text-gray-400">New Balance:</span> 
                      <span className="font-bold ml-2 text-white text-lg">
                        {(currentBalance + calculateFinalAmount()).toLocaleString('cs-CZ')} Kč
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          {step === 'main' && (
            <div className="px-6 pb-4 border-t border-gray-700/50 pt-4">
              <div className="flex items-center justify-center space-x-6 text-xs text-gray-400">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span>Instant deposit</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3 text-blue-400" />
                  <span>Bank-grade security</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3 text-purple-400" />
                  <span>No hidden fees</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DepositModal;