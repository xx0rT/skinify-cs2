import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Scale, Shield, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const TermsPage: React.FC = () => {
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
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
              Terms of Service
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Please read these terms carefully before using Skinify services.
            </p>
            <div className="flex items-center justify-center mt-4 text-gray-400">
              <Scale className="w-5 h-5 mr-2" />
              <span>Last updated: January 15, 2025</span>
            </div>

            {/* Company Info */}
            <div className="mt-6 bg-gray-800/50 p-6 rounded-lg max-w-2xl mx-auto text-left">
              <h3 className="text-lg font-bold text-blue-400 mb-3">Service Provider</h3>
              <div className="text-gray-300 text-sm space-y-1">
                <p><strong>Company Name:</strong> LosSelloutos s.r.o.</p>
                <p><strong>Legal Form:</strong> Limited Liability Company</p>
                <p><strong>Business ID (IČO):</strong> 06448771</p>
                <p><strong>Tax ID:</strong> 06448771</p>
                <p><strong>Address:</strong> Bělehradská 858/23, 120 00 Praha, Česká republika</p>
                <p><strong>Bank Account:</strong> 4977984339/0800</p>
                <p><strong>Registration Date:</strong> 17.10.2025</p>
              </div>
            </div>
          </motion.div>

          {/* Important Notice */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 mb-8"
          >
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-blue-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-blue-300 mb-2">Important Notice</h3>
                <p className="text-gray-300">
                  By accessing and using Skinify, you agree to be bound by these Terms of Service.
                  If you do not agree to these terms, please do not use our services.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Terms Content */}
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
                Acceptance of Terms
              </h2>
              <div className="bg-gray-800/50 p-6 rounded-lg space-y-4">
                <p className="text-gray-300">
                  These Terms of Service ("Terms") govern your use of the Skinify platform and services. 
                  By creating an account or using our services, you acknowledge that you have read, 
                  understood, and agree to be bound by these Terms.
                </p>
                <p className="text-gray-300">
                  We reserve the right to modify these Terms at any time. Changes will be effective 
                  immediately upon posting. Your continued use of the service after changes are posted 
                  constitutes your acceptance of the modified Terms.
                </p>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">2</div>
                Eligibility and Account Registration
              </h2>
              <div className="bg-gray-800/50 p-6 rounded-lg space-y-4">
                <p className="text-gray-300">
                  You must be at least 13 years old to use CSMarket. By using our services, you represent 
                  and warrant that you meet this age requirement.
                </p>
                <p className="text-gray-300">
                  You are responsible for maintaining the confidentiality of your account credentials 
                  and for all activities that occur under your account. You agree to notify us immediately 
                  of any unauthorized use of your account.
                </p>
                <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                  <li>Provide accurate and complete information during registration</li>
                  <li>Maintain and update your account information</li>
                  <li>Not share your account with others</li>
                  <li>Use Steam Guard authentication as required</li>
                </ul>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">3</div>
                Trading and Marketplace Rules
              </h2>
              <div className="bg-gray-800/50 p-6 rounded-lg space-y-4">
                <p className="text-gray-300">
                  CSMarket provides a platform for users to trade CS2 items safely. All trades must 
                  comply with our marketplace rules and Steam's Terms of Service.
                </p>
                <h4 className="font-semibold text-white">Prohibited Activities:</h4>
                <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                  <li>Trading items obtained through cheating, hacking, or fraud</li>
                  <li>Manipulating prices through artificial means</li>
                  <li>Creating multiple accounts to circumvent restrictions</li>
                  <li>Engaging in money laundering or other illegal activities</li>
                  <li>Harassment, abuse, or threatening behavior toward other users</li>
                </ul>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">4</div>
                Fees and Payments
              </h2>
              <div className="bg-gray-800/50 p-6 rounded-lg space-y-4">
                <p className="text-gray-300">
                  CSMarket charges fees for certain services. Current fee structure:
                </p>
                <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                  <li>Trading fee: 2% of transaction value (with volume discounts available)</li>
                  <li>Withdrawal fee: 1.5% of withdrawal amount</li>
                  <li>Currency conversion fees may apply for international transactions</li>
                </ul>
                <p className="text-gray-300">
                  All fees are clearly displayed before transaction completion. We reserve the right 
                  to change fees with 30 days' notice.
                </p>
              </div>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">5</div>
                Dispute Resolution and Refunds
              </h2>
              <div className="bg-gray-800/50 p-6 rounded-lg space-y-4">
                <p className="text-gray-300">
                  We provide dispute resolution services for transactions conducted through our platform. 
                  Our escrow system protects both buyers and sellers.
                </p>
                <h4 className="font-semibold text-white">Refund Policy:</h4>
                <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                  <li>Refunds available if seller fails to deliver items as described</li>
                  <li>Buyer protection through our escrow system</li>
                  <li>Disputes must be reported within 7 days of transaction</li>
                  <li>Platform fees are non-refundable except in cases of platform error</li>
                </ul>
              </div>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">6</div>
                Intellectual Property
              </h2>
              <div className="bg-gray-800/50 p-6 rounded-lg space-y-4">
                <p className="text-gray-300">
                  CSMarket and its original content, features, and functionality are owned by CSMarket 
                  and are protected by international copyright, trademark, and other intellectual property laws.
                </p>
                <p className="text-gray-300">
                  Users retain ownership of their CS2 items. CSMarket does not claim ownership of virtual 
                  items traded on the platform.
                </p>
              </div>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">7</div>
                Limitation of Liability
              </h2>
              <div className="bg-gray-800/50 p-6 rounded-lg space-y-4">
                <p className="text-gray-300">
                  CSMarket shall not be liable for any indirect, incidental, special, consequential, 
                  or punitive damages resulting from your use of the service.
                </p>
                <p className="text-gray-300">
                  Our total liability for any claim arising from these Terms or your use of the service 
                  shall not exceed the amount you paid to CSMarket in the 12 months preceding the claim.
                </p>
              </div>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <div className="w-8 h-8 bg-pink-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">8</div>
                Termination
              </h2>
              <div className="bg-gray-800/50 p-6 rounded-lg space-y-4">
                <p className="text-gray-300">
                  We reserve the right to suspend or terminate your account at our discretion, 
                  including for violations of these Terms or suspicious activity.
                </p>
                <p className="text-gray-300">
                  Upon termination, your right to use the service will cease immediately. 
                  However, all provisions of these Terms that should survive termination shall survive.
                </p>
              </div>
            </section>

            {/* Contact Information */}
            <section className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-8 rounded-lg">
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <Shield className="w-8 h-8 text-blue-500 mr-3" />
                Contact Information
              </h2>
              <p className="text-gray-300 mb-4">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="space-y-2 text-gray-300">
                <p>Email: legal@csmarket.com</p>
                <p>Address: Prague, Czech Republic</p>
                <p>Response time: Within 48 hours for legal inquiries</p>
              </div>
            </section>
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TermsPage;