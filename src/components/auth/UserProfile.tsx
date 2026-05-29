import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  LogOut,
  DollarSign,
  User,
  Settings,
  ShoppingBag,
  Bell,
  Shield,
  ChevronDown,
  Wallet,
  TrendingUp,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  Tag,
  Store,
  ArrowUpDown,
  Eye,
  MessageCircle,
  Globe
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useBalanceStore } from '../../store/balanceStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useTranslationStore, removeLanguagePrefix } from '../../store/translationStore';
import { useToastStore } from '../../store/toastStore';
import BalanceDisplay from '../balance/BalanceDisplay';

const UserProfile: React.FC = () => {
  const { user, isOwner, logout } = useAuthStore();
  const { balance, fetchBalance } = useBalanceStore();
  const { unreadCount } = useNotificationStore();
  const { currentLanguage, setLanguageByCode } = useTranslationStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = React.useState(false);
  const [dropdownPosition, setDropdownPosition] = React.useState({ top: 0, right: 0 });
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const languages = [
    { code: 'en', flag: '🇬🇧', name: 'English' },
    { code: 'cs', flag: '🇨🇿', name: 'Čeština' },
    { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
    { code: 'ru', flag: '🇷🇺', name: 'Русский' }
  ];

  // Fetch balance when component mounts
  React.useEffect(() => {
    if (user) {
      fetchBalance(user.steamId);
    }
  }, [user, fetchBalance]);

  // Calculate dropdown position when shown
  React.useEffect(() => {
    if (showDropdown && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
  }, [showDropdown]);

  if (!user) return null;

  return (
    <div className="relative">
      {/* User Profile Button with Dropdown */}
      <motion.button
        ref={buttonRef}
        onClick={() => setShowDropdown(!showDropdown)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center space-x-2 md:space-x-3 text-white transition-all duration-300 relative"
      >
        <motion.img
          src={user.avatarUrl}
          alt={user.displayName}
          className="w-8 h-8 md:w-10 md:h-10 rounded-full cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            navigate('/profile');
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        />
        <div className="hidden sm:flex flex-col text-left">
          <span className="font-medium flex items-center">
            {user.displayName}
            {isOwner && (
              <span className="ml-1 md:ml-2 px-1.5 md:px-2 py-0.5 text-xs bg-gradient-to-r from-yellow-500 to-orange-500 text-black rounded-full font-bold">
                VIP
              </span>
            )}
          </span>
          <span className="text-xs md:text-sm text-green-400 font-medium">
            {balance.toLocaleString('cs-CZ')} Kč
          </span>
        </div>
        <ChevronDown 
          size={14} 
          className={`text-gray-300 transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`}
        />
      </motion.button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[998]"
            onClick={() => setShowDropdown(false)}
          />

          {/* Dropdown Content */}
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed w-56 bg-gray-900/60 backdrop-blur-2xl rounded-xl border border-purple-500/20 shadow-[0_8px_32px_rgba(124,58,237,0.25)] z-[999] overflow-hidden"
            style={{
              top: `${dropdownPosition.top}px`,
              right: `${dropdownPosition.right}px`,
              background: 'linear-gradient(135deg, rgba(17,24,39,0.95) 0%, rgba(31,41,55,0.95) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
            }}
          >
            {/* User Info Header */}
            <div className="p-3 border-b border-white/5">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <motion.img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="w-9 h-9 rounded-lg border border-purple-500/30"
                    whileHover={{ scale: 1.05 }}
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-gray-900"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white text-xs flex items-center gap-1 truncate">
                    {user.displayName}
                    {isOwner && (
                      <span className="px-1 py-0.5 text-[9px] bg-gradient-to-r from-yellow-400 to-orange-500 rounded text-black font-bold">
                        VIP
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400 flex items-center gap-1">
                    <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                    Online
                  </div>
                  <div className="text-[9px] text-gray-500 mt-0.5 bg-gray-800/60 backdrop-blur-sm rounded px-1.5 py-0.5 inline-block">
                    UID: {user.id?.slice(0, 8)}...
                  </div>
                </div>
              </div>
            </div>

            {/* Balance Display */}
            <div className="px-3 py-2 border-b border-white/5 bg-gradient-to-r from-purple-500/5 to-transparent">
              <div className="text-[9px] text-gray-400 mb-0.5">Balance</div>
              <div className="text-base font-bold text-white">
                {balance.toLocaleString('cs-CZ')} <span className="text-[10px] text-gray-400">Kč</span>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <motion.div whileHover={{ x: 2 }} transition={{ duration: 0.2 }}>
                <Link
                  to="/profile"
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200 group"
                >
                  <div className="w-7 h-7 rounded-lg bg-gray-700/50 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                    <User size={14} className="text-gray-400 group-hover:text-purple-400 transition-colors" />
                  </div>
                  <span className="font-medium text-xs">Profile</span>
                </Link>
              </motion.div>

              <motion.div whileHover={{ x: 2 }} transition={{ duration: 0.2 }}>
                <Link
                  to="/profile?tab=orders"
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200 group"
                >
                  <div className="w-7 h-7 rounded-lg bg-gray-700/50 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                    <ShoppingBag size={14} className="text-gray-400 group-hover:text-orange-400 transition-colors" />
                  </div>
                  <span className="font-medium text-xs">Orders</span>
                </Link>
              </motion.div>

              <motion.div whileHover={{ x: 2 }} transition={{ duration: 0.2 }}>
                <Link
                  to="/profile?tab=shop"
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200 group"
                >
                  <div className="w-7 h-7 rounded-lg bg-gray-700/50 flex items-center justify-center group-hover:bg-yellow-500/20 transition-colors">
                    <Store size={14} className="text-gray-400 group-hover:text-yellow-400 transition-colors" />
                  </div>
                  <span className="font-medium text-xs">My Shop</span>
                </Link>
              </motion.div>

              {/* Admin Panel (Owner Only) */}
              {isOwner && (
                <motion.div whileHover={{ x: 2 }} transition={{ duration: 0.2 }}>
                  <Link
                    to="/admin"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200 group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gray-700/50 flex items-center justify-center group-hover:bg-yellow-500/20 transition-colors">
                      <Shield size={14} className="text-gray-400 group-hover:text-yellow-400 transition-colors" />
                    </div>
                    <span className="font-medium text-xs">Admin Panel</span>
                  </Link>
                </motion.div>
              )}

              {/* Language Switcher */}
              <div className="relative">
                <motion.div whileHover={{ x: 2 }} transition={{ duration: 0.2 }}>
                  <button
                    onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200 group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gray-700/50 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                      <Globe size={14} className="text-gray-400 group-hover:text-purple-400 transition-colors" />
                    </div>
                    <span className="font-medium text-xs flex items-center gap-1">
                      <span>{languages.find(l => l.code === currentLanguage?.code)?.flag}</span>
                      <span>{languages.find(l => l.code === currentLanguage?.code)?.name}</span>
                    </span>
                  </button>
                </motion.div>

                {showLanguageMenu && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="absolute right-full mr-2 bottom-0 w-44 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden"
                  >
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setShowLanguageMenu(false);
                          setShowDropdown(false);
                          // Skip if already on this language
                          if (currentLanguage?.code === lang.code) {
                            return;
                          }
                          // Update language immediately
                          setLanguageByCode(lang.code.toLowerCase());
                          // Update URL without reload
                          let currentPath = removeLanguagePrefix(location.pathname);
                          if (currentPath === '/') currentPath = '';
                          const newPath = `/${lang.code.toLowerCase()}${currentPath}`;
                          navigate(newPath, { replace: true });
                          addToast({
                            type: 'success',
                            title: 'Language Changed',
                            message: `Switched to ${lang.name}`,
                            duration: 2000
                          });
                        }}
                        className={`w-full px-3 py-2.5 text-left flex items-center space-x-2 hover:bg-gray-700/50 transition-colors ${
                          currentLanguage?.code === lang.code ? 'bg-purple-600/20 text-purple-400' : 'text-gray-300'
                        }`}
                      >
                        <span className="text-base">{lang.flag}</span>
                        <span className="text-xs font-medium">{lang.name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Logout Button */}
            <div className="p-2 border-t border-white/5">
              <motion.button
                onClick={() => {
                  logout();
                  setShowDropdown(false);
                }}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="w-full flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-red-400 hover:bg-white/5 transition-all duration-200 group"
              >
                <div className="w-7 h-7 rounded-lg bg-gray-700/50 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                  <LogOut size={14} className="text-gray-400 group-hover:text-red-400 transition-colors" />
                </div>
                <span className="font-medium text-xs">Logout</span>
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default UserProfile;