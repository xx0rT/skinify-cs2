import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search, User, HelpCircle, Package } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* 404 Number */}
        <div className="mb-8">
          <div className="text-[150px] md:text-[200px] font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent leading-none">
            404
          </div>
        </div>

        {/* Message */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Page Not Found
          </h1>
          <p className="text-lg text-gray-400">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-lg font-medium transition-colors"
          >
            <Home size={20} />
            Go to Homepage
          </button>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-purple-400 px-8 py-3 rounded-lg font-medium border border-purple-500/30 hover:border-purple-500/50 transition-colors"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/marketplace')}
            className="bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700 hover:border-purple-500/50 p-6 transition-colors group"
          >
            <Search className="w-8 h-8 text-purple-400 mb-2 mx-auto" />
            <div className="text-white font-medium text-sm">Marketplace</div>
          </button>

          <button
            onClick={() => navigate('/profile')}
            className="bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700 hover:border-purple-500/50 p-6 transition-colors group"
          >
            <User className="w-8 h-8 text-purple-400 mb-2 mx-auto" />
            <div className="text-white font-medium text-sm">Profile</div>
          </button>

          <button
            onClick={() => navigate('/rewards')}
            className="bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700 hover:border-purple-500/50 p-6 transition-colors group"
          >
            <Package className="w-8 h-8 text-purple-400 mb-2 mx-auto" />
            <div className="text-white font-medium text-sm">Rewards</div>
          </button>

          <button
            onClick={() => navigate('/support')}
            className="bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700 hover:border-purple-500/50 p-6 transition-colors group"
          >
            <HelpCircle className="w-8 h-8 text-purple-400 mb-2 mx-auto" />
            <div className="text-white font-medium text-sm">Support</div>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-12">
          <p className="text-gray-500 text-sm">
            Error Code: 404 | Need help?{' '}
            <span
              onClick={() => navigate('/support')}
              className="text-purple-400 hover:text-purple-300 cursor-pointer underline"
            >
              Contact support
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
