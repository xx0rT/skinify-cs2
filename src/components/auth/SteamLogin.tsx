import React from 'react';
import { motion } from 'framer-motion';
import { Gamepad2 } from 'lucide-react';

const SteamLogin: React.FC = () => {
  const handleSteamLogin = () => {
    // Use the current origin so this works in dev (localhost), preview, and
    // production without per-env hardcoding. Override with VITE_STEAM_RETURN_URL
    // if you need to force a different callback (e.g. when running behind a
    // reverse proxy or for staging).
    const returnTo =
      (import.meta as any).env?.VITE_STEAM_RETURN_URL ||
      `${window.location.origin}/auth/callback`;
    const realm =
      (import.meta as any).env?.VITE_STEAM_REALM || window.location.origin;

    const steamOpenIDUrl = new URL('https://steamcommunity.com/openid/login');
    const params = {
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': returnTo,
      'openid.realm': realm,
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
    };
    Object.entries(params).forEach(([key, value]) => {
      steamOpenIDUrl.searchParams.append(key, value);
    });
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