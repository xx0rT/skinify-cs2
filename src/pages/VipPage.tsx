import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Crown,
  Star,
  Zap,
  Shield,
  Percent,
  Sparkles,
  CheckCircle,
  X,
  Headphones,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { supabase } from '../lib/supabaseClient';

const VipPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState('VIP');
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoRenew, setAutoRenew] = useState(true);

  const vipTiers = [
    {
      name: 'Free',
      price: 0,
      features: [
        { text: 'Standard Trading', included: true },
        { text: '2% Trading Fees', included: true },
        { text: 'Basic Support', included: true },
        { text: 'Steam Integration', included: true },
        { text: 'Priority Support', included: false },
        { text: 'Reduced Fees', included: false },
        { text: 'Bonus Multiplier', included: false }
      ],
      color: 'gray',
      popular: false
    },
    {
      name: 'VIP',
      price: selectedPlan === 'monthly' ? 299 : 2990,
      period: selectedPlan === 'monthly' ? '/month' : '/year',
      savings: selectedPlan === 'yearly' ? 'Save 17%' : null,
      features: [
        { text: 'All Free Features', included: true },
        { text: '0.5% Trading Fees (75% off)', included: true },
        { text: 'Priority Support 24/7', included: true },
        { text: '5x Bonus Multiplier', included: true },
        { text: 'Instant Withdrawals', included: true },
        { text: 'Early Access to Features', included: true },
        { text: 'Advanced Security', included: true }
      ],
      color: 'purple',
      popular: true
    },
    {
      name: 'Elite',
      price: selectedPlan === 'monthly' ? 599 : 5990,
      period: selectedPlan === 'monthly' ? '/month' : '/year',
      savings: selectedPlan === 'yearly' ? 'Save 17%' : null,
      features: [
        { text: 'All VIP Features', included: true },
        { text: '0% Trading Fees', included: true },
        { text: 'Dedicated Account Manager', included: true },
        { text: '10x Bonus Multiplier', included: true },
        { text: 'Private Trade Deals', included: true },
        { text: 'Custom Shop URL', included: true },
        { text: 'Analytics Dashboard', included: true }
      ],
      color: 'pink',
      popular: false
    }
  ];

  const benefits = [
    {
      icon: <Percent className="w-8 h-8" />,
      title: 'Reduced Trading Fees',
      description: 'Save up to 100% on trading fees with VIP and Elite memberships'
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Instant Withdrawals',
      description: 'Get your funds immediately without any waiting periods'
    },
    {
      icon: <Star className="w-8 h-8" />,
      title: 'Bonus Multipliers',
      description: 'Earn 5-10x more rewards on all your trading activities'
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'Enhanced Security',
      description: 'Advanced fraud protection and secure trading environment'
    },
    {
      icon: <Headphones className="w-8 h-8" />,
      title: 'Priority Support',
      description: '24/7 dedicated support team ready to help you instantly'
    },
    {
      icon: <Eye className="w-8 h-8" />,
      title: 'Early Access',
      description: 'Be the first to try new features and exclusive items'
    }
  ];

  const faqs = [
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major payment methods including credit cards, PayPal, bank transfers, and cryptocurrency.'
    },
    {
      question: 'Can I cancel my VIP subscription?',
      answer: 'Yes, you can cancel anytime. Your VIP benefits will remain active until the end of your billing period.'
    },
    {
      question: 'What happens to my fees when I upgrade?',
      answer: 'Your reduced fee rate applies immediately after upgrading, and you can start saving on all future trades.'
    },
    {
      question: 'Is there a trial period?',
      answer: 'We offer a 7-day money-back guarantee for all VIP plans. Try risk-free!'
    }
  ];

  const handleUpgrade = async (tier: string) => {
    if (!user) {
      addToast({
        type: 'error',
        message: 'Please sign in to upgrade your account'
      });
      return;
    }

    if (tier === 'Free') {
      addToast({
        type: 'info',
        message: 'You already have a free account'
      });
      return;
    }

    setSelectedTier(tier);
    setShowUpgradeModal(true);
  };

  const handleConfirmUpgrade = async () => {
    if (!user || !selectedTier || selectedTier === 'Free') return;

    setIsProcessing(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      console.log('Creating subscription for user:', user.steamId);
      console.log('Tier:', selectedTier, 'Plan:', selectedPlan);

      const response = await fetch(`${supabaseUrl}/functions/v1/vip-subscription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          steam_id: user.steamId,
          tier: selectedTier.toLowerCase(),
          plan_type: selectedPlan,
          auto_renew: autoRenew
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create subscription');
      }

      if (data.checkout_url) {
        addToast({
          type: 'success',
          title: 'Redirecting to Payment',
          message: `Processing your ${selectedTier} subscription...`
        });

        window.location.href = data.checkout_url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      addToast({
        type: 'error',
        title: 'Subscription Failed',
        message: error.message || 'Failed to process subscription. Please try again.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(18, 24, 39)' }}>
      <Header
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        hideRefill={true}
        hideLanguage={true}
        hideTheme={true}
      />

      <div className="max-w-7xl mx-auto px-4 py-16 mt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-full px-4 py-2 mb-6">
            <Crown className="w-5 h-5 text-purple-400" />
            <span className="text-purple-300 font-medium">Premium Membership Plans</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              Unlock VIP Benefits
            </span>
          </h1>

          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
            Save on fees, earn more rewards, and get priority support with our VIP membership
          </p>

          <div className="inline-flex items-center bg-gray-800/50 border border-purple-500/30 rounded-full p-1">
            <button
              onClick={() => setSelectedPlan('monthly')}
              className={`px-6 py-2 rounded-full transition-all ${
                selectedPlan === 'monthly'
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setSelectedPlan('yearly')}
              className={`px-6 py-2 rounded-full transition-all relative ${
                selectedPlan === 'yearly'
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Yearly
              <span className="absolute -top-2 -right-2 bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full">
                Save 17%
              </span>
            </button>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {vipTiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-2xl border ${
                tier.popular
                  ? 'border-purple-500/50 bg-gradient-to-br from-purple-500/10 to-pink-500/10'
                  : 'border-gray-700/50 bg-gray-800/50'
              } p-8`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                    <Star size={14} fill="currentColor" />
                    Most Popular
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{tier.price} Kč</span>
                  {tier.period && <span className="text-gray-400">{tier.period}</span>}
                </div>
                {tier.savings && (
                  <span className="text-purple-400 text-sm font-medium">{tier.savings}</span>
                )}
              </div>

              <ul className="space-y-4 mb-8">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    {feature.included ? (
                      <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={feature.included ? 'text-gray-300' : 'text-gray-600'}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(tier.name)}
                disabled={tier.price === 0}
                className={`w-full py-3 rounded-xl font-semibold transition-all ${
                  tier.popular
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                    : tier.price === 0
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30'
                }`}
              >
                {tier.price === 0 ? 'Current Plan' : `Upgrade to ${tier.name}`}
              </button>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-20"
        >
          <h2 className="text-3xl font-bold text-center mb-12">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Why Upgrade to VIP?
            </span>
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gradient-to-br from-gray-800/50 to-purple-900/20 rounded-xl border border-purple-500/20 p-6 hover:border-purple-500/40 transition-all"
              >
                <div className="text-purple-400 mb-4">{benefit.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2">{benefit.title}</h3>
                <p className="text-gray-400">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl border border-purple-500/30 p-12 mb-20"
        >
          <div className="text-center">
            <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-4">
              Calculate Your Savings
            </h2>
            <p className="text-gray-300 mb-6">
              Trade 100,000 Kč monthly and save up to 1,500 Kč/month with VIP
            </p>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-gray-800/50 rounded-xl p-6 border border-purple-500/20">
                <div className="text-gray-400 mb-2">Free Plan</div>
                <div className="text-3xl font-bold text-white">2,000 Kč</div>
                <div className="text-sm text-gray-500 mt-1">2% fees</div>
              </div>
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-6 border border-purple-500/50">
                <div className="text-purple-300 mb-2">VIP Plan</div>
                <div className="text-3xl font-bold text-white">500 Kč</div>
                <div className="text-sm text-purple-400 mt-1">0.5% fees - Save 1,500 Kč/mo</div>
              </div>
              <div className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-xl p-6 border border-pink-500/50">
                <div className="text-pink-300 mb-2">Elite Plan</div>
                <div className="text-3xl font-bold text-white">0 Kč</div>
                <div className="text-sm text-pink-400 mt-1">0% fees - Save 2,000 Kč/mo</div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-20"
        >
          <h2 className="text-3xl font-bold text-center mb-12">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Frequently Asked Questions
            </span>
          </h2>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-gray-800/50 border border-purple-500/20 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                  className="w-full p-6 flex items-center justify-between hover:bg-purple-500/5 transition-all"
                >
                  <span className="text-white font-semibold text-left">{faq.question}</span>
                  {openFAQ === index ? (
                    <ChevronUp className="w-5 h-5 text-purple-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-purple-400" />
                  )}
                </button>
                {openFAQ === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-6 pb-6"
                  >
                    <p className="text-gray-400">{faq.answer}</p>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <Footer />

      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-gray-900 to-purple-900/30 rounded-2xl border border-purple-500/30 p-8 max-w-md w-full"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Upgrade to VIP</h3>
                <p className="text-gray-400">Complete your purchase</p>
              </div>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-300">{selectedTier} Membership</span>
                <span className="text-white font-bold">
                  {selectedTier === 'VIP'
                    ? (selectedPlan === 'monthly' ? '299 Kč/month' : '2,990 Kč/year')
                    : (selectedPlan === 'monthly' ? '599 Kč/month' : '5,990 Kč/year')
                  }
                </span>
              </div>
              {selectedPlan === 'yearly' && (
                <div className="text-sm text-purple-400 mb-4">
                  💎 You save 17% with yearly plan
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-purple-500/20">
                <div>
                  <div className="text-white font-medium">Auto-renewal</div>
                  <div className="text-sm text-gray-400">Automatically renew at the end of billing period</div>
                </div>
                <button
                  onClick={() => setAutoRenew(!autoRenew)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoRenew ? 'bg-purple-500' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoRenew ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <button
              onClick={handleConfirmUpgrade}
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Proceed to Payment'}
            </button>

            <p className="text-center text-gray-500 text-sm mt-4">
              7-day money back guarantee
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default VipPage;
