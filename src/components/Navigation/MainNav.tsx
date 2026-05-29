import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  Heart,
  Search,
  Users,
  Gift,
  Trophy,
  Home,
  Wallet
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { Flipper, Flipped } from 'react-flip-toolkit';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { useTranslationStore } from '../../store/translationStore';
import SteamLogin from '../auth/SteamLogin';
import UserProfile from '../auth/UserProfile';
import NotificationDropdown from '../ui/NotificationDropdown';

interface MainNavProps {
  onSearchOpen?: () => void;
}

export function MainNav({ onSearchOpen }: MainNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { cartCount } = useCartStore();
  const { addToast } = useToastStore();
  const { t } = useTranslationStore();

  const [activeSection, setActiveSection] = useState('market');
  const [hoveredNavItem, setHoveredNavItem] = useState<string | null>(null);

  const navigationItems = useMemo(() => [
    {
      key: 'market',
      name: t('nav.market'),
      href: '/',
      icon: ShoppingCart,
      onClick: () => {
        setActiveSection('market');
        navigate('/');
      }
    },
    {
      key: 'deposit',
      name: t('deposit'),
      href: '/profile?tab=balance',
      icon: Wallet,
      onClick: () => {
        setActiveSection('deposit');
        navigate('/profile?tab=balance');
      }
    },
    {
      key: 'referral',
      name: t('nav.referral'),
      href: '/referral',
      icon: Users,
      onClick: () => {
        setActiveSection('referral');
        navigate('/referral');
      }
    },
    {
      key: 'search',
      name: t('nav.search'),
      href: '#',
      icon: Search,
      onClick: () => {
        setActiveSection('search');
        if (onSearchOpen) onSearchOpen();
      }
    },
    {
      key: 'affiliate',
      name: t('nav.affiliate'),
      href: '/affiliate',
      icon: Gift,
      onClick: () => {
        setActiveSection('affiliate');
        addToast({
          type: 'info',
          title: 'Coming Soon',
          message: 'Affiliate program coming soon!',
          duration: 3000
        });
      }
    },
    {
      key: 'claims',
      name: t('nav.claims'),
      href: '/claims',
      icon: Trophy,
      onClick: () => {
        setActiveSection('claims');
        addToast({
          type: 'info',
          title: 'Coming Soon',
          message: 'Claims system coming soon!',
          duration: 3000
        });
      }
    }
  ], [t, navigate, addToast, onSearchOpen]);

  return (
    <motion.header className="fixed top-12 left-16 right-0 bg-gray-800 border-b border-gray-700/50 p-4 z-30 shadow-lg">
      <div className="flex items-center relative">
        {/* Center Navigation */}
        <div className="flex justify-center w-full" style={{ marginLeft: '-35px' }}>
          <Flipper flipKey={`${activeSection}-${hoveredNavItem}`}>
            <motion.nav
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <div
                className="flex justify-center space-x-1 bg-gray-900 px-6 py-3 border border-purple-500/40 shadow-2xl rounded-lg"
                style={{
                  boxShadow: '0 0 30px rgba(168, 85, 247, 0.4), 0 8px 32px rgba(0, 0, 0, 0.3)',
                  background: 'linear-gradient(145deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.9))'
                }}
              >
                {navigationItems.map((item) => (
                  <Flipped key={item.key} flipId={`header-nav-${item.key}`}>
                    <motion.button
                      onClick={item.onClick}
                      onMouseEnter={() => setHoveredNavItem(item.key)}
                      onMouseLeave={() => setHoveredNavItem(null)}
                      whileHover={{
                        scale: 1.05,
                        filter: 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.9))'
                      }}
                      whileTap={{ scale: 0.95 }}
                      className={`flex justify-center relative px-4 py-2 text-sm font-medium transition-all duration-300 flex items-center space-x-2 rounded-lg ${
                        activeSection === item.key
                          ? 'text-white bg-purple-600'
                          : hoveredNavItem === item.key
                            ? 'text-purple-200 bg-purple-500/30'
                            : 'text-gray-300 hover:text-white hover:bg-purple-500/20'
                      }`}
                      style={activeSection === item.key ? {
                        boxShadow: '0 0 25px rgba(168, 85, 247, 0.7), 0 4px 20px rgba(147, 51, 234, 0.5)',
                        background: 'linear-gradient(145deg, #9333EA, #A855F7)'
                      } : hoveredNavItem === item.key ? {
                        boxShadow: '0 0 15px rgba(168, 85, 247, 0.5)',
                        background: 'linear-gradient(145deg, rgba(147, 51, 234, 0.3), rgba(168, 85, 247, 0.3))'
                      } : {}}
                    >
                      <motion.div
                        animate={{
                          scale: activeSection === item.key || hoveredNavItem === item.key ? 1.1 : 1,
                          color: activeSection === item.key ? '#E879F9' : hoveredNavItem === item.key ? '#D8B4FE' : '#9CA3AF'
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        <item.icon size={16} />
                      </motion.div>
                      <span>{item.name}</span>

                      {(activeSection === item.key || hoveredNavItem === item.key) && (
                        <Flipped flipId="header-nav-glow">
                          <motion.div
                            layoutId="headerNavActiveIndicator"
                            className="absolute inset-0 bg-gradient-to-r from-purple-600/50 via-purple-500/70 to-purple-600/50 -z-10 rounded-lg"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{
                              type: "spring",
                              stiffness: 400,
                              damping: 30,
                              duration: 0.3
                            }}
                          />
                        </Flipped>
                      )}
                    </motion.button>
                  </Flipped>
                ))}
              </div>
            </motion.nav>
          </Flipper>
        </div>

        {/* Right Side - Positioned Absolutely */}
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
          {/* Wishlist Button */}
          <motion.button
            onClick={() => navigate('/profile?tab=wishlist')}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 text-gray-300 hover:text-purple-400 transition-colors relative"
            aria-label="Wishlist"
          >
            <Heart size={20} />
          </motion.button>

          {/* Cart Button */}
          <motion.button
            onClick={() => navigate('/cart')}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 text-gray-300 hover:text-purple-400 transition-colors relative"
            aria-label="Shopping Cart"
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </motion.button>

          {/* Notification Dropdown */}
          <NotificationDropdown />

          {/* Sign In / User Profile */}
          <div className="ml-2">
            {user ? <UserProfile /> : <SteamLogin />}
          </div>
        </div>
      </div>
    </motion.header>
  );
}
