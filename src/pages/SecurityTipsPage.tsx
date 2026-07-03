import React from 'react';
import { useT } from '../lib/useT';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, AlertTriangle, CheckCircle, Lock, Eye, UserX, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import useDocumentMeta from '../hooks/useDocumentMeta';

const SecurityTipsPage: React.FC = () => {
  const tr = useT();
  useDocumentMeta({
    title: 'CS2 Trading Security Tips · Skinify',
    description:
      'Protect your CS2 inventory from scams. Spot fake API sites, sticker swaps, Steam impersonation, and trade-hold tricks. Trade safely on Skinify.',
    canonical: 'https://skinify.gg/security-tips',
  });
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white">
      <Header />
      <div className="pt-20 pb-12">
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
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent">
              {tr('security.hero.title', 'Security Tips')}
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              {tr('security.hero.lead', 'Essential security practices to protect your account and items while trading on CSMarket.')}
            </p>
          </motion.div>

          {/* Critical Security Warnings */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-8">
              <h2 className="text-2xl font-bold mb-6 text-red-400 flex items-center">
                <AlertTriangle className="w-8 h-8 mr-3" />
                Critical Security Warnings
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-red-300">Never Share Your Login Details</h3>
                      <p className="text-gray-400 text-sm">CSMarket staff will never ask for your Steam password, email password, or authentication codes.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-red-300">Beware of Fake Websites</h3>
                      <p className="text-gray-400 text-sm">Always check the URL is exactly "csmarket.com" - scammers create look-alike sites.</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-red-300">Don't Trade Outside Platform</h3>
                      <p className="text-gray-400 text-sm">Always use CSMarket's escrow system - external trades have no protection.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-red-300">Verify Item Authenticity</h3>
                      <p className="text-gray-400 text-sm">Use our inspection tools to verify items before purchase - check float, pattern, and stickers.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Account Security */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <h2 className="text-3xl font-bold mb-8 flex items-center">
              <Lock className="w-8 h-8 text-blue-500 mr-3" />
              Account Security
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-gray-800/50 p-8 rounded-lg">
                <h3 className="text-xl font-semibold mb-6 text-green-400 flex items-center">
                  <CheckCircle className="w-6 h-6 mr-2" />
                  Essential Security Measures
                </h3>
                <ul className="space-y-4">
                  <li className="flex items-start space-x-3">
                    <Smartphone className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                    <div>
                      <strong className="text-green-300">Enable Steam Guard Mobile</strong>
                      <p className="text-gray-400 text-sm">Required for trading - provides two-factor authentication for all Steam activities.</p>
                    </div>
                  </li>
                  <li className="flex items-start space-x-3">
                    <Lock className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                    <div>
                      <strong className="text-green-300">Use Strong Passwords</strong>
                      <p className="text-gray-400 text-sm">Create unique, complex passwords for Steam and email accounts. Consider using a password manager.</p>
                    </div>
                  </li>
                  <li className="flex items-start space-x-3">
                    <Eye className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                    <div>
                      <strong className="text-green-300">Monitor Account Activity</strong>
                      <p className="text-gray-400 text-sm">Regularly check your Steam account for unauthorized login attempts or changes.</p>
                    </div>
                  </li>
                  <li className="flex items-start space-x-3">
                    <UserX className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                    <div>
                      <strong className="text-green-300">Keep Profile Private</strong>
                      <p className="text-gray-400 text-sm">Set your Steam inventory to private or friends-only to reduce targeted scamming.</p>
                    </div>
                  </li>
                </ul>
              </div>
              
              <div className="bg-gray-800/50 p-8 rounded-lg">
                <h3 className="text-xl font-semibold mb-6 text-red-400">Common Attack Methods</h3>
                <div className="space-y-4">
                  <div className="border-l-4 border-red-500 pl-4">
                    <h4 className="font-semibold text-red-300">Phishing Links</h4>
                    <p className="text-gray-400 text-sm">Fake websites that steal your login credentials. Always type URLs manually.</p>
                  </div>
                  <div className="border-l-4 border-orange-500 pl-4">
                    <h4 className="font-semibold text-orange-300">Impersonation</h4>
                    <p className="text-gray-400 text-sm">Scammers pretending to be CSMarket staff or well-known traders.</p>
                  </div>
                  <div className="border-l-4 border-yellow-500 pl-4">
                    <h4 className="font-semibold text-yellow-300">Social Engineering</h4>
                    <p className="text-gray-400 text-sm">Manipulating users into revealing sensitive information through conversation.</p>
                  </div>
                  <div className="border-l-4 border-purple-500 pl-4">
                    <h4 className="font-semibold text-purple-300">Malware/Keyloggers</h4>
                    <p className="text-gray-400 text-sm">Malicious software that records keystrokes to steal passwords.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Trading Safety */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-8"
          >
            <h2 className="text-3xl font-bold mb-8 flex items-center">
              <Shield className="w-8 h-8 text-green-500 mr-3" />
              Safe Trading Practices
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-gray-800/50 p-6 rounded-lg">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Eye className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-3 text-center">Verify Before Trading</h3>
                <ul className="text-gray-300 text-sm space-y-2">
                  <li>• Check seller ratings and reviews</li>
                  <li>• Use item inspection tools</li>
                  <li>• Verify item float and pattern</li>
                  <li>• Confirm sticker authenticity</li>
                  <li>• Check recent price history</li>
                </ul>
              </div>
              
              <div className="bg-gray-800/50 p-6 rounded-lg">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-3 text-center">Use Platform Protection</h3>
                <ul className="text-gray-300 text-sm space-y-2">
                  <li>• Always use escrow system</li>
                  <li>• Never trade outside CSMarket</li>
                  <li>• Report suspicious behavior</li>
                  <li>• Use dispute resolution if needed</li>
                  <li>• Keep transaction records</li>
                </ul>
              </div>
              
              <div className="bg-gray-800/50 p-6 rounded-lg">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-3 text-center">Trust Your Instincts</h3>
                <ul className="text-gray-300 text-sm space-y-2">
                  <li>• If deal seems too good, be cautious</li>
                  <li>• Don't rush important decisions</li>
                  <li>• Ask questions when unsure</li>
                  <li>• Start with small trades</li>
                  <li>• Build trust gradually</li>
                </ul>
              </div>
            </div>
          </motion.section>

          {/* Red Flags */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-8"
          >
            <h2 className="text-3xl font-bold mb-8 text-red-400 flex items-center">
              <AlertTriangle className="w-8 h-8 mr-3" />
              Red Flags to Watch For
            </h2>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-red-300">Suspicious Seller Behavior</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li>• Pressuring you to trade quickly</li>
                    <li>• Asking for payment outside platform</li>
                    <li>• New account with no trading history</li>
                    <li>• Refusing to use escrow protection</li>
                    <li>• Poor communication or evasive answers</li>
                    <li>• Prices significantly below market value</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-red-300">Technical Warning Signs</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li>• Suspicious links or file downloads</li>
                    <li>• Requests for personal information</li>
                    <li>• Unusual payment methods</li>
                    <li>• Multiple accounts from same person</li>
                    <li>• Claims of "special connections" or insider deals</li>
                    <li>• Inconsistent item details or photos</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Emergency Response */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="mb-8"
          >
            <h2 className="text-3xl font-bold mb-8">If You've Been Compromised</h2>
            <div className="bg-gray-800/50 p-8 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-orange-300">Immediate Actions</h3>
                  <ol className="space-y-2 text-gray-300">
                    <li className="flex items-start">
                      <span className="bg-orange-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5 flex-shrink-0">1</span>
                      Change your Steam password immediately
                    </li>
                    <li className="flex items-start">
                      <span className="bg-orange-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5 flex-shrink-0">2</span>
                      Contact CSMarket support immediately
                    </li>
                    <li className="flex items-start">
                      <span className="bg-orange-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5 flex-shrink-0">3</span>
                      Check your account for unauthorized trades
                    </li>
                    <li className="flex items-start">
                      <span className="bg-orange-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5 flex-shrink-0">4</span>
                      Run antivirus scan on your computer
                    </li>
                  </ol>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-blue-300">Recovery Steps</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li>• File a support ticket with details</li>
                    <li>• Provide proof of account ownership</li>
                    <li>• Document any unauthorized transactions</li>
                    <li>• Follow support team instructions</li>
                    <li>• Strengthen security after recovery</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Contact CTA */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="text-center bg-gradient-to-r from-red-600/20 to-orange-600/20 p-12 rounded-lg"
          >
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">Security Concerns?</h2>
            <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
              If you suspect any security issues or need help securing your account, contact our security team immediately.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/contact"
                className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-lg transition-all duration-300 hover:scale-105"
              >
                Report Security Issue
              </Link>
              <Link
                to="/trading-guide"
                className="border border-red-500 text-red-400 hover:bg-red-500 hover:text-white px-8 py-3 rounded-lg transition-all duration-300"
              >
                View Trading Guide
              </Link>
            </div>
          </motion.section>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default SecurityTipsPage;