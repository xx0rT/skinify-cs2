import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Package, Sparkles, Bug, Zap, Shield, Wrench, Plus } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface ChangelogEntry {
  version: string;
  date: string;
  type: 'major' | 'minor' | 'patch';
  changes: {
    category: 'new' | 'improved' | 'fixed' | 'security';
    items: string[];
  }[];
}

const ChangelogPage: React.FC = () => {
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  const changelog: ChangelogEntry[] = [
    {
      version: '1.0.0',
      date: '2024-12-02',
      type: 'major',
      changes: [
        {
          category: 'new',
          items: [
            'Initial release of Skinify marketplace',
            'User authentication with Steam integration',
            'Real-time marketplace listings',
            'Shopping cart and checkout system',
            'User profiles and inventory management',
            'Wishlist functionality',
            'VIP subscription system',
            'Referral program',
            'Real-time chat support',
            'Multi-currency support',
            'Push notifications',
            'Admin panel with analytics',
          ]
        },
        {
          category: 'improved',
          items: [
            'Optimized image loading with caching',
            'Enhanced mobile responsiveness',
            'Improved search functionality',
            'Better performance with lazy loading',
          ]
        },
        {
          category: 'security',
          items: [
            'Row Level Security (RLS) policies',
            'KYC verification system',
            'Secure payment processing',
            'Rate limiting on API endpoints',
          ]
        }
      ]
    }
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'new':
        return <Plus className="w-5 h-5" />;
      case 'improved':
        return <Zap className="w-5 h-5" />;
      case 'fixed':
        return <Bug className="w-5 h-5" />;
      case 'security':
        return <Shield className="w-5 h-5" />;
      default:
        return <Wrench className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'new':
        return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'improved':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'fixed':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'security':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getCategoryLabel = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const getVersionBadgeColor = (type: string) => {
    switch (type) {
      case 'major':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'minor':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'patch':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />

      <main className="container mx-auto px-4 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Package className="w-12 h-12 text-purple-400" />
            <h1 className="text-5xl font-bold text-white">Changelog</h1>
          </div>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Track all updates, improvements, and bug fixes in Skinify
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto space-y-8">
          {changelog.map((entry, index) => (
            <motion.div
              key={entry.version}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-purple-500/20 overflow-hidden"
            >
              <div className="p-6 border-b border-gray-700/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-6 h-6 text-purple-400" />
                      <h2 className="text-3xl font-bold text-white">v{entry.version}</h2>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getVersionBadgeColor(entry.type)}`}>
                      {entry.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">{new Date(entry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {entry.changes.map((change, changeIndex) => (
                  <div key={changeIndex} className="space-y-3">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold text-sm ${getCategoryColor(change.category)}`}>
                      {getCategoryIcon(change.category)}
                      <span>{getCategoryLabel(change.category)}</span>
                    </div>
                    <ul className="space-y-2 ml-4">
                      {change.items.map((item, itemIndex) => (
                        <motion.li
                          key={itemIndex}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 + changeIndex * 0.05 + itemIndex * 0.02 }}
                          className="flex items-start gap-3 text-gray-300"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0"></span>
                          <span>{item}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="max-w-5xl mx-auto mt-12 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-8 text-center"
        >
          <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">Stay Updated</h3>
          <p className="text-gray-400">
            Follow our development journey and be the first to know about new features and improvements
          </p>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default ChangelogPage;
