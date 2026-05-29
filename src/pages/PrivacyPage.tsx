import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Eye, Database, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const PrivacyPage: React.FC = () => {
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
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-green-500 to-green-700 bg-clip-text text-transparent">
              Privacy Policy
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Your privacy is important to us. This policy explains how we collect, use, and protect your information.
            </p>
            <div className="flex items-center justify-center mt-4 text-gray-400">
              <Shield className="w-5 h-5 mr-2" />
              <span>Last updated: January 15, 2025</span>
            </div>

            {/* Company Info */}
            <div className="mt-6 bg-gray-800/50 p-6 rounded-lg max-w-2xl mx-auto text-left">
              <h3 className="text-lg font-bold text-green-400 mb-3">Data Controller</h3>
              <div className="text-gray-300 text-sm space-y-1">
                <p><strong>Company Name:</strong> LosSelloutos s.r.o.</p>
                <p><strong>Legal Form:</strong> Limited Liability Company</p>
                <p><strong>Business ID (IČO):</strong> 06448771</p>
                <p><strong>Tax ID:</strong> 06448771</p>
                <p><strong>Address:</strong> Bělehradská 858/23, 120 00 Praha, Česká republika</p>
                <p><strong>Bank Account:</strong> 4977984339/0800</p>
                <p><strong>Registration Date:</strong> 17.10.2025</p>
                <p className="mt-3 pt-3 border-t border-gray-700"><strong>Contact for Privacy Inquiries:</strong> <a href="/contact" className="text-green-400 hover:text-green-300">Contact Support</a></p>
              </div>
            </div>
          </motion.div>

          {/* Privacy Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
          >
            <div className="text-center bg-gray-800/50 p-6 rounded-lg">
              <Database className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Data Collection</h3>
              <p className="text-gray-400 text-sm">We only collect necessary information to provide our services</p>
            </div>
            <div className="text-center bg-gray-800/50 p-6 rounded-lg">
              <Lock className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Data Protection</h3>
              <p className="text-gray-400 text-sm">Your data is encrypted and securely stored with industry-standard protection</p>
            </div>
            <div className="text-center bg-gray-800/50 p-6 rounded-lg">
              <Eye className="w-12 h-12 text-purple-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Transparency</h3>
              <p className="text-gray-400 text-sm">You have full control and visibility over your personal data</p>
            </div>
          </motion.div>

          {/* Privacy Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="max-w-4xl mx-auto space-y-6"
          >
            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">1</div>
                Information We Collect
              </h2>
              <div className="bg-gray-800/50 p-6 rounded-lg space-y-4">
                <h4 className="font-semibold text-white">Personal Information:</h4>
                <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                  <li>Steam ID and profile information (display name, avatar)</li>
                  <li>Email address for account verification and communications</li>
                  <li>Payment information for transactions (processed by secure third parties)</li>
                  <li>Trading history and preferences</li>
                </ul>
                
                <h4 className="font-semibold text-white">Automatically Collected Information:</h4>
                <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                  <li>IP address and location data</li>
                  <li>Browser type and device information</li>
                  <li>Platform usage analytics and performance data</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">2</div>
                How We Use Your Information
              </h2>
              <div className="bg-gray-800/50 p-6 rounded-lg space-y-4">
                <p className="text-gray-300">
                  We use your information solely to provide and improve our services:
                </p>
                <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                  <li>Process trades and transactions securely</li>
                  <li>Verify user identity and prevent fraud</li>
                  <li>Provide customer support and resolve disputes</li>
                  <li>Send important notifications about your account</li>
                  <li>Improve platform features and user experience</li>
                  <li>Comply with legal obligations and enforce our Terms</li>
                </ul>
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mt-4">
                  <p className="text-green-300 text-sm">
                    <strong>We never sell your personal information to third parties.</strong>
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">3</div>
                Information Sharing and Disclosure
              </h2>
              <div className="bg-gray-800/50 p-6 rounded-lg space-y-4">
                <p className="text-gray-300">
                  We may share your information in limited circumstances:
                </p>
                
                <h4 className="font-semibold text-white">Service Providers:</h4>
                <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                  <li>Payment processors for transaction handling</li>
                  <li>Cloud storage providers for data hosting</li>
                  <li>Security services for fraud prevention</li>
                  <li>Analytics providers for platform improvement</li>
                </ul>

                <h4 className="font-semibold text-white">Legal Requirements:</h4>
                <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                  <li>When required by law or legal process</li>
                  <li>To protect our rights and property</li>
                  <li>To prevent fraud or illegal activities</li>
                  <li>In connection with business transfers</li>
                </ul>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">4</div>
                Data Security and Protection
              </h2>
              <div className="bg-gray-800/50 p-6 rounded-lg space-y-4">
                <p className="text-gray-300">
                  We implement comprehensive security measures to protect your data:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-white mb-3">Technical Safeguards:</h4>
                    <ul className="list-disc list-inside text-gray-300 space-y-2">
                      <li>SSL/TLS encryption for all data transmission</li>
                      <li>AES-256 encryption for stored data</li>
                      <li>Regular security audits and penetration testing</li>
                      <li>Multi-factor authentication requirements</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-3">Operational Safeguards:</h4>
                    <ul className="list-disc list-inside text-gray-300 space-y-2">
                      <li>Limited access to personal data on need-to-know basis</li>
                      <li>Regular employee security training</li>
                      <li>Incident response and breach notification procedures</li>
                      <li>Secure data centers with physical security controls</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">5</div>
                Your Privacy Rights
              </h2>
              <div className="bg-gray-800/50 p-6 rounded-lg space-y-4">
                <p className="text-gray-300">
                  You have the following rights regarding your personal data:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-white mb-3">Access and Control:</h4>
                    <ul className="list-disc list-inside text-gray-300 space-y-2">
                      <li>Request access to your personal data</li>
                      <li>Update or correct your information</li>
                      <li>Download your data in portable format</li>
                      <li>Control privacy settings and preferences</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-3">Deletion and Restrictions:</h4>
                    <ul className="list-disc list-inside text-gray-300 space-y-2">
                      <li>Request deletion of your account and data</li>
                      <li>Restrict processing of your information</li>
                      <li>Object to certain uses of your data</li>
                      <li>Withdraw consent for optional features</li>
                    </ul>
                  </div>
                </div>
                
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-4">
                  <p className="text-blue-300 text-sm">
                    To exercise these rights, contact us at privacy@csmarket.com or through your account settings.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">6</div>
                Cookies and Tracking
              </h2>
              <div className="bg-gray-800/50 p-6 rounded-lg space-y-4">
                <p className="text-gray-300">
                  We use cookies and similar technologies to enhance your experience:
                </p>
                
                <h4 className="font-semibold text-white">Types of Cookies:</h4>
                <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                  <li><strong>Essential Cookies:</strong> Required for platform functionality</li>
                  <li><strong>Performance Cookies:</strong> Help us improve site performance</li>
                  <li><strong>Analytics Cookies:</strong> Understand how users interact with our site</li>
                  <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
                </ul>
                
                <p className="text-gray-300">
                  You can manage cookie preferences through your browser settings or our cookie consent banner.
                </p>
              </div>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">7</div>
                International Data Transfers
              </h2>
              <div className="bg-gray-800/50 p-6 rounded-lg space-y-4">
                <p className="text-gray-300">
                  CSMarket operates globally and may transfer your data across international borders. 
                  We ensure adequate protection through:
                </p>
                <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                  <li>Standard Contractual Clauses with service providers</li>
                  <li>Adequacy decisions for certain jurisdictions</li>
                  <li>Appropriate safeguards for all international transfers</li>
                  <li>Compliance with applicable data protection laws</li>
                </ul>
              </div>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <div className="w-8 h-8 bg-pink-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">8</div>
                Data Retention
              </h2>
              <div className="bg-gray-800/50 p-6 rounded-lg space-y-4">
                <p className="text-gray-300">
                  We retain your data only as long as necessary to provide our services:
                </p>
                <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                  <li>Account data: Retained while account is active plus 3 years</li>
                  <li>Transaction records: 7 years for legal and tax compliance</li>
                  <li>Support communications: 2 years after case closure</li>
                  <li>Analytics data: Aggregated and anonymized after 26 months</li>
                </ul>
                <p className="text-gray-300">
                  You may request earlier deletion, subject to legal obligations.
                </p>
              </div>
            </section>

            {/* Contact Information */}
            <section className="bg-gradient-to-r from-green-600/20 to-blue-600/20 p-8 rounded-lg">
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <Shield className="w-8 h-8 text-green-500 mr-3" />
                Privacy Contact Information
              </h2>
              <p className="text-gray-300 mb-4">
                For privacy-related questions or to exercise your rights:
              </p>
              <div className="space-y-2 text-gray-300">
                <p>Email: privacy@csmarket.com</p>
                <p>Data Protection Officer: dpo@csmarket.com</p>
                <p>Address: Prague, Czech Republic</p>
                <p>Response time: Within 30 days for privacy requests</p>
              </div>
            </section>
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PrivacyPage;