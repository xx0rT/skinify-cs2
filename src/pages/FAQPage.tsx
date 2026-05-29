import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Search,
  HelpCircle,
  Shield,
  DollarSign,
  Clock,
  MessageCircle,
  Sparkles
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { NavigationLayout } from '../components/Navigation';
import Footer from '../components/Footer';
import { useRecentActivity } from '../hooks/useRecentActivity';
import { useCurrencyStore } from '../store/currencyStore';
import ToastContainer from '../components/ui/ToastContainer';
import SearchModal from '../components/SearchModal';

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  icon: any;
}


const faqData: FAQItem[] = [
  {
    id: '1',
    category: 'General',
    question: 'What is CSMarket?',
    answer: 'CSMarket is the most trusted marketplace for CS2 skins, knives, and items. We provide a secure platform where players can buy, sell, and trade their virtual items safely with over 1 million active users worldwide.',
    icon: HelpCircle
  },
  {
    id: '2',
    category: 'General',
    question: 'How do I create an account?',
    answer: 'Simply click the "Sign in with Steam" button and authorize CSMarket through Steam\'s official login system. No additional registration is required - your Steam account serves as your CSMarket account.',
    icon: HelpCircle
  },
  {
    id: '3',
    category: 'Security',
    question: 'Is it safe to trade on CSMarket?',
    answer: 'Yes, CSMarket uses advanced security measures including escrow protection, Steam Guard integration, fraud detection systems, and SSL encryption to ensure all trades are completely secure.',
    icon: Shield
  },
  {
    id: '4',
    category: 'Security',
    question: 'What is escrow and how does it work?',
    answer: 'Escrow is a security system where we hold the buyer\'s payment until the trade is completed successfully. The seller only receives payment after the buyer confirms receipt of the items, ensuring protection for both parties.',
    icon: Shield
  },
  {
    id: '5',
    category: 'Fees',
    question: 'What are the trading fees?',
    answer: 'We charge a base fee of 2% per transaction, with volume discounts available (up to 0.5% reduction for high-volume traders). Withdrawal fees are 1.5%. These are among the lowest in the industry.',
    icon: DollarSign
  },
  {
    id: '6',
    category: 'Fees',
    question: 'Are there any hidden costs?',
    answer: 'No hidden costs whatsoever. All fees are clearly displayed before you complete any transaction. The only fees are the trading fee (2%) and withdrawal fee (1.5%) - that\'s it.',
    icon: DollarSign
  },
  {
    id: '7',
    category: 'Trading',
    question: 'How long does a trade take?',
    answer: 'Most trades complete instantly once both parties confirm. The escrow process typically takes 1-5 minutes after buyer payment. Steam trades are immediate when both users are online.',
    icon: Clock
  },
  {
    id: '8',
    category: 'Trading',
    question: 'Can I cancel a trade?',
    answer: 'Yes, trades can be cancelled before the seller ships the items. Once items are sent via Steam trade, cancellation requires mutual agreement between buyer and seller or dispute resolution through our support team.',
    icon: Clock
  },
  {
    id: '9',
    category: 'Payment',
    question: 'What payment methods do you accept?',
    answer: 'We accept credit/debit cards, PayPal, bank transfers, major cryptocurrencies (Bitcoin, Ethereum, Litecoin), and Steam Wallet funds. All payments are processed securely through certified payment processors.',
    icon: DollarSign
  },
  {
    id: '10',
    category: 'Payment',
    question: 'How do I withdraw my funds?',
    answer: 'Go to your account dashboard, click "Withdraw," select your preferred payment method, enter the amount, and confirm. Withdrawals typically process within 24 hours for most payment methods.',
    icon: DollarSign
  },
  {
    id: '11',
    category: 'Support',
    question: 'How can I contact customer support?',
    answer: 'We offer 24/7 support through live chat, email (support@csmarket.com), and our contact form. Critical issues are resolved within 30 minutes, normal issues within 2 hours.',
    icon: MessageCircle
  },
  {
    id: '12',
    category: 'Support',
    question: 'What if I have a dispute with another user?',
    answer: 'Contact our support team immediately with transaction details. We have a dedicated dispute resolution team that investigates all claims and makes fair decisions based on evidence and platform rules.',
    icon: MessageCircle
  }
];

const categories = ['All', 'General', 'Security', 'Fees', 'Trading', 'Payment', 'Support'];


const FAQPage: React.FC = () => {
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const { activities, loading } = useRecentActivity(30);
  const navigate = useNavigate();
  const { formatPrice } = useCurrencyStore();

  const toggleItem = (id: string) => {
    setOpenItems(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const filteredFAQ = faqData.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const duplicatedActivities = [...activities, ...activities, ...activities];

  return (
    <>
      <ToastContainer />

      <NavigationLayout onSearchOpen={() => setShowSearchModal(true)}>
        <div className="min-h-screen bg-gray-900">
          <div className="pb-20">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 py-20">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM4ODg4ODgiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djJoLTJ2LTJoMnptMC00djJoLTJ2LTJoMnptMC00djJoLTJ2LTJoMnptMC00djJoLTJ2LTJoMnptLTQgMTJ2MmgtMnYtMmgyek0yOCAzMHYyaC0ydi0yaDF6bTAtNHYyaC0ydi0yaDF6bTAtNHYyaC0ydi0yaDF6bTAtNHYyaC0ydi0yaDF6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <div className="flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-purple-400 mr-3" />
                <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400">
                  FAQ Center
                </h1>
                <Sparkles className="w-8 h-8 text-purple-400 ml-3" />
              </div>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Find answers to common questions about trading, security, payments, and more.
              </p>
            </motion.div>

            {/* Search and Filter */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="max-w-3xl mx-auto"
            >
              <div className="relative mb-6">
                <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-purple-400 w-6 h-6" />
                <input
                  type="text"
                  placeholder="Search for answers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-800/60 backdrop-blur-sm border border-purple-500/30 rounded-2xl pl-14 pr-6 py-5 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all duration-300 shadow-lg focus:shadow-purple-500/20"
                />
              </div>

              <div className="flex flex-wrap gap-3 justify-center">
                {categories.map((category) => (
                  <motion.button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                      selectedCategory === category
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 border border-gray-700'
                    }`}
                  >
                    {category}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Live Market Activity Slider */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-900/20 via-pink-900/20 to-purple-900/20 py-4 border-y border-purple-500/20">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/5 to-transparent" />

          <motion.div
            animate={{
              x: [0, -2000],
            }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: 40,
                ease: "linear",
              },
            }}
            className="flex gap-6 whitespace-nowrap"
          >
            {loading ? (
              <div className="inline-flex items-center gap-3 bg-gray-800/40 backdrop-blur-sm px-6 py-3 rounded-lg border border-purple-500/20">
                <span className="text-gray-400">Loading recent activity...</span>
              </div>
            ) : (
              [...activities, ...activities, ...activities].map((activity, index) => (
                <div
                  key={`${activity.id}-${index}`}
                  className="inline-flex items-center gap-3 bg-gray-800/40 backdrop-blur-sm px-6 py-3 rounded-lg border border-purple-500/20 hover:border-purple-500/40 transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-purple-300 font-medium">{activity.buyer_name}</span>
                  </div>
                  <span className="text-gray-400">bought</span>
                  <button
                    onClick={() => navigate('/marketplace')}
                    className="text-white font-semibold hover:text-purple-300 transition-colors cursor-pointer underline decoration-transparent hover:decoration-purple-300"
                  >
                    {activity.item_name}
                  </button>
                  <span className="text-green-400 font-bold">{formatPrice(activity.price)}</span>
                </div>
              ))
            )}
          </motion.div>
        </div>

        {/* FAQ Items */}
        <div className="container mx-auto px-4 mt-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="max-w-4xl mx-auto"
          >
            <AnimatePresence>
              {filteredFAQ.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="mb-4"
                >
                  <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-2xl overflow-hidden border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 shadow-lg hover:shadow-purple-500/10">
                    <button
                      onClick={() => toggleItem(item.id)}
                      className="w-full px-8 py-6 text-left flex items-center justify-between group hover:bg-purple-500/5 transition-all duration-300"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`p-3 rounded-xl ${
                          item.category === 'Security' ? 'bg-red-500/20 text-red-400' :
                          item.category === 'Fees' ? 'bg-yellow-500/20 text-yellow-400' :
                          item.category === 'Trading' ? 'bg-green-500/20 text-green-400' :
                          item.category === 'Payment' ? 'bg-blue-500/20 text-blue-400' :
                          item.category === 'Support' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          <item.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                              item.category === 'Security' ? 'bg-red-500/20 text-red-400' :
                              item.category === 'Fees' ? 'bg-yellow-500/20 text-yellow-400' :
                              item.category === 'Trading' ? 'bg-green-500/20 text-green-400' :
                              item.category === 'Payment' ? 'bg-blue-500/20 text-blue-400' :
                              item.category === 'Support' ? 'bg-purple-500/20 text-purple-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {item.category}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors">
                            {item.question}
                          </h3>
                        </div>
                      </div>
                      <motion.div
                        animate={{ rotate: openItems.includes(item.id) ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ChevronDown className="w-6 h-6 text-purple-400" />
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {openItems.includes(item.id) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-8 pb-6 pt-2">
                            <div className="border-t border-purple-500/20 pt-4">
                              <p className="text-gray-300 leading-relaxed text-base">
                                {item.answer}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredFAQ.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <div className="bg-gray-800/40 backdrop-blur-sm rounded-2xl p-12 border border-purple-500/20">
                  <HelpCircle className="w-20 h-20 text-purple-400 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-white mb-3">No results found</h3>
                  <p className="text-gray-400 text-lg">Try adjusting your search or category filter</p>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Contact CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-20 max-w-4xl mx-auto"
          >
            <div className="relative bg-gradient-to-br from-purple-900/40 via-pink-900/40 to-purple-900/40 backdrop-blur-sm rounded-3xl p-12 border border-purple-500/30 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-pink-600/10 to-purple-600/10" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl" />

              <div className="relative z-10 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl mb-6">
                  <MessageCircle className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-4xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                  Still Need Help?
                </h2>
                <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
                  Can't find what you're looking for? Our support team is available 24/7 to help you.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/contact"
                    className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold transition-all duration-300 hover:scale-105 overflow-hidden shadow-lg hover:shadow-purple-500/50"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-white/20 to-purple-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    <span className="relative">Contact Support</span>
                  </Link>
                  <Link
                    to="/trading-guide"
                    className="px-8 py-4 bg-gray-800/60 backdrop-blur-sm border border-purple-500/30 text-purple-300 hover:bg-gray-700/60 rounded-xl font-bold transition-all duration-300 hover:scale-105"
                  >
                    Trading Guide
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
          </div>

          <Footer />
        </div>
      </NavigationLayout>

      {showSearchModal && (
        <SearchModal onClose={() => setShowSearchModal(false)} />
      )}
    </>
  );
};

export default FAQPage;
