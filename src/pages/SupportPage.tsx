import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronDown, 
  User,
  Settings,
  Home,
  CreditCard,
  Wallet,
  Gift,
  Crown,
  Star,
  TrendingUp,
  ShoppingCart,
  MessageCircle,
  Package,
  Trophy,
  Send,
  Plus,
  HelpCircle,
  Mail,
  Phone,
  Clock,
  Shield,
  Zap,
  CheckCircle,
  Headphones,
  FileText,
  BookOpen,
  AlertCircle,
  ExternalLink,
  DollarSign,
  Search,
  Filter,
  ChevronUp,
  ArrowLeft,
  Lightbulb,
  Users,
  Globe,
  Lock,
  Eye,
  Camera,
  Video,
  Download,
  Heart
} from 'lucide-react';
// Chat widget temporarily disabled due to dependency conflict
// import { Widget, addResponseMessage, addUserMessage, dropMessages } from 'react-chat-widget';
// import 'react-chat-widget/lib/styles.css';
import { Flipper, Flipped } from 'react-flip-toolkit';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useCartStore } from '../store/cartStore';
import ToastContainer from '../components/ui/ToastContainer';
import SteamLogin from '../components/auth/SteamLogin';
import UserProfile from '../components/auth/UserProfile';

const SupportPage: React.FC = () => {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();
  const [selectedLanguage, setSelectedLanguage] = useState('EN');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [activeSection, setActiveSection] = useState('Support');
  const [hoveredNavItem, setHoveredNavItem] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [sidebarY, setSidebarY] = useState(0);
  const [sidebarOpacity, setSidebarOpacity] = useState(1);
  const { getItemCount } = useCartStore();
  const cartCount = getItemCount();

  const sidebarSections = [
    {
      name: 'Navigation',
      items: [
        { icon: Home, label: 'Home', active: false, onClick: () => { navigate('/'); setActiveSection('Market'); } },
        { icon: User, label: 'Profile', active: false, onClick: () => { navigate('/profile'); setActiveSection('Profile'); } }
      ]
    },
    {
      name: 'Trading',
      items: [
        { icon: Star, label: 'Rewards', active: false, onClick: () => { navigate('/rewards'); setActiveSection('Rewards'); } },
        { icon: TrendingUp, label: 'Stats', active: false, onClick: () => navigate('/profile?tab=overview') }
      ]
    },
    {
      name: 'Wallet',
      items: [
        { icon: CreditCard, label: 'Deposit', active: false, onClick: () => navigate('/profile?tab=balance') },
        { icon: Wallet, label: 'Withdraw', active: false, onClick: () => navigate('/profile?tab=balance') }
      ]
    },
    {
      name: 'Features',
      items: [
        { icon: Users, label: 'Referral', active: false, onClick: () => navigate('/referral') },
        { icon: Crown, label: 'VIP', active: false, onClick: () => { navigate('/vip'); setActiveSection('VIP'); } },
        { icon: Settings, label: 'Settings', active: false, onClick: () => navigate('/profile?tab=settings') }
      ]
    }
  ];

  const languages = [
    { code: 'EN', flag: '🇬🇧', name: 'English' },
    { code: 'ES', flag: '🇪🇸', name: 'Español' },
    { code: 'DE', flag: '🇩🇪', name: 'Deutsch' },
    { code: 'FR', flag: '🇫🇷', name: 'Français' }
  ];

  const navigationItems = [
    { name: 'Market', href: '/', icon: ShoppingCart, onClick: () => { setActiveSection('Market'); navigate('/'); } },
    { name: 'Referral', href: '/referral', icon: Users, onClick: () => { setActiveSection('Referral'); navigate('/referral'); } },
    { name: 'FAQ', href: '/faq', icon: HelpCircle, onClick: () => { setActiveSection('FAQ'); navigate('/faq'); } },
    { name: 'Bonuses', href: '/bonuses', icon: Gift, onClick: () => { setActiveSection('Bonuses'); navigate('/bonuses'); } },
    { name: 'Claims', href: '/claims', icon: Trophy, onClick: () => { setActiveSection('Claims'); addToast({ type: 'info', title: 'Coming Soon', message: 'Claims system coming soon!' }); } }
  ];

  const handleNavigation = (item: any) => {
    if (item.onClick) {
      item.onClick();
    }
  };

  // FAQ Data
  const faqCategories = ['All', 'Account', 'Trading', 'Payment', 'Security', 'Technical'];

  const faqData = [
    {
      id: 1,
      category: 'Account',
      question: 'How do I create an account?',
      answer: 'Simply click "Sign in with Steam" and authorize through Steam\'s official login. No additional registration needed - your Steam account becomes your Skinify account automatically.'
    },
    {
      id: 2,
      category: 'Account',
      question: 'How do I set up my trade link?',
      answer: 'Go to your Profile → Settings and enter your Steam trade URL. Get it from Steam by visiting your Trade Offers page and clicking "Who can send me trade offers?"'
    },
    {
      id: 3,
      category: 'Trading',
      question: 'How long do trades take to complete?',
      answer: 'Most trades complete within minutes! Once you purchase an item, sellers are notified immediately and typically send Steam trade offers within 5-10 minutes.'
    },
    {
      id: 4,
      category: 'Trading',
      question: 'What happens if I don\'t receive my items?',
      answer: 'Your payment is protected by our escrow system. If you don\'t receive items within 48 hours, funds are automatically refunded. You can also contact support immediately.'
    },
    {
      id: 5,
      category: 'Payment',
      question: 'What payment methods do you accept?',
      answer: 'We support credit/debit cards, Revolut, PayPal, bank transfers, and cryptocurrencies. All payments are processed securely through certified payment providers.'
    },
    {
      id: 6,
      category: 'Payment',
      question: 'Are there any fees?',
      answer: 'We charge a 2% trading fee (among the lowest in the industry) with volume discounts available. Withdrawal fee is 1.5%. All fees are clearly shown before transactions.'
    },
    {
      id: 7,
      category: 'Security',
      question: 'Is it safe to trade on Skinify?',
      answer: 'Absolutely! We use Steam authentication, escrow protection, fraud detection, SSL encryption, and 24/7 monitoring. We have a 99.9% successful trade rate.'
    },
    {
      id: 8,
      category: 'Security',
      question: 'What is escrow protection?',
      answer: 'Escrow holds your payment securely until you receive and confirm your items. Sellers only get paid after you confirm receipt, ensuring protection for both parties.'
    },
    {
      id: 9,
      category: 'Technical',
      question: 'Why can\'t I see my Steam inventory?',
      answer: 'Your Steam inventory might be set to private. Go to Steam Profile Privacy Settings and set your Inventory to Public. Changes can take 15-30 minutes to take effect.'
    },
    {
      id: 10,
      category: 'Technical',
      question: 'The site is loading slowly, what should I do?',
      answer: 'Try refreshing the page, clearing your browser cache, or switching to a different browser. If issues persist, it might be a temporary Steam API delay.'
    },
    {
      id: 11,
      category: 'Payment',
      question: 'How do I withdraw my funds?',
      answer: 'Go to Profile → Balance and click "Withdraw Funds". Choose your preferred method (bank transfer, PayPal, etc.) and enter the amount. Withdrawals process within 24 hours.'
    },
    {
      id: 12,
      category: 'Trading',
      question: 'Can I sell my own items?',
      answer: 'Yes! Go to your Profile → Inventory, select items from your Steam inventory, set prices, and list them for sale. Items appear in the marketplace immediately.'
    }
  ];

  const filteredFAQ = faqData.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
                         item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleFAQ = (id: number) => {
    setOpenFAQ(openFAQ === id ? null : id);
  };

  // Chat widget handlers
  const handleNewUserMessage = (newMessage: string) => {
    console.log('New message from user:', newMessage);
    
    // Simulate agent response after delay
    setTimeout(() => {
      const responses = [
        "Thank you for your message! A support agent will assist you shortly.",
        "I understand your inquiry. Let me check this for you...",
        "Thanks for reaching out! I'm looking into this now.",
        "Hi! I'm here to help. Let me review your question."
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      // addResponseMessage(randomResponse);
    }, 1000 + Math.random() * 2000);
  };

  // Initialize chat when user is available
  React.useEffect(() => {
    // Chat widget disabled
    // if (user) {
    //   dropMessages();
    //   setTimeout(() => {
    //     addResponseMessage(`Hello ${user.displayName}! 👋 Welcome to Skinify support. How can I help you today?`);
    //   }, 1000);
    // }
  }, [user]);

  const supportCategories = [
    {
      title: 'Account & Login',
      icon: User,
      color: 'blue',
      items: [
        { title: 'Steam Authentication Issues', description: 'Problems logging in with Steam', urgent: false },
        { title: 'Account Recovery', description: 'Lost access to your account', urgent: true },
        { title: 'Profile Setup Help', description: 'Setting up trade links and preferences', urgent: false },
        { title: 'Account Security', description: 'Suspicious activity or security concerns', urgent: true }
      ]
    },
    {
      title: 'Trading & Orders',
      icon: Package,
      color: 'green',
      items: [
        { title: 'Order Status', description: 'Check your purchase or sale status', urgent: false },
        { title: 'Missing Items', description: 'Items not received after purchase', urgent: true },
        { title: 'Steam Trade Issues', description: 'Problems with Steam trade offers', urgent: false },
        { title: 'Refund Request', description: 'Request refund for failed trade', urgent: true }
      ]
    },
    {
      title: 'Payments & Balance',
      icon: CreditCard,
      color: 'purple',
      items: [
        { title: 'Deposit Problems', description: 'Issues adding funds to account', urgent: true },
        { title: 'Withdrawal Issues', description: 'Problems withdrawing funds', urgent: true },
        { title: 'Payment Methods', description: 'Questions about supported payments', urgent: false },
        { title: 'Transaction History', description: 'View or dispute transactions', urgent: false }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-hidden">
      <ToastContainer />
      
      {/* Chat Widget */}
      {/* Chat widget temporarily disabled */}
      
      {/* Main Layout */}
      <div className="flex min-h-screen">
        {/* Left Sidebar */}
        <div className="group fixed left-0 top-0 h-full z-40 w-16 hover:w-64 bg-gray-800/80 backdrop-blur-md border-r border-gray-700/50 flex flex-col transition-all duration-300 ease-in-out py-4 shadow-xl">
          {/* Logo */}
          <div className="h-12 flex items-center justify-center mb-4 mx-auto group-hover:mx-3 overflow-hidden">
            <div className="relative flex items-center">
              <motion.img
                src="https://i.postimg.cc/rsN3wQRf/skinfy1-2-removebg-preview.png"
                alt="Skinify Logo"
                className="h-10 w-auto object-contain"
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
              
              <div className="hidden group-hover:block">
                <motion.img
                  src="https://i.postimg.cc/xqdxTY2d/skinify2-2-removebg-preview.png"
                  alt="Skinify Logo Extended"
                  className="h-10 w-auto object-contain"
                  initial={{ opacity: 0, x: -20, scale: 0.8 }}
                  animate={{ 
                    opacity: 1, 
                    x: 0, 
                    scale: 1,
                    transition: { 
                      delay: 0.15,
                      duration: 0.4,
                      type: "spring",
                      stiffness: 200,
                      damping: 20
                    }
                  }}
                  whileHover={{ 
                    scale: 1.05,
                    transition: { duration: 0.2 }
                  }}
                  style={{ 
                    filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.3))'
                  }}
                />
              </div>
            </div>
          </div>
          
          {/* Sidebar Items */}
          <div className="flex flex-col space-y-1 flex-1 px-2 group-hover:px-3">
            {sidebarSections.map((section, sectionIndex) => (
              <div key={section.name} className="relative">
                {sectionIndex > 0 && (
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-600/30 to-transparent my-2 mx-2" />
                )}
                
                <div className="hidden group-hover:block mb-2">
                  <div className="text-xs text-purple-400 font-medium px-3 mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-200">
                    {section.name}
                  </div>
                </div>
                
                {section.items.map((item, itemIndex) => (
                  <button
                    key={itemIndex}
                    onClick={item.onClick}
                    className={`relative flex items-center p-3 rounded-lg transition-all duration-300 overflow-hidden group/item w-full mb-1 ${
                      item.active 
                        ? 'bg-purple-600 text-white' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <item.icon size={20} className="flex-shrink-0" />
                    
                    <div className="hidden group-hover:block ml-3">
                      <span className="text-current whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-150">
                        {item.label}
                      </span>
                    </div>
                    
                    <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900/95 border border-gray-600/50 text-white text-sm opacity-0 group-hover:opacity-0 group/item:hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-[60]">
                      {item.label}
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col ml-16 relative">
          {/* Top Header */}
          <motion.header
            style={{
              y: sidebarY,
              opacity: sidebarOpacity,
            }}
            className="fixed top-0 left-0 right-0 bg-gray-900/95 backdrop-blur-xl border-b border-purple-500/20 p-4 z-40 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              {/* Left Side - Logo */}
              <div className="flex items-center space-x-4">
                <motion.img
                  src="https://i.postimg.cc/rsN3wQRf/skinfy1-2-removebg-preview.png"
                  alt="Skinify Logo"
                  className="h-8 w-auto object-contain"
                  whileHover={{ scale: 1.05 }}
                  style={{ filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.3))' }}
                />
              </div>

              {/* Right Side */}
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => navigate('/profile?tab=balance')}
                  className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2"
                >
                  <Plus size={16} />
                  <span>Refill</span>
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                    className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
                  >
                    <span>{languages.find(lang => lang.code === selectedLanguage)?.flag}</span>
                    <ChevronDown size={16} className={`transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showLanguageDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 shadow-xl z-50 border border-gray-700/50">
                      {languages.map(lang => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setSelectedLanguage(lang.code);
                            setShowLanguageDropdown(false);
                          }}
                          className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-700/50 transition-colors"
                        >
                          <span>{lang.flag}</span>
                          <span className="text-white">{lang.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {user ? <UserProfile /> : <SteamLogin />}
              </div>
            </div>
          </motion.header>

          {/* Main Header Navigation */}
          <motion.header
            style={{
              y: sidebarY,
              opacity: sidebarOpacity,
            }}
            className="fixed top-12 left-16 right-0 bg-gray-800 border-b border-gray-700/50 p-4 z-30 shadow-lg"
          >
            <div className="flex items-center relative">
              {/* Center Navigation */}
              <div className="flex justify-center w-full">
                <Flipper flipKey={`${activeSection}-${hoveredNavItem}`}>
                  <motion.nav 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                  >
                    <div 
                      className="flex justify-center space-x-1 bg-gray-900 px-6 py-3 border border-purple-500/40 shadow-2xl rounded-lg"
                      style={{ 
                        boxShadow: '0 0 30px rgba(168, 85, 247, 0.4), 0 8px 32px rgba(0, 0, 0, 0.3)',
                        background: 'linear-gradient(145deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.9))'
                      }}
                    >
                      {navigationItems.map((item) => (
                        <Flipped key={item.name} flipId={`header-nav-${item.name}`}>
                          <motion.button
                            onClick={() => handleNavigation(item)}
                            onMouseEnter={() => setHoveredNavItem(item.name)}
                            onMouseLeave={() => setHoveredNavItem(null)}
                            whileHover={{ 
                              scale: 1.05,
                              filter: 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.9))'
                            }}
                            whileTap={{ scale: 0.95 }}
                            className={`flex justify-center relative px-4 py-2 text-sm font-medium transition-all duration-300 flex items-center space-x-2 rounded-lg ${
                              activeSection === item.name
                                ? 'text-white bg-purple-600'
                                : hoveredNavItem === item.name
                                  ? 'text-purple-200 bg-purple-500/30'
                                  : 'text-gray-300 hover:text-white hover:bg-purple-500/20'
                            }`}
                            style={activeSection === item.name ? {
                              boxShadow: '0 0 25px rgba(168, 85, 247, 0.7), 0 4px 20px rgba(147, 51, 234, 0.5)',
                              background: 'linear-gradient(145deg, #9333EA, #A855F7)'
                            } : hoveredNavItem === item.name ? {
                              boxShadow: '0 0 15px rgba(168, 85, 247, 0.5)',
                              background: 'linear-gradient(145deg, rgba(147, 51, 234, 0.3), rgba(168, 85, 247, 0.3))'
                            } : {}}
                          >
                            <motion.div
                              animate={{ 
                                scale: activeSection === item.name || hoveredNavItem === item.name ? 1.1 : 1,
                                color: activeSection === item.name ? '#E879F9' : hoveredNavItem === item.name ? '#D8B4FE' : '#9CA3AF'
                              }}
                              transition={{ duration: 0.2 }}
                            >
                              <item.icon size={16} />
                            </motion.div>
                            <span>{item.name}</span>
                            
                            {(activeSection === item.name || hoveredNavItem === item.name) && (
                              <Flipped flipId="header-nav-glow">
                                <motion.div
                                  layoutId="headerNavActiveIndicator"
                                  className="absolute inset-0 bg-gradient-to-r from-purple-600/50 via-purple-500/70 to-purple-600/50 -z-10 rounded-lg"
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  transition={{ 
                                    type: "spring", 
                                    stiffness: 400, 
                                    damping: 30,
                                    duration: 0.3 
                                  }}
                                />
                              </Flipped>
                            )}
                          </motion.button>
                        </Flipped>
                      ))}
                    </div>
                  </motion.nav>
                </Flipper>
              </div>

              {/* Right Side - Positioned Absolutely */}
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                {/* Wishlist Button */}
                <motion.button
                  onClick={() => navigate('/profile?tab=wishlist')}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 text-gray-300 hover:text-purple-400 transition-colors relative"
                >
                  <Heart size={20} />
                </motion.button>

                {/* Cart Button */}
                <motion.button
                  onClick={() => navigate('/cart')}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 text-gray-300 hover:text-purple-400 transition-colors relative"
                >
                  <ShoppingCart size={20} />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </motion.button>

                {/* Sign In / User Profile */}
                <div className="ml-2">
                  {user ? <UserProfile /> : <SteamLogin />}
                </div>
              </div>
            </div>
          </motion.header>

          {/* Support Content */}
          <div className="flex-1 pt-32 pb-12">
            <div className="container mx-auto px-6">
              {/* Back Button */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-8"
              >
                <button 
                  onClick={() => navigate('/')}
                  className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors group"
                >
                  <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                  Back to Home
                </button>
              </motion.div>

              {/* Hero Section */}
              <div className="text-center mb-16">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6"
                  style={{ 
                    boxShadow: '0 0 40px rgba(168, 85, 247, 0.6)'
                  }}
                >
                  <Headphones className="w-10 h-10 text-white" />
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-6xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent"
                >
                  24/7 Support Center
                </motion.h1>
                
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-8"
                >
                  Get instant help from our expert support team! We're here to make your CS2 trading experience smooth and secure.
                </motion.p>

                {/* Response Time Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
                >
                  {[
                    { label: 'Average Response', value: '< 2 minutes', icon: Clock, color: 'blue' },
                    { label: 'Success Rate', value: '99.9%', icon: CheckCircle, color: 'green' },
                    { label: 'Satisfaction', value: '4.9/5', icon: Star, color: 'yellow' },
                    { label: 'Availability', value: '24/7', icon: Globe, color: 'purple' }
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8 + index * 0.1 }}
                      className={`bg-${stat.color}-500/10 border border-${stat.color}-500/30 rounded-xl p-4 text-center`}
                    >
                      <div className="flex items-center justify-center mb-2">
                        <stat.icon className={`w-6 h-6 text-${stat.color}-400`} />
                      </div>
                      <div className={`text-lg font-bold text-${stat.color}-400`}>{stat.value}</div>
                      <div className="text-gray-400 text-sm">{stat.label}</div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              {/* Quick Help Categories */}
              <div className="mb-16">
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"
                >
                  How Can We Help You?
                </motion.h2>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {supportCategories.map((category, index) => (
                    <motion.div
                      key={category.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`bg-${category.color}-500/10 border border-${category.color}-500/20 rounded-xl p-6 hover:border-${category.color}-500/40 transition-all duration-300 group`}
                    >
                      <div className="flex items-center space-x-3 mb-6">
                        <div className={`w-12 h-12 bg-${category.color}-500/20 rounded-xl flex items-center justify-center group-hover:bg-${category.color}-500/30 transition-colors`}>
                          <category.icon className={`w-6 h-6 text-${category.color}-400`} />
                        </div>
                        <h3 className={`text-xl font-bold text-white group-hover:text-${category.color}-300 transition-colors`}>
                          {category.title}
                        </h3>
                      </div>

                      <div className="space-y-3">
                        {category.items.map((item, itemIndex) => (
                          <motion.button
                            key={itemIndex}
                            onClick={() => {
                              if (user) {
                                addToast({ 
                                  type: 'info', 
                                  title: 'Support Request Started', 
                                  message: `Getting help for: ${item.title}` 
                                });
                                // Auto-send message to chat widget (disabled)
                                // addUserMessage(`Hi! I need help with: ${item.title} - ${item.description}`);
                              } else {
                                addToast({ 
                                  type: 'warning', 
                                  title: 'Sign In Required', 
                                  message: 'Please sign in to access support chat' 
                                });
                              }
                            }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full bg-gray-800/50 rounded-lg p-4 text-left hover:bg-gray-700/50 transition-all duration-300 border border-gray-600/20 hover:border-gray-500/40 group/item"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="text-white font-medium mb-1 group-hover/item:text-blue-300 transition-colors">
                                  {item.title}
                                  {item.urgent && (
                                    <span className="ml-2 bg-red-500/20 text-red-400 px-2 py-1 text-xs rounded-full">
                                      URGENT
                                    </span>
                                  )}
                                </h4>
                                <p className="text-gray-400 text-sm group-hover/item:text-gray-300 transition-colors">
                                  {item.description}
                                </p>
                              </div>
                              <ChevronDown className="w-4 h-4 text-gray-400 -rotate-90 group-hover/item:rotate-0 transition-transform duration-300" />
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Contact Methods */}
              <div className="mb-16">
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-3xl font-bold text-center mb-12"
                >
                  Multiple Ways to Get Support
                </motion.h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-xl p-8 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 text-center"
                  >
                    <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-6">
                      <MessageCircle className="w-8 h-8 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-4">Live Chat</h3>
                    <p className="text-gray-400 mb-6">
                      Get instant help from our support agents. Available 24/7 for immediate assistance.
                    </p>
                    <div className="space-y-2 text-sm text-blue-400">
                      <div>✓ Instant responses</div>
                      <div>✓ Screen sharing available</div>
                      <div>✓ Escalate to specialists</div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-xl p-8 border border-green-500/20 hover:border-green-500/40 transition-all duration-300 text-center"
                  >
                    <div className="w-16 h-16 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-6">
                      <Mail className="w-8 h-8 text-green-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-4">Email Support</h3>
                    <p className="text-gray-400 mb-6">
                      Send detailed inquiries to our support team. Perfect for complex issues.
                    </p>
                    <div className="space-y-2 text-sm text-green-400">
                      <div>📧 support@skinify.com</div>
                      <div>⏱️ Response within 2 hours</div>
                      <div>📎 Attach screenshots</div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-xl p-8 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 text-center"
                  >
                    <div className="w-16 h-16 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-6">
                      <Phone className="w-8 h-8 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-4">Phone Support</h3>
                    <p className="text-gray-400 mb-6">
                      Call us for urgent matters requiring immediate voice support.
                    </p>
                    <div className="space-y-2 text-sm text-purple-400">
                      <div>📞 +420 123 456 789</div>
                      <div>🕒 Mon-Fri 9AM-6PM CET</div>
                      <div>🚨 Emergency line available</div>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* FAQ Section */}
              <div className="mb-16">
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent"
                >
                  Frequently Asked Questions
                </motion.h2>

                {/* FAQ Search and Filter */}
                <div className="max-w-4xl mx-auto mb-8">
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Search Bar */}
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Search frequently asked questions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600 rounded-xl pl-12 pr-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>
                    
                    {/* Category Filter */}
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="bg-gray-800/50 border border-gray-600 rounded-xl pl-10 pr-8 py-4 text-white focus:outline-none focus:border-purple-500 transition-colors appearance-none"
                      >
                        {faqCategories.map((category) => (
                          <option key={category} value={category} className="bg-gray-800">
                            {category}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* FAQ Items */}
                <div className="max-w-4xl mx-auto space-y-4">
                  {filteredFAQ.length === 0 ? (
                    <div className="text-center py-12">
                      <HelpCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-400 mb-2">No results found</h3>
                      <p className="text-gray-500">Try adjusting your search or category filter</p>
                    </div>
                  ) : (
                    filteredFAQ.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-gray-800/50 rounded-xl border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 overflow-hidden"
                      >
                        <button
                          onClick={() => toggleFAQ(item.id)}
                          className="w-full px-6 py-6 text-left flex items-center justify-between hover:bg-gray-700/30 transition-colors duration-200"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-3">
                              {/* Category Badge */}
                              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                                item.category === 'Account' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                item.category === 'Trading' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                item.category === 'Payment' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                                item.category === 'Security' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                item.category === 'Technical' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                                'bg-gray-500/20 text-gray-400 border-gray-500/30'
                              }`}>
                                {item.category}
                              </span>
                              
                              {/* Category Icon */}
                              {item.category === 'Account' && <User className="w-4 h-4 text-blue-500" />}
                              {item.category === 'Trading' && <Package className="w-4 h-4 text-green-500" />}
                              {item.category === 'Payment' && <DollarSign className="w-4 h-4 text-purple-500" />}
                              {item.category === 'Security' && <Shield className="w-4 h-4 text-red-500" />}
                              {item.category === 'Technical' && <Settings className="w-4 h-4 text-orange-500" />}
                            </div>
                            
                            <h3 className="text-lg font-medium text-white group-hover:text-purple-300 transition-colors">
                              {item.question}
                            </h3>
                          </div>
                          
                          <ChevronDown 
                            className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                              openFAQ === item.id ? 'rotate-180' : ''
                            }`} 
                          />
                        </button>
                        
                        <AnimatePresence>
                          {openFAQ === item.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className="px-6 pb-6 border-t border-gray-700/30">
                                <motion.p
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.1 }}
                                  className="text-gray-300 leading-relaxed pt-4"
                                >
                                  {item.answer}
                                </motion.p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>

              {/* Additional Resources */}
              <div className="mb-16">
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-3xl font-bold text-center mb-12"
                >
                  Additional Resources
                </motion.h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { 
                      title: 'Trading Guide', 
                      description: 'Learn how to trade safely', 
                      icon: BookOpen, 
                      color: 'blue',
                      onClick: () => navigate('/trading-guide')
                    },
                    { 
                      title: 'Security Tips', 
                      description: 'Protect your account', 
                      icon: Shield, 
                      color: 'green',
                      onClick: () => navigate('/security-tips')
                    },
                    { 
                      title: 'Video Tutorials', 
                      description: 'Watch step-by-step guides', 
                      icon: Video, 
                      color: 'purple',
                      onClick: () => addToast({ type: 'info', title: 'Coming Soon', message: 'Video tutorials coming soon!' })
                    },
                    { 
                      title: 'Download Guides', 
                      description: 'PDF guides and resources', 
                      icon: Download, 
                      color: 'orange',
                      onClick: () => addToast({ type: 'info', title: 'Coming Soon', message: 'Download center coming soon!' })
                    }
                  ].map((resource, index) => (
                    <motion.button
                      key={resource.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      onClick={resource.onClick}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className={`bg-${resource.color}-500/10 border border-${resource.color}-500/20 hover:border-${resource.color}-500/40 rounded-xl p-6 text-center transition-all duration-300 group`}
                    >
                      <div className={`w-12 h-12 bg-${resource.color}-500/20 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-${resource.color}-500/30 transition-colors`}>
                        <resource.icon className={`w-6 h-6 text-${resource.color}-400`} />
                      </div>
                      <h3 className={`text-lg font-bold text-white group-hover:text-${resource.color}-300 transition-colors mb-2`}>
                        {resource.title}
                      </h3>
                      <p className="text-gray-400 group-hover:text-gray-300 transition-colors text-sm">
                        {resource.description}
                      </p>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Emergency Support */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-xl p-8 text-center"
              >
                <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
                <h2 className="text-3xl font-bold text-white mb-4">Emergency Support</h2>
                <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
                  If your account is compromised or you're experiencing security issues, contact our emergency support immediately.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => addToast({ type: 'warning', title: 'Emergency Contact', message: 'Emergency support would be contacted immediately' })}
                    className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-lg font-bold transition-all duration-300"
                    style={{ boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)' }}
                  >
                    Emergency Contact
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/security-tips')}
                    className="border border-red-500 text-red-400 hover:bg-red-500 hover:text-white px-8 py-3 rounded-lg font-bold transition-all duration-300"
                  >
                    Security Guide
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;