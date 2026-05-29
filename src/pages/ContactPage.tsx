import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Send, 
  MessageCircle,
  Home,
  User,
  Settings,
  CreditCard,
  Wallet,
  Gift,
  Crown,
  ChevronDown,
  ShoppingCart,
  Star,
  TrendingUp,
  Package,
  Plus
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SteamLogin from '../components/auth/SteamLogin';
import UserProfile from '../components/auth/UserProfile';

const ContactPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [selectedLanguage, setSelectedLanguage] = useState('EN');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [activeSection, setActiveSection] = useState('Contact');
  const [hoveredNavItem, setHoveredNavItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    priority: 'normal'
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Contact form submitted:', formData);
    alert('Thank you for your message! We will get back to you within 2 hours.');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-hidden">
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
                <button 
                  onClick={() => navigate('/profile?tab=balance')}
                  className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 font-medium transition-all duration-300 flex items-center space-x-2"
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
          </header>

          {/* Contact Content */}
          <div className="flex-1 pt-20 pb-12">
            <div className="container mx-auto px-4">
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
              Contact Support
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Need help? Have questions? Our support team is available 24/7 to assist you with any issues or inquiries.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2"
            >
              <div className="bg-gray-800/50 p-6 rounded-lg">
                <h2 className="text-2xl font-bold mb-6">Send us a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="your.email@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">
                        Subject *
                      </label>
                      <input
                        type="text"
                        id="subject"
                        name="subject"
                        required
                        value={formData.subject}
                        onChange={handleChange}
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="Brief description of your issue"
                      />
                    </div>
                    <div>
                      <label htmlFor="priority" className="block text-sm font-medium text-gray-300 mb-2">
                        Priority Level
                      </label>
                      <select
                        id="priority"
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                      >
                        <option value="low">Low - General inquiry</option>
                        <option value="normal">Normal - Standard issue</option>
                        <option value="high">High - Urgent matter</option>
                        <option value="critical">Critical - Account security</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      value={formData.message}
                      onChange={handleChange}
                      rows={6}
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors resize-vertical"
                      placeholder="Please provide detailed information about your issue or question..."
                    />
                  </div>

                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2 font-semibold"
                  >
                    <Send size={20} />
                    <span>Send Message</span>
                  </motion.button>
                </form>
              </div>
            </motion.div>

            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-8"
            >
              {/* Contact Methods */}
              <div className="bg-gray-800/50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-6">Contact Information</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Mail className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Email Support</div>
                      <div className="text-gray-400 text-sm">support@csmarket.com</div>
                      <div className="text-gray-500 text-xs">Response within 2 hours</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <MessageCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Live Chat</div>
                      <div className="text-gray-400 text-sm">Available 24/7</div>
                      <div className="text-gray-500 text-xs">Instant support</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Phone className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Phone Support</div>
                      <div className="text-gray-400 text-sm">+420 123 456 789</div>
                      <div className="text-gray-500 text-xs">Mon-Fri 9AM-6PM CET</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-5 h-5 text-orange-500 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Office Location</div>
                      <div className="text-gray-400 text-sm">Prague, Czech Republic</div>
                      <div className="text-gray-500 text-xs">European Union</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Response Times */}
              <div className="bg-gray-800/50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-6 flex items-center">
                  <Clock className="w-5 h-5 text-blue-500 mr-2" />
                  Response Times
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Critical Issues</span>
                    <span className="text-red-400 font-semibold">&lt; 30 minutes</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">High Priority</span>
                    <span className="text-orange-400 font-semibold">&lt; 1 hour</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Normal Issues</span>
                    <span className="text-yellow-400 font-semibold">&lt; 2 hours</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">General Inquiries</span>
                    <span className="text-green-400 font-semibold">&lt; 24 hours</span>
                  </div>
                </div>
              </div>

              {/* FAQ Link */}
              <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3">Quick Help</h3>
                <p className="text-gray-300 text-sm mb-4">
                  Check our FAQ section for instant answers to common questions.
                </p>
                <Link
                  to="/faq"
                  className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Visit FAQ
                  <ArrowLeft className="w-4 h-4 ml-1 rotate-180" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default ContactPage;