import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  User,
  Settings,
  CreditCard,
  Wallet,
  Gift,
  Crown,
  Star,
  TrendingUp,
  ShoppingCart,
  Trophy,
  Search,
  Plus,
  Users,
  Heart,
  Sun,
  Moon,
  Twitch,
  Bell,
  ArrowLeftRight,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useCartStore } from '../store/cartStore';
import { useThemeStore } from '../store/themeStore';
import { useTranslationStore, removeLanguagePrefix } from '../store/translationStore';
import SteamLogin from './auth/SteamLogin';
import UserProfile from './auth/UserProfile';
import NotificationDropdown from './ui/NotificationDropdown';
import { supabase } from '../lib/supabaseClient';

interface HeaderProps {
  activeSection?: string;
  setActiveSection?: (section: string) => void;
  hideRefill?: boolean;
  hideLanguage?: boolean;
  hideTheme?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  activeSection = 'Market',
  setActiveSection,
  hideRefill = false,
  hideLanguage = false,
  hideTheme = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const { getItemCount } = useCartStore();
  const { theme, toggleTheme } = useThemeStore();
  const { t, currentLanguage, translations, setLanguageByCode } = useTranslationStore();

  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [twitchAccount, setTwitchAccount] = useState<any>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(0);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const langRef = useRef<HTMLDivElement | null>(null);

  const cartCount = getItemCount();

  useEffect(() => {
    if (user?.steamId) loadTwitchAccount();
  }, [user?.steamId]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setShowLanguageDropdown(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const loadTwitchAccount = async () => {
    try {
      const { data: twitchData } = await supabase
        .from('user_twitch_accounts')
        .select('*')
        .eq('steam_id', user?.steamId)
        .maybeSingle();

      if (twitchData) {
        setTwitchAccount(twitchData);
        const { data: walletData } = await supabase
          .from('loyalty_points_wallets')
          .select('*')
          .eq('twitch_account_id', twitchData.id)
          .maybeSingle();
        if (walletData) setLoyaltyPoints(Number(walletData.points_balance) || 0);
      }
    } catch (err) {
      console.error('Failed to load Twitch account:', err);
    }
  };

  const railSections = useMemo(
    () => [
      {
        items: [
          { icon: Home, label: t('nav.market') || 'Market', key: 'market', onClick: () => { navigate('/'); setActiveSection?.('Market'); } },
          { icon: BarChart3, label: 'Inventory', key: 'inventory', onClick: () => navigate('/profile?tab=inventory') },
          { icon: ArrowLeftRight, label: 'Trades', key: 'trades', onClick: () => navigate('/profile?tab=trades') },
          { icon: Sparkles, label: 'Showcase', key: 'showcase', onClick: () => navigate('/profile?tab=showcase') },
          { icon: TrendingUp, label: 'Analytics', key: 'analytics', onClick: () => navigate('/profile?tab=overview') },
        ],
      },
      {
        items: [
          { icon: Star, label: t('nav.rewards') || 'Rewards', key: 'rewards', onClick: () => navigate('/rewards') },
          { icon: Gift, label: 'Bonuses', key: 'bonuses', onClick: () => navigate('/bonuses') },
          { icon: Crown, label: t('nav.vip') || 'VIP', key: 'vip', onClick: () => navigate('/vip') },
          { icon: Users, label: 'Referral', key: 'referral', onClick: () => navigate('/referral') },
        ],
      },
      {
        items: [
          { icon: User, label: t('nav.profile') || 'Profile', key: 'profile', onClick: () => navigate('/profile') },
          { icon: Settings, label: t('settings') || 'Settings', key: 'settings', onClick: () => navigate('/profile?tab=settings') },
        ],
      },
    ],
    [translations, navigate, setActiveSection],
  );

  const topNav = useMemo(
    () => [
      { name: t('nav.market') || 'Market', href: '/', onClick: () => { setActiveSection?.('Market'); navigate('/'); } },
      { name: 'Sell', href: '/profile?tab=inventory', onClick: () => { setActiveSection?.('Sell'); navigate('/profile?tab=inventory'); } },
      { name: 'Trade', href: '/profile?tab=trades', onClick: () => { setActiveSection?.('Trade'); navigate('/profile?tab=trades'); } },
      { name: 'Bonuses', href: '/bonuses', onClick: () => { setActiveSection?.('Bonuses'); navigate('/bonuses'); } },
      { name: t('nav.faq') || 'FAQ', href: '/faq', onClick: () => { setActiveSection?.('FAQ'); navigate('/faq'); } },
    ],
    [translations, navigate, setActiveSection],
  );

  const languages = [
    { code: 'en', flag: '🇬🇧', name: 'English' },
    { code: 'cs', flag: '🇨🇿', name: 'Čeština' },
    { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
    { code: 'ru', flag: '🇷🇺', name: 'Русский' },
  ];

  const changeLanguage = (code: string, name: string) => {
    setShowLanguageDropdown(false);
    if (currentLanguage?.code === code) return;
    setLanguageByCode(code.toLowerCase());
    let currentPath = removeLanguagePrefix(location.pathname);
    if (currentPath === '/') currentPath = '';
    navigate(`/${code.toLowerCase()}${currentPath}`, { replace: true });
    addToast({ type: 'success', title: 'Language Changed', message: `Switched to ${name}`, duration: 2000 });
  };

  const railActiveKey = (() => {
    const p = location.pathname;
    if (p === '/' || /^\/[a-z]{2}\/?$/.test(p)) return 'market';
    if (p.includes('inventory')) return 'inventory';
    if (p.includes('trades')) return 'trades';
    if (p.includes('rewards')) return 'rewards';
    if (p.includes('bonuses')) return 'bonuses';
    if (p.includes('vip')) return 'vip';
    if (p.includes('referral')) return 'referral';
    if (p.includes('settings')) return 'settings';
    if (p.includes('profile')) return 'profile';
    return '';
  })();

  return (
    <>
      {/* ===== LEFT RAIL (fixed-width, icon-only with tooltips) =====
          Visually joined to the top navbar — top-right corner squared so it
          meets the navbar's bottom-left corner cleanly, forming one L-shape
          of glass. Outer corners (top-left, bottom-left, bottom-right) stay
          rounded; inner-joint corner is square. */}
      <aside className="fixed left-4 top-4 bottom-4 z-40 hidden md:flex flex-col w-[68px] glass rounded-3xl rounded-tr-none">
        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          aria-label="Home"
          data-tooltip="Home"
          className="tip-r h-16 grid place-items-center shrink-0"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-700 grid place-items-center shadow-accent-glow">
            <img
              src="/favicon.png"
              alt=""
              className="w-7 h-7 object-contain"
            />
          </div>
        </button>

        {/* Nav sections */}
        <nav className="flex-1 px-2.5 pb-3 overflow-y-auto scrollbar-hide">
          {railSections.map((section, sIdx) => (
            <div key={sIdx} className="py-2">
              {sIdx > 0 && <div className="h-px bg-white/[0.06] mx-2 mb-3" />}
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = railActiveKey === item.key;
                  return (
                    <li key={item.key}>
                      <button
                        onClick={item.onClick}
                        aria-label={item.label}
                        data-tooltip={item.label}
                        className={`tip-r relative w-full h-11 rounded-2xl grid place-items-center transition-colors duration-200 ${
                          active
                            ? 'bg-white/[0.07] text-white'
                            : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                        }`}
                      >
                        {active && (
                          <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-accent-500" />
                        )}
                        <Icon size={20} strokeWidth={2} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Twitch loyalty (compact icon-only when present) */}
        {twitchAccount && (
          <div className="px-2.5 pb-2">
            <button
              onClick={() => setShowDepositModal(true)}
              aria-label={`Deposit · ${loyaltyPoints.toLocaleString()} pts`}
              data-tooltip={`Twitch · ${loyaltyPoints.toLocaleString()} pts`}
              className="tip-r relative w-full h-11 rounded-2xl grid place-items-center bg-gradient-to-br from-purple-500/15 to-fuchsia-500/5 border border-purple-400/20 hover:border-purple-400/40 transition-colors"
            >
              <img
                src={twitchAccount.twitch_profile_image}
                alt=""
                className="w-7 h-7 rounded-full border border-white/10"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-purple-500 grid place-items-center border-2 border-ink-900">
                <Twitch className="w-2 h-2 text-white" />
              </span>
            </button>
          </div>
        )}

        {/* Language at bottom */}
        {!hideLanguage && (
          <div className="px-2.5 pb-3 relative" ref={langRef}>
            <button
              onClick={() => setShowLanguageDropdown((v) => !v)}
              aria-label="Change language"
              data-tooltip={languages.find((l) => l.code === currentLanguage?.code)?.name || 'Language'}
              className="tip-r w-full h-11 rounded-2xl grid place-items-center text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              <span className="text-xl leading-none">
                {languages.find((l) => l.code === currentLanguage?.code)?.flag || '🌐'}
              </span>
            </button>
            <AnimatePresence>
              {showLanguageDropdown && (
                <motion.div
                  initial={{ opacity: 0, x: -8, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -8, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  className="absolute left-full ml-3 bottom-3 w-52 glass-strong rounded-2xl overflow-hidden p-1.5"
                >
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code, lang.name)}
                      className={`w-full h-10 px-3 rounded-xl flex items-center gap-3 transition-colors ${
                        currentLanguage?.code === lang.code
                          ? 'bg-accent-500/15 text-accent-300'
                          : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <span className="text-base">{lang.flag}</span>
                      <span className="text-[13px] font-medium">{lang.name}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </aside>

      {/* ===== TOP FLOATING NAV =====
          3-column grid: [left links + mobile logo] [centered search] [actions]
          The center cell is `1fr` so search stays visually centered regardless
          of how wide the side cells get; we cap the search width inside.
          On md+ the navbar starts flush against the left rail (left:72px = 4
          padding + 68 rail width) and has its bottom-left corner squared so
          the two glass surfaces meet as one continuous L-shape. */}
      <header className="fixed top-4 right-4 z-30 md:left-[72px] left-4">
        <div className="glass rounded-3xl md:rounded-bl-none md:border-l-0 h-16 px-3 grid items-center gap-2 grid-cols-[auto_1fr_auto]">
          {/* LEFT: mobile logo + page nav links */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('/')}
              className="md:hidden w-10 h-10 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-700 grid place-items-center shrink-0"
              aria-label="Home"
            >
              <img
                src="/favicon.png"
                alt=""
                className="w-6 h-6"
              />
            </button>

            <nav className="hidden lg:flex items-center gap-1 pl-2">
              {topNav.map((item) => {
                const active = activeSection === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={item.onClick}
                    className={`h-10 px-3.5 rounded-2xl text-[13.5px] font-medium transition-colors ${
                      active
                        ? 'bg-white/[0.08] text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    {item.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* CENTER: search pill — capped width, justified to center of its cell */}
          <div className="flex justify-center min-w-0">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-full max-w-[460px] min-w-0 h-11 px-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] flex items-center gap-3 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <Search size={18} strokeWidth={2.25} className="shrink-0" />
              <span className="text-[14px] font-medium truncate">
                Search skins, collections, weapons…
              </span>
              <kbd className="ml-auto hidden lg:inline-flex items-center gap-1 text-[11px] text-zinc-500 font-medium px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] shrink-0">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* RIGHT: actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!hideRefill && (
              <button
                onClick={() => navigate('/profile?tab=balance')}
                className="h-11 px-4 rounded-2xl bg-accent-500 hover:bg-accent-400 text-white text-[13.5px] font-semibold flex items-center gap-1.5 shadow-accent-glow transition-colors"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span className="hidden sm:inline">Refill</span>
              </button>
            )}

            <button
              onClick={() => {
                if (!user) {
                  addToast({
                    type: 'warning',
                    title: 'Login Required',
                    message: 'Please log in to view your wishlist',
                  });
                  return;
                }
                navigate('/profile?tab=inventory');
              }}
              aria-label="Wishlist"
              data-tooltip="Wishlist"
              className="tip-b w-11 h-11 rounded-2xl grid place-items-center text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <Heart size={18} strokeWidth={2} />
            </button>

            <button
              onClick={() => navigate('/cart')}
              aria-label="Cart"
              data-tooltip="Cart"
              className="tip-b relative w-11 h-11 rounded-2xl grid place-items-center text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <ShoppingCart size={18} strokeWidth={2} />
              {cartCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent-500 grid place-items-center text-[10px] font-bold text-white">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>

            <div className="w-11 h-11 rounded-2xl grid place-items-center text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors">
              <NotificationDropdown />
            </div>

            {!hideTheme && (
              <button
                onClick={() => {
                  toggleTheme();
                  addToast({
                    type: 'info',
                    title: 'Theme Changed',
                    message: `Switched to ${theme === 'dark' ? 'light' : 'dark'} mode`,
                    duration: 2000,
                  });
                }}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                data-tooltip={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                className="tip-b w-11 h-11 rounded-2xl grid place-items-center text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors hidden sm:grid"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            )}

            <div className="pl-1">{user ? <UserProfile /> : <SteamLogin />}</div>
          </div>
        </div>
      </header>

      {/* ===== Search modal (lightweight) ===== */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md grid place-items-start pt-32 px-4"
            onClick={() => setSearchOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl glass-strong rounded-3xl overflow-hidden"
            >
              <div className="flex items-center gap-3 px-5 h-16 border-b border-white/[0.06]">
                <Search size={20} className="text-zinc-400" />
                <input
                  autoFocus
                  placeholder="Search skins, collections, weapons…"
                  className="flex-1 bg-transparent outline-none text-white placeholder-zinc-500 text-[15px]"
                />
                <kbd className="text-[11px] text-zinc-500 font-medium px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06]">
                  ESC
                </kbd>
              </div>
              <div className="px-5 py-6 text-sm text-zinc-500">
                Start typing to search the marketplace.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Deposit modal ===== */}
      <AnimatePresence>
        {showDepositModal && twitchAccount && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md grid place-items-center z-50 p-4"
            onClick={() => setShowDepositModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong rounded-3xl p-7 max-w-md w-full"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/15 grid place-items-center">
                  <Wallet className="w-6 h-6 text-purple-300" />
                </div>
                <div>
                  <h3 className="text-[18px] font-display font-semibold text-white tracking-tight">
                    Deposit Loyalty Points
                  </h3>
                  <p className="text-[13px] text-zinc-400">Convert Twitch points to balance</p>
                </div>
              </div>

              <div className="rounded-2xl p-4 bg-white/[0.04] border border-white/[0.06] mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-400 text-[13px]">Available</span>
                  <span className="text-2xl font-display font-bold text-white tracking-tight">
                    {loyaltyPoints.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[12px] text-zinc-500">
                  <span>Rate</span>
                  <span>100 pts = 1 Kč</span>
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-[12px] uppercase tracking-wide text-zinc-500 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  placeholder="0"
                  max={loyaltyPoints}
                  className="w-full h-12 px-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-600 outline-none focus:border-accent-500/60 focus:ring-2 focus:ring-accent-500/20 transition-all"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="flex-1 h-12 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] text-white text-[14px] font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    addToast({
                      type: 'success',
                      title: 'Deposit Successful',
                      message: 'Your loyalty points have been converted to balance!',
                    });
                    setShowDepositModal(false);
                  }}
                  className="flex-1 h-12 rounded-2xl bg-accent-500 hover:bg-accent-400 text-white text-[14px] font-semibold shadow-accent-glow transition-colors"
                >
                  Deposit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default React.memo(Header);
