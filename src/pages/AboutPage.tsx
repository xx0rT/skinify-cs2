import React, { useState } from 'react';
import { useT } from '../lib/useT';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users, 
  Shield, 
  Clock, 
  Globe, 
  Star, 
  Award,
  Home,
  User,
  Settings,
  CreditCard,
  Wallet,
  Gift,
  Crown,
  TrendingUp,
  ChevronDown,
  ShoppingCart,
  MessageCircle,
  Package,
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SteamLogin from '../components/auth/SteamLogin';
import UserProfile from '../components/auth/UserProfile';
import useDocumentMeta from '../hooks/useDocumentMeta';

const AboutPage: React.FC = () => {
  const tr = useT();
  useDocumentMeta({
    title: 'About Skinify — The Peer-to-Peer CS2 Marketplace',
    description:
      'Learn about Skinify, the CS2 marketplace with 0% buyer fees, escrow-protected trades, and instant Steam delivery. Built for collectors and traders.',
    canonical: 'https://skinify.gg/about',
  });
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [selectedLanguage, setSelectedLanguage] = useState('EN');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [activeSection, setActiveSection] = useState('About');
  const [hoveredNavItem, setHoveredNavItem] = useState(null);

  const sidebarSections = [
    {
      name: 'Navigation',
      items: [
        { icon: Home, label: 'Home', active: false, onClick: () => navigate('/') },
        { icon: User, label: 'Profile', active: false, onClick: () => navigate('/profile') }
      ]
    },
    {
      name: 'Trading',
      items: [
        { icon: Star, label: 'Rewards', active: false, onClick: () => addToast({ type: 'info', title: 'Coming Soon', message: 'Rewards system is coming soon!' }) },
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
        { icon: Crown, label: 'VIP', active: false, onClick: () => addToast({ type: 'info', title: 'Coming Soon', message: 'VIP program is coming soon!' }) },
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
    { type: "link", name: 'Market', href: '/', icon: ShoppingCart, onClick: () => { setActiveSection('Market'); navigate('/'); } },
    { type: "link", name: 'Referral', href: '/referral', icon: Users, onClick: () => { setActiveSection('Referral'); navigate('/referral'); } },
    { type: "link", name: 'Search', href: '/', icon: Search, onClick: () => { setActiveSection('Search'); setShowSearchModal(true); } },
    { type: "link", name: 'Affiliate', href: '/affiliate', icon: Gift, onClick: () => { setActiveSection('Affiliate'); addToast({ type: 'info', title: 'Coming Soon', message: 'Affiliate program coming soon!' }); } },
    { type: "link", name: 'Claims', href: '/claims', icon: Trophy, onClick: () => { setActiveSection('Claims'); addToast({ type: 'info', title: 'Coming Soon', message: 'Claims system coming soon!' }); } }
  ];

  const handleNavigation = (item: any) => {
    if (item.onClick) {
      item.onClick();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />

      {/* Main Layout */}
      <div className="flex min-h-screen">
        {/* Left Sidebar */}
        <motion.div 
          style={{
            y: sidebarY,
            opacity: sidebarOpacity,
          }}
          className="group fixed left-0 top-0 h-full z-50 w-16 hover:w-64 bg-gray-800 border-r border-gray-700/50 flex flex-col transition-all duration-300 ease-in-out py-4 shadow-xl"
        >
          {/* Logo */}
          <div className="h-12 flex items-center justify-center mb-4 mx-auto group-hover:mx-3 overflow-hidden">
            <div className="relative flex items-center">
              <motion.img
                src="https://i.postimg.cc/rsN3wQRf/skinfy1-2-removebg-preview.png"
                alt="Skinify Logo"
                className="h-12 w-auto object-contain cursor-pointer"
                onClick={() => navigate('/')}
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
              
              <div className="hidden group-hover:block">
                <motion.img
                  src="https://i.postimg.cc/xqdxTY2d/skinify2-2-removebg-preview.png"
                  alt="Skinify Logo Extended"
                  className="h-12 w-auto object-contain cursor-pointer"
                  onClick={() => navigate('/')}
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
                />
              </div>
            </div>
          </div>

          {/* Sidebar Items with Neon Flash */}
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
                  <motion.button
                    key={itemIndex}
                    onClick={item.onClick}
                    whileHover={{
                      scale: 1.02,
                      filter: 'drop-shadow(0 0 15px rgba(168, 85, 247, 0.8))'
                    }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative flex items-center p-3 rounded-lg transition-all duration-300 overflow-hidden group/item w-full mb-1 ${
                      item.active 
                        ? 'bg-purple-600 text-white' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <motion.div
                      animate={item.active ? { 
                        boxShadow: ['0 0 0px rgba(168, 85, 247, 0)', '0 0 20px rgba(168, 85, 247, 0.8)', '0 0 0px rgba(168, 85, 247, 0)'],
                        scale: [1, 1.1, 1]
                      } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <item.icon size={20} className="flex-shrink-0" />
                    </motion.div>
                    
                    <div className="hidden group-hover:block ml-3">
                      <span className="text-current whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-150">
                        {item.label}
                      </span>
                    </div>
                    
                    <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900/95 border border-gray-600/50 text-white text-sm opacity-0 group-hover:opacity-0 group/item:hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-[60]">
                      {item.label}
                    </div>
                  </motion.button>
                ))}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col ml-16 relative">
          {/* Top Header */}
          <header className="fixed top-0 left-16 right-0 bg-gray-800/80 backdrop-blur-md border-b border-gray-700/50 p-4 z-30 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1"></div>

              {/* Center Navigation */}
              <div className="flex justify-start flex-1">
                <motion.nav 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                >
                  <div 
                   className="flex items-center space-x-1 bg-gray-900/90 backdrop-blur-xl px-6 py-3 border border-purple-500/40 shadow-2xl rounded-lg"
                    style={{ 
                      boxShadow: '0 0 30px rgba(168, 85, 247, 0.4), 0 8px 32px rgba(0, 0, 0, 0.3)',
                      background: 'linear-gradient(145deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.9))'
                    }}
                  >
                    {navigationItems.map((item) => (
                      <motion.button
                        key={item.name}
                        onClick={() => handleNavigation(item)}
                        onMouseEnter={() => setHoveredNavItem(item.name)}
                        onMouseLeave={() => setHoveredNavItem(null)}
                        whileHover={{ 
                          scale: 1.05,
                          filter: 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.9))'
                        }}
                        whileTap={{ scale: 0.95 }}
                        className={`relative px-4 py-2 text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
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
                      </motion.button>
                    ))}
                  </div>
                </motion.nav>
              </div>

              {/* Right Side */}
              <div className="flex items-center space-x-4 flex-shrink-0">
                <button className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 font-medium transition-all duration-300 flex items-center space-x-2">
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
          </header>

          {/* About Content */}
          <div className="flex-1 pt-20 p-6 overflow-y-auto">
            <div className="container mx-auto">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8"
          >
            <Link 
              to="/" 
              className="inline-flex items-center text-blue-500 hover:text-blue-400 transition-colors"
            >
              <ArrowLeft size={20} className="mr-2" />
              Back to Home
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
              {tr('about.hero.title', 'About CSMarket')}
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              {tr('about.hero.lead', 'The most trusted and secure marketplace for CS2 skins, items, and collectibles. Join over 1 million traders worldwide in safe, fast, and reliable trading.')}
            </p>
          </motion.div>

          {/* Stats Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
          >
            <div className="text-center bg-gray-800/50 p-8 rounded-lg">
              <Users className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <div className="text-4xl font-bold text-white mb-2">1M+</div>
              <div className="text-gray-400">Active Traders</div>
            </div>
            <div className="text-center bg-gray-800/50 p-8 rounded-lg">
              <Shield className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <div className="text-4xl font-bold text-white mb-2">99.9%</div>
              <div className="text-gray-400">Success Rate</div>
            </div>
            <div className="text-center bg-gray-800/50 p-8 rounded-lg">
              <Clock className="w-12 h-12 text-purple-500 mx-auto mb-4" />
              <div className="text-4xl font-bold text-white mb-2">24/7</div>
              <div className="text-gray-400">Support</div>
            </div>
            <div className="text-center bg-gray-800/50 p-8 rounded-lg">
              <Globe className="w-12 h-12 text-orange-500 mx-auto mb-4" />
              <div className="text-4xl font-bold text-white mb-2">50+</div>
              <div className="text-gray-400">Countries</div>
            </div>
          </motion.div>

          {/* Our Story */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <h2 className="text-3xl font-bold mb-8 text-center">Our Story</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <p className="text-gray-300 leading-relaxed">
                  Founded in 2019, CSMarket started as a vision to create the most secure and 
                  user-friendly platform for CS2 item trading. We recognized the need for a 
                  trustworthy marketplace where gamers could safely buy, sell, and trade their 
                  virtual items without fear of scams or fraud.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  Today, we're proud to serve over 1 million active traders across 50+ countries, 
                  facilitating millions of dollars in transactions daily while maintaining our 
                  commitment to security, transparency, and customer satisfaction.
                </p>
              </div>
              <div className="bg-gray-800/50 p-8 rounded-lg">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Award className="w-6 h-6 text-yellow-500 mr-2" />
                  Why Choose Us?
                </h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                    Industry-leading security with escrow protection
                  </li>
                  <li className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                    Lowest trading fees (only 2% with volume discounts)
                  </li>
                  <li className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                    24/7 multilingual customer support
                  </li>
                  <li className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                    Instant payments and no trade holds
                  </li>
                  <li className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                    Advanced item inspection and verification
                  </li>
                </ul>
              </div>
            </div>
          </motion.section>

          {/* Mission & Values */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-8"
          >
            <h2 className="text-3xl font-bold mb-12 text-center">Mission & Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center bg-gray-800/30 p-8 rounded-lg">
                <Shield className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-4">Security First</h3>
                <p className="text-gray-400">
                  Every transaction is protected by our advanced escrow system and fraud detection algorithms.
                </p>
              </div>
              <div className="text-center bg-gray-800/30 p-8 rounded-lg">
                <Users className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-4">Community Driven</h3>
                <p className="text-gray-400">
                  We listen to our users and continuously improve based on community feedback and needs.
                </p>
              </div>
              <div className="text-center bg-gray-800/30 p-8 rounded-lg">
                <Globe className="w-16 h-16 text-purple-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-4">Global Reach</h3>
                <p className="text-gray-400">
                  Supporting traders worldwide with localized payment methods and customer service.
                </p>
              </div>
            </div>
          </motion.section>

          {/* Team Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-8"
          >
            <h2 className="text-3xl font-bold mb-12 text-center">Our Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center bg-gray-800/50 p-8 rounded-lg">
                <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold">
                  JD
                </div>
                <h3 className="text-xl font-semibold mb-2">John Doe</h3>
                <p className="text-blue-400 mb-2">CEO & Founder</p>
                <p className="text-gray-400 text-sm">
                  Former CS:GO professional player turned entrepreneur with 10+ years in gaming industry.
                </p>
              </div>
              <div className="text-center bg-gray-800/50 p-8 rounded-lg">
                <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-green-700 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold">
                  SM
                </div>
                <h3 className="text-xl font-semibold mb-2">Sarah Miller</h3>
                <p className="text-green-400 mb-2">CTO</p>
                <p className="text-gray-400 text-sm">
                  Security expert with extensive experience in blockchain and financial technology.
                </p>
              </div>
              <div className="text-center bg-gray-800/50 p-8 rounded-lg">
                <img 
                  src="https://avatars.steamstatic.com/3b5dd79c38b2b8e04a4421c13b1c3e5f4e0b6e49_full.jpg"
                  alt="Mike Johnson"
                  className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-purple-500/30"
                  onError={(e) => {
                    e.currentTarget.src = 'https://avatars.steamstatic.com/3b5dd79c38b2b8e04a4421c13b1c3e5f4e0b6e49_full.jpg';
                  }}
                />
                <h3 className="text-xl font-semibold mb-2">Mike Johnson</h3>
                <p className="text-purple-400 mb-2">Head of Security</p>
                <p className="text-gray-400 text-sm">
                  Cybersecurity specialist ensuring the highest level of protection for all users.
                </p>
              </div>
            </div>
          </motion.section>

          {/* Contact CTA */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="text-center bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-12 rounded-lg"
          >
            <h2 className="text-3xl font-bold mb-4">Ready to Start Trading?</h2>
            <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
              Join our community of trusted traders and experience the most secure CS2 marketplace.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/"
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg transition-all duration-300 hover:scale-105"
              >
                Browse Marketplace
              </Link>
              <Link
                to="/contact"
                className="border border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white px-8 py-3 rounded-lg transition-all duration-300"
              >
                Contact Us
              </Link>
            </div>
          </motion.section>
        </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;