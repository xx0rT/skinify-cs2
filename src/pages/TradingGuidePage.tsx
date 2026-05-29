import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Shield, 
  AlertCircle, 
  CheckCircle, 
  Users, 
  DollarSign, 
  Clock, 
  Star,
  TrendingUp,
  Eye,
  Lock,
  Zap,
  Award,
  Play,
  BookOpen,
  Target,
  Lightbulb,
  ArrowRight,
  Download,
  ExternalLink,
  Gamepad2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const TradingGuidePage: React.FC = () => {
  const [activeGuideSection, setActiveGuideSection] = useState('beginner');
  const [currentStep, setCurrentStep] = useState(1);

  const guideSteps = [
    {
      id: 1,
      title: 'Create Your Account',
      description: 'Sign in securely with Steam',
      details: 'Connect your Steam account to access all marketplace features. Your Steam Guard must be enabled.',
      icon: <Shield className="w-6 h-6" />,
      color: 'blue'
    },
    {
      id: 2,
      title: 'Browse the Market',
      description: 'Find items you want to buy',
      details: 'Use our advanced filters to find the perfect items. Check seller ratings and item history.',
      icon: <Eye className="w-6 h-6" />,
      color: 'green'
    },
    {
      id: 3,
      title: 'Make Secure Payment',
      description: 'Pay through our escrow system',
      details: 'Your payment is held safely until the trade is completed. Multiple payment methods available.',
      icon: <Lock className="w-6 h-6" />,
      color: 'purple'
    },
    {
      id: 4,
      title: 'Complete the Trade',
      description: 'Receive your items instantly',
      details: 'Items are sent directly via Steam trade. Confirm receipt to release payment to seller.',
      icon: <Zap className="w-6 h-6" />,
      color: 'orange'
    }
  ];

  const tradingTips = [
    {
      category: 'For Beginners',
      icon: <BookOpen className="w-8 h-8 text-blue-500" />,
      color: 'blue',
      tips: [
        { text: 'Start with smaller purchases to build confidence', icon: '🎯' },
        { text: 'Always check seller ratings before buying', icon: '⭐' },
        { text: 'Use the item inspection tool to verify details', icon: '🔍' },
        { text: 'Keep your Steam Guard enabled at all times', icon: '🛡️' },
        { text: 'Read item descriptions carefully', icon: '📖' }
      ]
    },
    {
      category: 'For Sellers',
      icon: <Target className="w-8 h-8 text-green-500" />,
      color: 'green',
      tips: [
        { text: 'Price competitively using our market data', icon: '💰' },
        { text: 'Provide detailed item descriptions', icon: '📝' },
        { text: 'Respond quickly to buyer messages', icon: '⚡' },
        { text: 'Maintain high seller ratings', icon: '🏆' },
        { text: 'Upload high-quality item screenshots', icon: '📸' }
      ]
    },
    {
      category: 'Advanced Strategies',
      icon: <Lightbulb className="w-8 h-8 text-purple-500" />,
      color: 'purple',
      tips: [
        { text: 'Monitor market trends for profitable opportunities', icon: '📊' },
        { text: 'Build relationships with trusted traders', icon: '🤝' },
        { text: 'Use price alerts for items you want', icon: '🔔' },
        { text: 'Consider float values and patterns for rare items', icon: '💎' },
        { text: 'Diversify your inventory across different items', icon: '🌟' }
      ]
    }
  ];

  const securityFeatures = [
    {
      title: 'Escrow Protection',
      description: 'Your payment is held securely until trade completion',
      icon: <Shield className="w-12 h-12 text-blue-500" />,
      stats: '99.9% Success Rate'
    },
    {
      title: 'Steam Integration',
      description: 'Direct integration with Steam for authentic trades',
      icon: <Gamepad2 className="w-12 h-12 text-green-500" />,
      stats: 'Official API'
    },
    {
      title: 'Fraud Detection',
      description: 'Advanced AI systems detect and prevent fraud',
      icon: <Eye className="w-12 h-12 text-purple-500" />,
      stats: '24/7 Monitoring'
    },
    {
      title: 'Dispute Resolution',
      description: 'Professional team handles any trade disputes',
      icon: <Users className="w-12 h-12 text-orange-500" />,
      stats: '<2 Hour Response'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white overflow-x-hidden">
      <Header />
      
      {/* Hero Section */}
      <div className="relative pt-20 pb-32 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(239, 68, 68, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 40% 60%, rgba(34, 197, 94, 0.3) 0%, transparent 50%)
            `
          }} />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-12"
          >
            <Link 
              to="/" 
              className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors group"
            >
              <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-7xl font-bold mb-8 bg-gradient-to-r from-blue-400 via-purple-500 to-orange-500 bg-clip-text text-transparent">
              Master CS2 Trading
            </h1>
            <p className="text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Complete guide to safe, profitable, and successful trading on Skinify. 
              From beginner basics to advanced strategies.
            </p>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-12">
              {[
                { label: 'Traders Trained', value: '500K+', color: 'blue' },
                { label: 'Success Rate', value: '99.8%', color: 'green' },
                { label: 'Avg. Profit', value: '+24%', color: 'purple' },
                { label: 'Guide Rating', value: '4.9/5', color: 'orange' }
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className={`bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-${stat.color}-500/20`}
                >
                  <div className={`text-3xl font-bold text-${stat.color}-400 mb-2`}>
                    {stat.value}
                  </div>
                  <div className="text-gray-400 text-sm">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Interactive Step-by-Step Guide */}
      <div className="py-20 bg-gray-900/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
              How Trading Works
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Follow this step-by-step process to make your first successful trade
            </p>
          </motion.div>

          {/* Interactive Steps */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Step Navigation */}
            <div className="space-y-6">
              {guideSteps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setCurrentStep(step.id)}
                  className={`cursor-pointer transition-all duration-300 ${
                    currentStep === step.id ? 'scale-105' : 'hover:scale-102'
                  }`}
                >
                  <div className={`bg-gradient-to-r p-6 rounded-xl border-2 transition-all duration-300 ${
                    currentStep === step.id 
                      ? `from-${step.color}-500/20 to-${step.color}-600/20 border-${step.color}-500/50 shadow-lg shadow-${step.color}-500/20` 
                      : 'from-gray-800/50 to-gray-700/50 border-gray-600/30 hover:border-gray-500/50'
                  }`}>
                    <div className="flex items-center space-x-4">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                        currentStep === step.id 
                          ? `bg-${step.color}-500 text-white shadow-lg shadow-${step.color}-500/30` 
                          : 'bg-gray-700 text-gray-300'
                      } transition-all duration-300`}>
                        {step.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-xl font-bold mb-2 ${
                          currentStep === step.id ? `text-${step.color}-300` : 'text-white'
                        } transition-colors`}>
                          {step.title}
                        </h3>
                        <p className="text-gray-400 mb-2">{step.description}</p>
                        <p className={`text-sm ${
                          currentStep === step.id ? 'text-gray-300' : 'text-gray-500'
                        }`}>
                          {step.details}
                        </p>
                      </div>
                      <div className={`text-2xl font-bold ${
                        currentStep === step.id ? `text-${step.color}-400` : 'text-gray-600'
                      }`}>
                        {step.id}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Visual Demonstration */}
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-600/30"
            >
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-6 text-white">
                  Step {currentStep}: {guideSteps[currentStep - 1].title}
                </h3>
                
                {/* Mock Visual Demo based on current step */}
                <div className="bg-gray-900/50 rounded-xl p-8 mb-6 min-h-[300px] flex items-center justify-center">
                  {currentStep === 1 && (
                    <div className="text-center space-y-4">
                      <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full mx-auto flex items-center justify-center mb-4">
                        <Gamepad2 className="w-12 h-12 text-white" />
                      </div>
                      <p className="text-lg text-gray-300">Steam Login Integration</p>
                      <button className="bg-[#171a21] text-white px-6 py-3 rounded-lg hover:bg-[#2a475e] transition-colors flex items-center space-x-2 mx-auto">
                        <Gamepad2 className="w-5 h-5" />
                        <span>Sign in with Steam</span>
                      </button>
                    </div>
                  )}
                  
                  {currentStep === 2 && (
                    <div className="w-full space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        {['AK-47 | Redline', 'AWP | Dragon Lore'].map((item, i) => (
                          <div key={i} className="bg-gray-700/50 rounded-lg p-4">
                            <div className="w-full h-20 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded mb-3 flex items-center justify-center">
                              <div className="text-orange-400 text-2xl">🔫</div>
                            </div>
                            <h4 className="text-sm font-medium text-white">{item}</h4>
                            <p className="text-blue-400 text-sm">{i === 0 ? '4,200 Kč' : '95,000 Kč'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {currentStep === 3 && (
                    <div className="text-center space-y-6">
                      <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-purple-700 rounded-full mx-auto flex items-center justify-center">
                        <Lock className="w-10 h-10 text-white" />
                      </div>
                      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-6">
                        <h4 className="text-lg font-bold text-purple-300 mb-3">Escrow Protection Active</h4>
                        <p className="text-gray-300 text-sm">Your payment is held safely until trade completion</p>
                      </div>
                    </div>
                  )}
                  
                  {currentStep === 4 && (
                    <div className="text-center space-y-6">
                      <div className="flex justify-center space-x-8">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                            <CheckCircle className="w-8 h-8 text-white" />
                          </div>
                          <p className="text-sm text-green-400">Items Received</p>
                        </div>
                        <ArrowRight className="w-8 h-8 text-gray-400 mt-4" />
                        <div className="text-center">
                          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                            <DollarSign className="w-8 h-8 text-white" />
                          </div>
                          <p className="text-sm text-blue-400">Payment Released</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-center space-x-2">
                  {guideSteps.map((step) => (
                    <button
                      key={step.id}
                      onClick={() => setCurrentStep(step.id)}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        currentStep === step.id ? 'bg-blue-500 scale-125' : 'bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Security Features */}
      <div className="py-20 bg-gradient-to-b from-gray-800/30 to-gray-900/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent">
              Why Skinify is Safe
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Advanced security measures protect every transaction
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {securityFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 text-center border border-gray-600/30 hover:border-gray-500/50 transition-all duration-300 group"
              >
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                  className="mb-6"
                >
                  {feature.icon}
                </motion.div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-400 mb-4 group-hover:text-gray-300 transition-colors">
                  {feature.description}
                </p>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2">
                  <span className="text-blue-400 font-bold text-sm">{feature.stats}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Trading Tips by Category */}
      <div className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              Pro Trading Tips
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Learn from the experts and master the art of CS2 trading
            </p>
          </motion.div>

          <div className="space-y-12">
            {tradingTips.map((category, categoryIndex) => (
              <motion.div
                key={category.category}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: categoryIndex * 0.2 }}
                className="relative"
              >
                {/* Category Header */}
                <div className="flex items-center space-x-4 mb-8">
                  <motion.div
                    whileHover={{ rotate: 15, scale: 1.1 }}
                    className={`bg-${category.color}-500/20 border border-${category.color}-500/30 rounded-xl p-4`}
                  >
                    {category.icon}
                  </motion.div>
                  <h3 className="text-3xl font-bold text-white">{category.category}</h3>
                </div>

                {/* Tips Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {category.tips.map((tip, tipIndex) => (
                    <motion.div
                      key={tipIndex}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: tipIndex * 0.1 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      className={`bg-gradient-to-br from-gray-800/70 to-gray-900/70 backdrop-blur-sm rounded-xl p-6 border border-${category.color}-500/20 hover:border-${category.color}-500/40 transition-all duration-300 group`}
                    >
                      <div className="flex items-start space-x-4">
                        <div className="text-3xl flex-shrink-0 group-hover:scale-110 transition-transform">
                          {tip.icon}
                        </div>
                        <p className="text-gray-300 group-hover:text-white transition-colors leading-relaxed">
                          {tip.text}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Fees and Pricing */}
      <div className="py-20 bg-gray-900/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Transparent Pricing
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Simple, fair pricing with no hidden costs
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Trading Fees */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-sm rounded-xl p-8 border border-yellow-500/20 hover:border-yellow-500/40 transition-all duration-300"
            >
              <DollarSign className="w-12 h-12 text-yellow-500 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-white mb-6 text-center">Trading Fees</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Base Fee:</span>
                  <span className="text-2xl font-bold text-yellow-400">2.0%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Volume Discount:</span>
                  <span className="text-lg font-bold text-green-400">up to -0.5%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Withdrawal Fee:</span>
                  <span className="text-lg font-bold text-blue-400">1.5%</span>
                </div>
              </div>
              <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-300 text-sm text-center">
                  Among the lowest fees in the industry
                </p>
              </div>
            </motion.div>

            {/* Payment Methods */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-xl p-8 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300"
            >
              <Lock className="w-12 h-12 text-blue-500 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-white mb-6 text-center">Payment Methods</h3>
              <div className="space-y-3">
                {[
                  '💳 Credit/Debit Cards',
                  '🏦 Bank Transfer', 
                  '₿ Cryptocurrency',
                  '💰 PayPal',
                  '🎮 Steam Wallet'
                ].map((method, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg">
                    <span className="text-lg">{method.split(' ')[0]}</span>
                    <span className="text-gray-300">{method.split(' ').slice(1).join(' ')}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Market Analytics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-green-500/10 to-teal-500/10 backdrop-blur-sm rounded-xl p-8 border border-green-500/20 hover:border-green-500/40 transition-all duration-300"
            >
              <TrendingUp className="w-12 h-12 text-green-500 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-white mb-6 text-center">Market Tools</h3>
              <div className="space-y-3">
                {[
                  '📊 Real-time price tracking',
                  '📈 Historical price data',
                  '🔔 Price alerts & notifications',
                  '🎯 Market trend analysis',
                  '💡 Investment recommendations'
                ].map((tool, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg">
                    <span className="text-lg">{tool.split(' ')[0]}</span>
                    <span className="text-gray-300">{tool.split(' ').slice(1).join(' ')}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Advanced Trading Strategies */}
      <div className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Advanced Strategies
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Take your trading to the next level with these proven techniques
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Strategy Cards */}
            <div className="space-y-8">
              {[
                {
                  title: 'Market Timing',
                  description: 'Learn when to buy and sell for maximum profit',
                  icon: <Clock className="w-8 h-8 text-blue-500" />,
                  points: [
                    'Monitor major tournament schedules',
                    'Track operation and case release dates',
                    'Watch for Steam sale periods',
                    'Analyze seasonal price patterns'
                  ]
                },
                {
                  title: 'Portfolio Diversification',
                  description: 'Spread risk across different item types and price ranges',
                  icon: <Target className="w-8 h-8 text-green-500" />,
                  points: [
                    'Mix high and low-value items',
                    'Diversify across weapon categories',
                    'Include both popular and niche items',
                    'Balance liquid and collectible items'
                  ]
                },
                {
                  title: 'Technical Analysis',
                  description: 'Use data to make informed trading decisions',
                  icon: <TrendingUp className="w-8 h-8 text-purple-500" />,
                  points: [
                    'Study float value distributions',
                    'Analyze sticker value impacts',
                    'Track volume and liquidity metrics',
                    'Monitor price support and resistance'
                  ]
                }
              ].map((strategy, index) => (
                <motion.div
                  key={strategy.title}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-600/30 hover:border-gray-500/50 transition-all duration-300 group"
                >
                  <div className="flex items-center space-x-4 mb-6">
                    <motion.div
                      whileHover={{ rotate: 15 }}
                      className="bg-gray-700/50 rounded-lg p-3 group-hover:bg-gray-600/50 transition-colors"
                    >
                      {strategy.icon}
                    </motion.div>
                    <div>
                      <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                        {strategy.title}
                      </h3>
                      <p className="text-gray-400 group-hover:text-gray-300 transition-colors">
                        {strategy.description}
                      </p>
                    </div>
                  </div>
                  
                  <ul className="space-y-3">
                    {strategy.points.map((point, pointIndex) => (
                      <motion.li
                        key={pointIndex}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 + pointIndex * 0.05 }}
                        className="flex items-center space-x-3 text-gray-300 group-hover:text-white transition-colors"
                      >
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                        <span>{point}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>

            {/* Interactive Fee Calculator */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-gray-800/70 to-gray-900/70 backdrop-blur-sm rounded-2xl p-8 border border-gray-600/30 h-fit sticky top-24"
            >
              <h3 className="text-2xl font-bold text-white mb-6 text-center">Fee Calculator</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Sale Amount</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      defaultValue={10000}
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 pr-12 text-white text-lg font-semibold"
                      placeholder="Enter amount"
                    />
                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">Kč</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Trading Volume</label>
                  <select className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white">
                    <option>0 - 50K Kč (2.0% fee)</option>
                    <option>50K - 200K Kč (1.8% fee)</option>
                    <option>200K+ Kč (1.5% fee)</option>
                  </select>
                </div>

                {/* Fee Breakdown */}
                <div className="bg-gray-700/30 rounded-lg p-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Trading Fee (2%)</span>
                    <span className="text-white font-semibold">200 Kč</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Withdrawal Fee (1.5%)</span>
                    <span className="text-white font-semibold">150 Kč</span>
                  </div>
                  <div className="border-t border-gray-600 pt-3 flex justify-between">
                    <span className="text-gray-200 font-semibold">You Receive:</span>
                    <span className="text-green-400 font-bold text-lg">9,650 Kč</span>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-4 rounded-lg font-semibold transition-all duration-300"
                  style={{ boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)' }}
                >
                  Start Trading Now
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="py-20 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-orange-600/20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <Award className="w-20 h-20 text-yellow-500 mx-auto mb-8" />
            <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
              Ready to Master Trading?
            </h2>
            <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
              Join over 1 million traders who trust Skinify for secure, profitable CS2 trading
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.href = '/marketplace'}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-10 py-4 rounded-lg font-bold text-lg transition-all duration-300 flex items-center justify-center space-x-2"
                style={{ boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)' }}
              >
                <Play className="w-6 h-6" />
                <span>Start Trading</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.href = '/contact'}
                className="border-2 border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white px-10 py-4 rounded-lg font-bold text-lg transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <Users className="w-6 h-6" />
                <span>Get Expert Help</span>
              </motion.button>
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
              {[
                { icon: '🛡️', label: 'Secure Trades', value: '100%' },
                { icon: '⚡', label: 'Instant Delivery', value: '<1 min' },
                { icon: '💎', label: 'Premium Items', value: '50K+' },
                { icon: '🏆', label: 'User Rating', value: '4.9/5' }
              ].map((indicator, index) => (
                <motion.div
                  key={indicator.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="text-4xl mb-3">{indicator.icon}</div>
                  <div className="text-2xl font-bold text-white mb-1">{indicator.value}</div>
                  <div className="text-gray-400 text-sm">{indicator.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default TradingGuidePage;