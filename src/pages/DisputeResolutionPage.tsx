import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Scale, Users, MessageSquare, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const DisputeResolutionPage: React.FC = () => {
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
              Dispute Resolution
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Fair and transparent process for resolving trading disputes on Skinify.
            </p>
            <div className="flex items-center justify-center mt-4 text-gray-400">
              <Scale className="w-5 h-5 mr-2" />
              <span>Last updated: January 15, 2025</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 mb-8"
          >
            <div className="flex items-start">
              <AlertCircle className="w-6 h-6 text-blue-400 mr-3 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-blue-300 mb-2">Our Commitment</h3>
                <p className="text-gray-300">
                  Skinify is committed to providing a fair, transparent, and efficient dispute resolution process.
                  We aim to resolve all disputes within 72 hours while ensuring both parties are heard.
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
                <MessageSquare className="w-6 h-6 text-orange-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">When to Open a Dispute</h2>
              </div>
              <div className="space-y-4 text-gray-300">
                <p>You should open a dispute if:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>The seller fails to deliver the item within 48 hours</li>
                  <li>The item received does not match the description</li>
                  <li>You discover undisclosed defects or issues with the item</li>
                  <li>The seller requests payment outside the platform</li>
                  <li>You suspect fraudulent activity</li>
                  <li>Communication with the seller has broken down</li>
                  <li>Your refund request was denied and you disagree with the decision</li>
                </ul>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
            >
              <div className="flex items-center mb-4">
                <FileText className="w-6 h-6 text-green-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">How to File a Dispute</h2>
              </div>
              <div className="space-y-4 text-gray-300">
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-3">Step-by-Step Process:</h3>
                  <ol className="space-y-3">
                    <li className="flex items-start">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 font-bold text-sm mr-3 flex-shrink-0">1</span>
                      <div>
                        <strong className="text-white">Navigate to Your Orders</strong>
                        <p className="text-sm mt-1">Go to your profile and find the problematic transaction</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 font-bold text-sm mr-3 flex-shrink-0">2</span>
                      <div>
                        <strong className="text-white">Click "Open Dispute"</strong>
                        <p className="text-sm mt-1">Select the dispute button next to the order</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 font-bold text-sm mr-3 flex-shrink-0">3</span>
                      <div>
                        <strong className="text-white">Provide Details</strong>
                        <p className="text-sm mt-1">Explain the issue clearly and attach supporting evidence</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 font-bold text-sm mr-3 flex-shrink-0">4</span>
                      <div>
                        <strong className="text-white">Submit Evidence</strong>
                        <p className="text-sm mt-1">Upload screenshots, chat logs, or other relevant documentation</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 font-bold text-sm mr-3 flex-shrink-0">5</span>
                      <div>
                        <strong className="text-white">Wait for Review</strong>
                        <p className="text-sm mt-1">Our team will review within 24 hours</p>
                      </div>
                    </li>
                  </ol>
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
                <h2 className="text-2xl font-bold text-white">Resolution Timeline</h2>
              </div>
              <div className="space-y-4 text-gray-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-700/30 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-orange-400 mb-2">24h</div>
                    <div className="text-sm">Initial Review</div>
                  </div>
                  <div className="bg-gray-700/30 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-orange-400 mb-2">48h</div>
                    <div className="text-sm">Investigation</div>
                  </div>
                  <div className="bg-gray-700/30 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-orange-400 mb-2">72h</div>
                    <div className="text-sm">Final Decision</div>
                  </div>
                </div>
                <p className="text-sm">
                  Most disputes are resolved within 48-72 hours. Complex cases may take longer,
                  and you'll be kept informed throughout the process.
                </p>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
            >
              <div className="flex items-center mb-4">
                <Users className="w-6 h-6 text-purple-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">Mediation Process</h2>
              </div>
              <div className="space-y-4 text-gray-300">
                <p>Our mediation team follows these principles:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <CheckCircle2 className="w-5 h-5 text-green-400 mb-2" />
                    <h4 className="font-semibold text-white mb-1">Impartiality</h4>
                    <p className="text-sm">We remain neutral and hear both sides equally</p>
                  </div>
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <CheckCircle2 className="w-5 h-5 text-green-400 mb-2" />
                    <h4 className="font-semibold text-white mb-1">Evidence-Based</h4>
                    <p className="text-sm">Decisions based on facts and documentation</p>
                  </div>
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <CheckCircle2 className="w-5 h-5 text-green-400 mb-2" />
                    <h4 className="font-semibold text-white mb-1">Transparency</h4>
                    <p className="text-sm">Clear communication throughout the process</p>
                  </div>
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <CheckCircle2 className="w-5 h-5 text-green-400 mb-2" />
                    <h4 className="font-semibold text-white mb-1">Fair Outcomes</h4>
                    <p className="text-sm">Solutions that protect both parties' interests</p>
                  </div>
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
            >
              <h2 className="text-2xl font-bold text-white mb-4">Possible Outcomes</h2>
              <div className="space-y-3 text-gray-300">
                <p>After reviewing all evidence, we may:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li><strong className="text-white">Full Refund:</strong> If the seller clearly breached terms</li>
                  <li><strong className="text-white">Partial Refund:</strong> If both parties share some responsibility</li>
                  <li><strong className="text-white">Transaction Stands:</strong> If the seller fulfilled all obligations</li>
                  <li><strong className="text-white">Replacement Item:</strong> If available and both parties agree</li>
                  <li><strong className="text-white">Account Action:</strong> Warnings or bans for policy violations</li>
                </ul>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
            >
              <h2 className="text-2xl font-bold text-white mb-4">Tips for Successful Resolution</h2>
              <div className="space-y-3 text-gray-300">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <ul className="list-disc list-inside space-y-2">
                    <li>Provide clear, detailed descriptions of the issue</li>
                    <li>Include all relevant screenshots and evidence</li>
                    <li>Respond promptly to requests for additional information</li>
                    <li>Remain professional and factual in all communications</li>
                    <li>Be open to compromise and reasonable solutions</li>
                  </ul>
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
            >
              <h2 className="text-2xl font-bold text-white mb-4">Escalation</h2>
              <div className="space-y-3 text-gray-300">
                <p>
                  If you're not satisfied with the initial resolution, you can request an escalation review
                  within 7 days. A senior mediator will conduct a thorough re-evaluation of your case.
                </p>
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <p className="font-semibold text-white mb-2">Contact for Escalations:</p>
                  <p>Email: disputes@skinify.com</p>
                  <p>Subject: Dispute Escalation - [Order ID]</p>
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6"
            >
              <h2 className="text-2xl font-bold text-white mb-4">Need Help?</h2>
              <div className="space-y-3 text-gray-300">
                <p>Our support team is here to assist you through the dispute process:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <p className="font-semibold text-white mb-1">24/7 Live Support</p>
                    <Link to="/support" className="text-orange-400 hover:text-orange-300 underline">
                      Chat with us now
                    </Link>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <p className="font-semibold text-white mb-1">Email Support</p>
                    <a href="mailto:disputes@skinify.com" className="text-orange-400 hover:text-orange-300 underline">
                      disputes@skinify.com
                    </a>
                  </div>
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

export default DisputeResolutionPage;
