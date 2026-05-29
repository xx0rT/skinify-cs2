import React from 'react';
import { motion } from 'framer-motion';
import { Gamepad2 } from 'lucide-react';

const SteamLogin: React.FC = () => {
  const handleSteamLogin = () => {
    // FIXED: Always use the correct callback URL that matches your Steam API key
    const CALLBACK_URL = 'https://skinify.gg/auth/callback';
    
    // Construct Steam OpenID URL
    const steamOpenIDUrl = new URL('https://steamcommunity.com/openid/login');
    
    const params = {
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': CALLBACK_URL,
      'openid.realm': 'https://skinify.gg',
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
    };

    // Add parameters to URL
    Object.entries(params).forEach(([key, value]) => {
      steamOpenIDUrl.searchParams.append(key, value);
    });

    console.log('Steam login URL:', steamOpenIDUrl.toString());
    console.log('Callback URL (return_to):', CALLBACK_URL);
    
    // Redirect to Steam
    window.location.href = steamOpenIDUrl.toString();
  };

  return (
    <motion.button
      onClick={handleSteamLogin}
      className="flex items-center px-3 md:px-6 py-2 md:py-3 bg-[#171a21] text-white rounded-lg hover:bg-[#2a475e] transition-all duration-300 hover:scale-105 space-x-1 md:space-x-2 font-medium"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Gamepad2 className="w-4 h-4 md:w-5 md:h-5" />
      <span className="text-sm md:text-base">Sign in with Steam</span>
    </motion.button>
  );
};

export default SteamLogin;