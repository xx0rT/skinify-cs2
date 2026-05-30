import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useMobileDetection } from './hooks/useMobileDetection';
import { useSaleNotifications } from './hooks/useSaleNotifications';
import { useCurrencyStore } from './store/currencyStore';
import { useTranslationStore } from './store/translationStore';
import { autoDetectAndSetCurrency } from './utils/geolocation';
import { memoryOptimizer } from './utils/memoryOptimizer';
import ToastContainer from './components/ui/ToastContainer';
import ScrollToTop from './components/ScrollToTop';
import AgeVerificationModal from './components/AgeVerificationModal';
import SearchPalette from './components/SearchPalette';
import DepositModal from './components/DepositModal';
import { ThemeProvider } from './theme/ThemeProvider';

// Critical pages - loaded immediately
import LandingPage from './pages/LandingPage';
import MobileLandingPage from './pages/MobileLandingPage';
import AuthCallback from './pages/AuthCallback';
import LanguageDetector from './components/LanguageDetector';

// Lazy load less critical pages
const MobileProfilePage = lazy(() => import('./pages/MobileProfilePage'));
const MobileItemDetailPage = lazy(() => import('./pages/MobileItemDetailPage'));
const MobileOrderDetailPage = lazy(() => import('./pages/MobileOrderDetailPage'));
const MobileCartPage = lazy(() => import('./components/MobileCartPage'));
const MobileRewardsPage = lazy(() => import('./components/MobileRewardsPage'));
const MobileWeaponCategoryPage = lazy(() => import('./pages/MobileWeaponCategoryPage'));
const MobileUserShopPage = lazy(() => import('./pages/MobileUserShopPage'));
const MobileMarketplacePage = lazy(() => import('./pages/MobileMarketplacePage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const SupportTicketsPage = lazy(() => import('./pages/SupportTicketsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const TradingGuidePage = lazy(() => import('./pages/TradingGuidePage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const SecurityTipsPage = lazy(() => import('./pages/SecurityTipsPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AdminPanelNew = lazy(() => import('./pages/AdminPanelNew'));
const ItemDetailPage = lazy(() => import('./pages/ItemDetailPage'));
const WeaponCategoryPage = lazy(() => import('./pages/WeaponCategoryPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const MarketplacePage = lazy(() => import('./pages/MarketplacePage'));
const BonusesPage = lazy(() => import('./pages/BonusesPage'));
const VipPage = lazy(() => import('./pages/VipPage'));
const RewardsPage = lazy(() => import('./pages/RewardsPage'));
const ReferralPage = lazy(() => import('./pages/ReferralPage'));
const RefundPolicyPage = lazy(() => import('./pages/RefundPolicyPage'));
const DisputeResolutionPage = lazy(() => import('./pages/DisputeResolutionPage'));
const UserShopPage = lazy(() => import('./pages/UserShopPage'));
const CSSPresetsPage = lazy(() => import('./pages/CSSPresetsPage'));
const DeveloperDocsPage = lazy(() => import('./pages/DeveloperDocsPage'));
const ChangelogPage = lazy(() => import('./pages/ChangelogPage'));
const BlogDetailPage = lazy(() => import('./pages/BlogDetailPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// All supported language codes for routing
const LANG_PATTERN = "en|es|cs|de|ru|fr|it|pt|pl|tr|ar|zh|ja|ko|nl|sv|no|da|fi|hu|ro|uk|el|th|vi|id|hi";

export default function App() {
  const { isMobile, isTablet, screenWidth } = useMobileDetection();
  const { setAutoDetectedCurrency, isAutoDetected } = useCurrencyStore();

  useSaleNotifications();

  useEffect(() => {
    if (!isAutoDetected) {
      autoDetectAndSetCurrency()
        .then((data) => {
          if (data) {
            setAutoDetectedCurrency(data.currency);
            // Save to user preferences if logged in
            if (data.countryCode) {
              import('./lib/supabaseClient').then(({ supabase }) => {
                supabase.auth.getUser().then(({ data: { user } }) => {
                  if (user) {
                    supabase.from('users').update({
                      detected_country: data.countryCode,
                      preferred_currency: data.currency.code
                    }).eq('id', user.id);
                  }
                });
              });
            }
          }
        })
        .catch(() => {});
    }
  }, [isAutoDetected, setAutoDetectedCurrency]);

  useEffect(() => {
    const cleanupInterval = memoryOptimizer.schedulePeriodicCleanup(10 * 60 * 1000);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        memoryOptimizer.cleanup();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(cleanupInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const forceMobile = screenWidth <= 768;

  // Lightweight skeleton fallback for route-level Suspense — keeps the layout
  // calm while a lazy chunk arrives. No spinner, no full-screen loader.
  const LoadingFallback = () => (
    <div className="min-h-screen px-4 pt-24 pb-16 max-w-[1480px] mx-auto md:pl-[100px]">
      <div className="rounded-3xl h-[340px] mb-6 skeleton" />
      <div className="rounded-3xl h-[180px] mb-6 skeleton" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-3xl aspect-[3/4] skeleton" />
        ))}
      </div>
    </div>
  );

  return (
    <ThemeProvider>
      <BrowserRouter>
        <LanguageDetector />
        <ScrollToTop />
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Main routes - always use mobile version for small screens */}
            <Route path="/" element={forceMobile ? <MobileLandingPage /> : <LandingPage />} />
            <Route path={`/:lang(${LANG_PATTERN})`} element={forceMobile ? <MobileLandingPage /> : <LandingPage />} />

            <Route path="/profile" element={forceMobile ? <MobileProfilePage /> : <ProfilePage />} />
            <Route path={`/:lang(${LANG_PATTERN})/profile`} element={forceMobile ? <MobileProfilePage /> : <ProfilePage />} />

            <Route path="/cart" element={forceMobile ? <MobileCartPage /> : <CartPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/cart`} element={forceMobile ? <MobileCartPage /> : <CartPage />} />

            <Route path="/rewards" element={forceMobile ? <MobileRewardsPage /> : <RewardsPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/rewards`} element={forceMobile ? <MobileRewardsPage /> : <RewardsPage />} />

            <Route path="/item/:itemId" element={forceMobile ? <MobileItemDetailPage /> : <ItemDetailPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/item/:itemId`} element={forceMobile ? <MobileItemDetailPage /> : <ItemDetailPage />} />

            <Route path="/order/:orderId" element={forceMobile ? <MobileOrderDetailPage /> : <ItemDetailPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/order/:orderId`} element={forceMobile ? <MobileOrderDetailPage /> : <ItemDetailPage />} />

            {/* Other routes */}
            <Route path="/support" element={<SupportPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/support`} element={<SupportPage />} />

            <Route path="/tickets" element={<SupportTicketsPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/tickets`} element={<SupportTicketsPage />} />

            <Route path="/auth/callback" element={<AuthCallback />} />

            <Route path="/marketplace" element={forceMobile ? <MobileMarketplacePage /> : <MarketplacePage />} />
            <Route path={`/:lang(${LANG_PATTERN})/marketplace`} element={forceMobile ? <MobileMarketplacePage /> : <MarketplacePage />} />

            <Route path="/contact" element={<ContactPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/contact`} element={<ContactPage />} />

            <Route path="/trading-guide" element={<TradingGuidePage />} />
            <Route path={`/:lang(${LANG_PATTERN})/trading-guide`} element={<TradingGuidePage />} />

            <Route path="/about" element={<AboutPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/about`} element={<AboutPage />} />

            <Route path="/terms" element={<TermsPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/terms`} element={<TermsPage />} />

            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/privacy`} element={<PrivacyPage />} />

            <Route path="/faq" element={<FAQPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/faq`} element={<FAQPage />} />

            <Route path="/security-tips" element={<SecurityTipsPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/security-tips`} element={<SecurityTipsPage />} />

            <Route path="/admin" element={<AdminPanelNew />} />
            <Route path="/admin-old" element={<AdminPage />} />

            <Route path="/weapons/:category" element={forceMobile ? <MobileWeaponCategoryPage /> : <WeaponCategoryPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/weapons/:category`} element={forceMobile ? <MobileWeaponCategoryPage /> : <WeaponCategoryPage />} />

            <Route path="/weapons/:category/:weapon" element={forceMobile ? <MobileWeaponCategoryPage /> : <WeaponCategoryPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/weapons/:category/:weapon`} element={forceMobile ? <MobileWeaponCategoryPage /> : <WeaponCategoryPage />} />

            <Route path="/user/:steamId" element={<UserProfilePage />} />
            <Route path={`/:lang(${LANG_PATTERN})/user/:steamId`} element={<UserProfilePage />} />

            <Route path="/bonuses" element={<BonusesPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/bonuses`} element={<BonusesPage />} />

            <Route path="/vip" element={<VipPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/vip`} element={<VipPage />} />

            <Route path="/referral" element={<ReferralPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/referral`} element={<ReferralPage />} />

            <Route path="/refund-policy" element={<RefundPolicyPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/refund-policy`} element={<RefundPolicyPage />} />

            <Route path="/dispute-resolution" element={<DisputeResolutionPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/dispute-resolution`} element={<DisputeResolutionPage />} />

            <Route path="/css-presets" element={<CSSPresetsPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/css-presets`} element={<CSSPresetsPage />} />

            <Route path="/developer-docs" element={<DeveloperDocsPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/developer-docs`} element={<DeveloperDocsPage />} />

            <Route path="/changelog" element={<ChangelogPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/changelog`} element={<ChangelogPage />} />

            <Route path="/blog/:slug" element={<BlogDetailPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/blog/:slug`} element={<BlogDetailPage />} />

            <Route path="/shop/:shopUrl" element={forceMobile ? <MobileUserShopPage /> : <UserShopPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/shop/:shopUrl`} element={forceMobile ? <MobileUserShopPage /> : <UserShopPage />} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>

        {/* Global Search Palette - opens via ⌘K or openSearchPalette().
            Must live inside <BrowserRouter> because it uses useNavigate(). */}
        <SearchPalette />

        {/* Global Deposit Modal - opens via openDepositModal().
            Inside Router for consistency / future routing-aware behavior. */}
        <DepositModal />
      </BrowserRouter>

      {/* Toast Container - Always Present */}
      <ToastContainer />

      {/* Age Verification Modal */}
      <AgeVerificationModal />
    </ThemeProvider>
  );
}