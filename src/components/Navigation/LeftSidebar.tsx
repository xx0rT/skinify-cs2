import { motion } from 'framer-motion';
import {
  Home,
  User,
  Star,
  TrendingUp,
  CreditCard,
  Wallet,
  Users,
  Crown,
  MessageSquare,
  Settings
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useTranslationStore } from '../../store/translationStore';
import { useToastStore } from '../../store/toastStore';

interface SidebarSection {
  name: string;
  items: {
    icon: any;
    label: string;
    active: boolean;
    onClick: () => void;
  }[];
}

export function LeftSidebar() {
  const navigate = useNavigate();
  const { t } = useTranslationStore();
  const { addToast } = useToastStore();

  const sidebarSections: SidebarSection[] = useMemo(() => [
    {
      name: t('sidebar.navigation'),
      items: [
        { icon: Home, label: t('nav.home'), active: true, onClick: () => navigate('/') },
        { icon: User, label: t('nav.profile'), active: false, onClick: () => navigate('/profile') }
      ]
    },
    {
      name: t('sidebar.trading'),
      items: [
        {
          icon: Star,
          label: t('nav.rewards'),
          active: false,
          onClick: () => addToast({ type: 'info', title: 'Coming Soon', message: 'Rewards system is coming soon!' })
        },
        { icon: TrendingUp, label: t('nav.stats'), active: false, onClick: () => navigate('/profile?tab=overview') }
      ]
    },
    {
      name: t('sidebar.wallet'),
      items: [
        { icon: CreditCard, label: t('deposit'), active: false, onClick: () => navigate('/profile?tab=balance') },
        { icon: Wallet, label: t('withdraw'), active: false, onClick: () => navigate('/profile?tab=balance') }
      ]
    },
    {
      name: t('sidebar.features'),
      items: [
        { icon: Users, label: t('nav.referral'), active: false, onClick: () => navigate('/referral') },
        { icon: Crown, label: t('nav.vip'), active: false, onClick: () => navigate('/vip') },
        { icon: MessageSquare, label: t('nav.support'), active: false, onClick: () => navigate('/tickets') },
        { icon: Settings, label: t('nav.settings'), active: false, onClick: () => navigate('/profile?tab=settings') }
      ]
    }
  ], [t, navigate, addToast]);

  return (
    <motion.div
      className="group fixed left-0 top-12 bottom-0 z-40 w-16 hover:w-64 bg-gray-800 backdrop-blur-md border-r-0 flex flex-col transition-all duration-300 ease-in-out py-4 shadow-xl"
    >
      {/* Logo */}
      <div className="h-12 flex items-center justify-center mb-4 mx-auto group-hover:mx-3 overflow-hidden">
        <div className="relative flex items-center">
          <motion.img
            src="/favicon.png"
            alt="Skinify Logo"
            className="h-12 w-auto object-contain cursor-pointer"
            onClick={() => navigate('/')}
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />

          <div className="hidden group-hover:block">
            <motion.img
              src="/logo-alt.png"
              alt="Skinify Logo Extended"
              className="h-12 w-auto object-contain cursor-pointer"
              onClick={() => navigate('/')}
              initial={{ opacity: 0, x: -20, scale: 0.8 }}
              animate={{
                opacity: 1,
                x: 0,
                scale: 1,
                transition: {
                  delay: 0.15,
                  duration: 0.4,
                  type: "spring",
                  stiffness: 200,
                  damping: 20
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Sidebar Items */}
      <div className="flex flex-col space-y-1 flex-1 px-2 group-hover:px-3">
        {sidebarSections.map((section, sectionIndex) => (
          <div key={section.name} className="relative">
            {sectionIndex > 0 && (
              <div className="h-px bg-gradient-to-r from-transparent via-gray-600/30 to-transparent my-2 mx-2" />
            )}

            <div className="hidden group-hover:block mb-2">
              <div className="text-xs text-purple-400 font-medium px-3 mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-200">
                {section.name}
              </div>
            </div>

            {section.items.map((item, itemIndex) => (
              <motion.button
                key={itemIndex}
                onClick={item.onClick}
                whileHover={{
                  scale: 1.02,
                  filter: 'drop-shadow(0 0 15px rgba(168, 85, 247, 0.8))'
                }}
                whileTap={{ scale: 0.98 }}
                className={`relative flex items-center p-3 rounded-lg transition-all duration-300 overflow-hidden group/item w-full mb-1 ${
                  item.active
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
                style={item.active ? {
                  boxShadow: '0 0 20px rgba(168, 85, 247, 0.6), 0 4px 15px rgba(147, 51, 234, 0.4)',
                  background: 'linear-gradient(135deg, #9333EA 0%, #A855F7 100%)'
                } : {}}
              >
                <motion.div
                  className="flex-shrink-0 relative z-10"
                  animate={{
                    scale: item.active ? 1.1 : 1,
                    color: item.active ? '#E879F9' : '#9CA3AF'
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <item.icon size={20} />
                </motion.div>

                <motion.span
                  className="ml-3 text-sm font-medium whitespace-nowrap overflow-hidden opacity-0 group-hover:opacity-100 relative z-10"
                  initial={{ x: -10 }}
                  animate={{
                    x: 0,
                    transition: {
                      delay: 0.1,
                      duration: 0.3
                    }
                  }}
                >
                  {item.label}
                </motion.span>

                {item.active && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    className="absolute inset-0 bg-gradient-to-r from-purple-600/30 via-purple-500/50 to-purple-600/30 rounded-lg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                )}

                <motion.div
                  className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg opacity-0 group-hover/item:opacity-20 blur transition-all duration-300"
                  style={{
                    filter: 'blur(8px)'
                  }}
                />
              </motion.button>
            ))}
          </div>
        ))}
      </div>

      {/* Bottom Section - Optional */}
      <div className="px-2 group-hover:px-3 mt-auto pt-4 pb-2 border-t border-gray-700/30">
        <motion.button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigate('/changelog');
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full text-center text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-200 hover:text-purple-400 cursor-pointer relative z-50"
          type="button"
        >
          <div className="font-semibold text-purple-400 mb-1 pointer-events-none">Skinify.gg</div>
          <div className="hover:text-purple-300 transition-colors pointer-events-none">v1.0.0</div>
        </motion.button>
      </div>
    </motion.div>
  );
}
