import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const RefundPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white">
      <Header />
      <div className="pt-20 pb-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8"
          >
            <Link
              to="/"
              className="inline-flex items-center text-orange-500 hover:text-orange-400 transition-colors"
            >
              <ArrowLeft size={20} className="mr-2" />
              Back to Home
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
              Refund Policy
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Understanding our refund and return policy for CS2 skin purchases.
            </p>
            <div className="flex items-center justify-center mt-4 text-gray-400">
              <RefreshCw className="w-5 h-5 mr-2" />
              <span>Last updated: January 15, 2025</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6 mb-8"
          >
            <div className="flex items-start">
              <AlertTriangle className="w-6 h-6 text-orange-400 mr-3 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-orange-300 mb-2">Important Notice</h3>
                <p className="text-gray-300">
                  Due to the digital nature of CS2 skins and Steam's trading policies, refunds are subject to specific conditions. Please read this policy carefully before making a purchase.
                </p>
              </div>
            </div>
          </motion.div>

          <div className="max-w-4xl mx-auto space-y-6">
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
            >
              <div className="flex items-center mb-4">
                <CheckCircle className="w-6 h-6 text-green-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">Eligible for Refund</h2>
              </div>
              <div className="space-y-4 text-gray-300">
                <div className="pl-9">
                  <h3 className="font-semibold text-white mb-2">You may be eligible for a refund if:</h3>
                  <ul className="list-disc list-inside space-y-2">
                    <li>The item received does not match the description or advertised condition</li>
                    <li>The item has significant undisclosed defects (e.g., wrong float value, missing stickers)</li>
                    <li>The seller fails to deliver the item within 48 hours</li>
                    <li>You receive a completely different item than what you ordered</li>
                    <li>Technical issues prevent the trade from completing on our platform</li>
                  </ul>
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
            >
              <div className="flex items-center mb-4">
                <XCircle className="w-6 h-6 text-red-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">Not Eligible for Refund</h2>
              </div>
              <div className="space-y-4 text-gray-300">
                <div className="pl-9">
                  <h3 className="font-semibold text-white mb-2">Refunds will NOT be granted for:</h3>
                  <ul className="list-disc list-inside space-y-2">
                    <li>Change of mind after receiving the item</li>
                    <li>Price fluctuations after purchase (market price changes)</li>
                    <li>Items that match the description and advertised condition</li>
                    <li>Buyer's remorse or impulse purchases</li>
                    <li>Issues caused by Steam trading restrictions on your account</li>
                    <li>Failure to accept the Steam trade offer within the specified timeframe</li>
                  </ul>
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
            >
              <div className="flex items-center mb-4">
                <Clock className="w-6 h-6 text-blue-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">Refund Process & Timeline</h2>
              </div>
              <div className="space-y-4 text-gray-300 pl-9">
                <div>
                  <h3 className="font-semibold text-white mb-2">How to Request a Refund:</h3>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Contact our support team within 24 hours of the transaction</li>
                    <li>Provide your order ID and detailed reason for the refund request</li>
                    <li>Include screenshots or evidence supporting your claim</li>
                    <li>Wait for our team to review your request (usually within 12-24 hours)</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-2 mt-4">Processing Time:</h3>
                  <ul className="list-disc list-inside space-y-2">
                    <li>Review period: 12-24 hours</li>
                    <li>If approved, refund issued within 1-3 business days</li>
                    <li>Funds returned to your Skinify balance or original payment method</li>
                    <li>Steam trade offers must be cancelled by both parties</li>
                  </ul>
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
            >
              <h2 className="text-2xl font-bold text-white mb-4">Dispute Resolution</h2>
              <div className="space-y-3 text-gray-300">
                <p>
                  If you disagree with a refund decision, you can escalate the matter through our dispute resolution process.
                  Visit our <Link to="/dispute-resolution" className="text-orange-400 hover:text-orange-300 underline">Dispute Resolution</Link> page for more information.
                </p>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
            >
              <h2 className="text-2xl font-bold text-white mb-4">Partial Refunds</h2>
              <div className="space-y-3 text-gray-300">
                <p>
                  In some cases, a partial refund may be offered if:
                </p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>The item has minor undisclosed defects but is still usable</li>
                  <li>There was a significant delay in delivery caused by the seller</li>
                  <li>Both parties agree to a partial refund settlement</li>
                </ul>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
            >
              <h2 className="text-2xl font-bold text-white mb-4">Contact Support</h2>
              <div className="space-y-3 text-gray-300">
                <p>
                  For refund requests or questions about our policy:
                </p>
                <div className="bg-gray-700/30 rounded-lg p-4 space-y-2">
                  <p><strong className="text-white">Email:</strong> refunds@skinify.com</p>
                  <p>
                    <strong className="text-white">Support:</strong>{' '}
                    <Link to="/support" className="text-orange-400 hover:text-orange-300 underline">
                      24/7 Live Chat
                    </Link>
                  </p>
                  <p><strong className="text-white">Response Time:</strong> Within 12-24 hours</p>
                </div>
              </div>
            </motion.section>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default RefundPolicyPage;
