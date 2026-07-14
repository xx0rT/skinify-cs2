import React, { useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useSaleNotifications } from './hooks/useSaleNotifications';
import { useCurrencyStore } from './store/currencyStore';
import { useTranslationStore } from './store/translationStore';
import { useAuthStore } from './store/authStore';
import { autoDetectAndSetCurrency, detectGeoForUser, detectVpn } from './utils/geolocation';
import { memoryOptimizer } from './utils/memoryOptimizer';
import ToastContainer from './components/ui/ToastContainer';
import ScrollToTop from './components/ScrollToTop';
import MetaResetter from './components/MetaResetter';
import AgeVerificationModal from './components/AgeVerificationModal';
import SearchPalette from './components/SearchPalette';
import DepositModal from './components/DepositModal';
import MobileTabBar from './components/MobileTabBar';
import MobileTopBar from './components/MobileTopBar';
import MobileMenu from './components/MobileMenu';
import { ThemeProvider } from './theme/ThemeProvider';

// Critical pages - loaded immediately
import LandingPage from './pages/LandingPage';
import AuthCallback from './pages/AuthCallback';
import LanguageDetector from './components/LanguageDetector';
import VpnBanner from './components/VpnBanner';
import MaintenanceBanner from './components/MaintenanceBanner';

/* lazyWithRetry — wraps React.lazy with retry-and-recover logic for
   dynamic-import failures.

   Common failure modes this handles:
     - 403 / 404 on /assets/Xxxx-HASH.js after a redeploy (the hash
       changes; the browser still has the old index.html pointing at the
       previous bundle until it next reloads). The first import throws
       "Failed to fetch dynamically imported module" — we wait, retry
       once, and if that still fails we hard-reload with a cache-buster
       so the user gets a fresh index.html and matching chunks.
     - Transient network blips (ERR_NETWORK_CHANGED, offline flicker) —
       a single 600ms retry usually clears them without a reload.

   We use sessionStorage so we don't infinite-loop reload on persistent
   build problems. */
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      console.warn('[lazy] first attempt failed, retrying:', err);
      await new Promise((r) => setTimeout(r, 600));
      try {
        return await factory();
      } catch (err2) {
        console.error('[lazy] retry failed, force-reloading:', err2);
        try {
          const key = 'skinify_chunk_reload';
          const last = Number(sessionStorage.getItem(key) || '0');
          /* Only auto-reload if we haven't reloaded for this reason in
             the last 30s. Prevents reload loops if the server is truly
             returning 403 for the chunk. */
          if (Date.now() - last > 30_000) {
            sessionStorage.setItem(key, String(Date.now()));
            window.location.reload();
          }
        } catch {
          /* sessionStorage may be unavailable — fall through to throw. */
        }
        throw err2;
      }
    }
  });
}

// Lazy load less critical pages.
// Note: we used to have separate Mobile* pages and route between them via
// useMobileDetection(). Removed in favor of single responsive pages — every
// page below is now expected to lay out cleanly from ~360px up to 1480px+.
const SupportPage = lazyWithRetry(() => import('./pages/SupportPage'));
const SupportTicketsPage = lazyWithRetry(() => import('./pages/SupportTicketsPage'));
const ProfilePage = lazyWithRetry(() => import('./pages/ProfilePage'));
const CartPage = lazyWithRetry(() => import('./pages/CartPage'));
const ContactPage = lazyWithRetry(() => import('./pages/ContactPage'));
const TradingGuidePage = lazyWithRetry(() => import('./pages/TradingGuidePage'));
const AboutPage = lazyWithRetry(() => import('./pages/AboutPage'));
const TermsPage = lazyWithRetry(() => import('./pages/TermsPage'));
const PrivacyPage = lazyWithRetry(() => import('./pages/PrivacyPage'));
const FAQPage = lazyWithRetry(() => import('./pages/FAQPage'));
const SecurityTipsPage = lazyWithRetry(() => import('./pages/SecurityTipsPage'));
const AdminPage = lazyWithRetry(() => import('./pages/AdminPage'));
const AdminPanelNew = lazyWithRetry(() => import('./pages/AdminPanelNew'));
const ItemDetailPage = lazyWithRetry(() => import('./pages/ItemDetailPage'));
const WeaponCategoryPage = lazyWithRetry(() => import('./pages/WeaponCategoryPage'));
const WeaponCategoriesIndexPage = lazyWithRetry(() => import('./pages/WeaponCategoriesIndexPage'));
const UserProfilePage = lazyWithRetry(() => import('./pages/UserProfilePage'));
const MarketplacePage = lazyWithRetry(() => import('./pages/MarketplacePage'));
const BonusesPage = lazyWithRetry(() => import('./pages/BonusesPage'));
const VipPage = lazyWithRetry(() => import('./pages/VipPage'));
const RewardsPage = lazyWithRetry(() => import('./pages/RewardsPage'));
const ReferralPage = lazyWithRetry(() => import('./pages/ReferralPage'));
const RefundPolicyPage = lazyWithRetry(() => import('./pages/RefundPolicyPage'));
const DisputeResolutionPage = lazyWithRetry(() => import('./pages/DisputeResolutionPage'));
const UserShopPage = lazyWithRetry(() => import('./pages/UserShopPage'));
const CSSPresetsPage = lazyWithRetry(() => import('./pages/CSSPresetsPage'));
const DeveloperDocsPage = lazyWithRetry(() => import('./pages/DeveloperDocsPage'));
const ChangelogPage = lazyWithRetry(() => import('./pages/ChangelogPage'));
const BlogDetailPage = lazyWithRetry(() => import('./pages/BlogDetailPage'));
const BlogIndexPage = lazyWithRetry(() => import('./pages/BlogIndexPage'));
const SitemapPage = lazyWithRetry(() => import('./pages/SitemapPage'));
const DocsPage = lazyWithRetry(() => import('./pages/DocsPage'));
/* Docs content pages — re-exported from one module so a single dynamic
   import pulls in every sub-page bundle the first time the user opens
   /docs/* . They share the same chunk, which is what we want for a
   docs site where the user typically clicks across many of them. */
import * as DocsPages from './pages/docs/_DocsPages';
const NotFoundPage = lazyWithRetry(() => import('./pages/NotFoundPage'));
const SeoLandingPage = lazyWithRetry(() => import('./pages/SeoLandingPage'));
const FaqDetailPage = lazyWithRetry(() => import('./pages/FaqDetailPage'));
const DevelopersPage = lazyWithRetry(() => import('./pages/DevelopersPage'));
const OnboardingPage = lazyWithRetry(() => import('./pages/OnboardingPage'));
const SignInPage = lazyWithRetry(() => import('./pages/SignInPage'));
const SignUpPage = lazyWithRetry(() => import('./pages/SignUpPage'));
const AuthActionPage = lazyWithRetry(() => import('./pages/AuthActionPage'));
const MessagesPage = lazyWithRetry(() => import('./pages/MessagesPage'));
const PressPage = lazyWithRetry(() => import('./pages/PressPage'));

// All supported language codes for routing
const LANG_PATTERN = "en|es|cs|de|ru|fr|it|pt|pl|tr|ar|zh|ja|ko|nl|sv|no|da|fi|hu|ro|uk|el|th|vi|id|hi";

export default function App() {
  const setAutoDetectedCurrency = useCurrencyStore((s) => s.setAutoDetectedCurrency);
  const autoDetectAttempted = useRef(false);

  useSaleNotifications();

  /* Auto-detect runs AT MOST ONCE per app mount. We can't depend on
     `isAutoDetected` here because the moment a user manually picks a
     currency (Settings), `setSelectedCurrency` flips `isAutoDetected`
     back to false — which previously re-ran this effect and overwrote
     their pick with the geo-detected one. */
  useEffect(() => {
    if (autoDetectAttempted.current) return;
    autoDetectAttempted.current = true;

    /* Re-apply the user's saved UI scale (Settings → Appearance →
       Font size) before anything renders at the default zoom. */
    import('./utils/uiScale').then(({ getUiScale, applyUiScale }) =>
      applyUiScale(getUiScale()),
    );

    /* Single geo call that yields currency + language code + country.
       Cheaper than the historical pair of HTTP requests (currency-only
       + a second one for language), and means a flaky network only
       fails one localisation pass instead of two. */
    detectGeoForUser()
      .then((geo) => {
        if (!geo) {
          /* Geo call failed — fall back to the legacy currency-only
             detector which has its own multi-provider fallback chain. */
          return autoDetectAndSetCurrency().then((data) => {
            if (!data) return;
            const fresh = useCurrencyStore.getState();
            if (fresh.isAutoDetected || fresh.selectedCurrency.code === 'CZK') {
              setAutoDetectedCurrency(data.currency);
            }
          });
        }

        /* Currency: only override when the user hasn't picked one
           manually. Same gate logic as before. */
        const { isAutoDetected, selectedCurrency } = useCurrencyStore.getState();
        const currencyEligible =
          geo.currency &&
          (isAutoDetected || selectedCurrency.code === 'CZK');
        if (currencyEligible) {
          setAutoDetectedCurrency(geo.currency!);
        }

        /* Language: only override when the store says the current
           language was auto-detected. If the user has explicitly
           picked a language (including Czech, our default), we must
           leave their choice alone — geo IP often misreports for
           VPN / mobile / corporate networks and the previous code
           would silently overwrite their Czech pick on every visit
           because Czech was special-cased as "still default". */
        if (geo.languageCode) {
          const { isAutoDetected: langAuto, currentLanguage, setLanguageByCode } =
            useTranslationStore.getState();
          if (langAuto && geo.languageCode !== currentLanguage.code) {
            setLanguageByCode(geo.languageCode, /* fromAuto */ true);
          }
        }

        /* Best-effort: write the detected country onto the user row so
           support can see where a user was geolocated. Skips silently
           when there's no Supabase session. */
        if (geo.countryCode) {
          import('./lib/supabaseClient').then(({ supabase }) => {
            supabase.auth.getUser().then(({ data: { user } }) => {
              if (!user) return;
              supabase
                .from('users')
                .update({ detected_country: geo.countryCode })
                .eq('id', user.id);
            });
          });
        }
      })
      .catch(() => {
        /* All paths above silently degrade — never throw to the user. */
      });

    /* VPN check runs in parallel — it's independent of the geo result
       (we want to flag even users whose IP geolocated successfully).
       Fires once per session; the detectVpn helper caches in
       sessionStorage for 6h so this is free on subsequent navigations. */
    detectVpn()
      .then((isVpn) => {
        if (isVpn === true) {
          /* The banner reads from this flag. Stored on `window` so any
             component can pick it up via a tiny `useVpnDetected` hook
             without piping a context through the tree. */
          (window as any).__skinifyVpn = true;
          window.dispatchEvent(new CustomEvent('skinify:vpn-detected', { detail: true }));
        }
      })
      .catch(() => {});
  }, [setAutoDetectedCurrency]);

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

  // Lightweight skeleton fallback for route-level Suspense — keeps the layout
  // calm while a lazy chunk arrives. No spinner, no full-screen loader.
  const LoadingFallback = () => (
    <div className="min-h-screen px-4 sm:px-6 pt-24 pb-16 max-w-[1480px] mx-auto">
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
        <MetaResetter />
        <OnboardingGate />
        <MaintenanceBanner />
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Main routes - always use mobile version for small screens */}
            <Route path="/" element={<LandingPage />} />
            <Route path={`/:lang(${LANG_PATTERN})`} element={<LandingPage />} />

            <Route path="/profile" element={<ProfilePage />} />
            <Route path={`/:lang(${LANG_PATTERN})/profile`} element={<ProfilePage />} />

            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/onboarding`} element={<OnboardingPage />} />

            <Route path="/cart" element={<CartPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/cart`} element={<CartPage />} />

            <Route path="/rewards" element={<RewardsPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/rewards`} element={<RewardsPage />} />

            <Route path="/item/:itemId" element={<ItemDetailPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/item/:itemId`} element={<ItemDetailPage />} />

            <Route path="/order/:orderId" element={<ItemDetailPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/order/:orderId`} element={<ItemDetailPage />} />

            {/* Other routes */}
            <Route path="/support" element={<SupportPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/support`} element={<SupportPage />} />

            <Route path="/tickets" element={<SupportTicketsPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/tickets`} element={<SupportTicketsPage />} />

            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/signin" element={<SignInPage />} />
            <Route path="/auth/signup" element={<SignInPage initialMode="signup" />} />
            <Route path="/auth/confirm" element={<AuthActionPage mode="confirm" />} />
            <Route path="/auth/reset" element={<AuthActionPage mode="reset" />} />
            <Route path="/login" element={<SignInPage />} />
            <Route path="/signup" element={<SignInPage initialMode="signup" />} />
            <Route path="/register" element={<SignInPage initialMode="signup" />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/inbox" element={<MessagesPage />} />
            <Route path="/press" element={<PressPage />} />
            <Route path="/press-kit" element={<PressPage />} />
            <Route path="/media" element={<PressPage />} />

            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path={`/:lang(${LANG_PATTERN})/marketplace`} element={<MarketplacePage />} />

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
            <Route path="/faq/:slug" element={<FaqDetailPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/faq/:slug`} element={<FaqDetailPage />} />

            <Route path="/security-tips" element={<SecurityTipsPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/security-tips`} element={<SecurityTipsPage />} />

            <Route path="/admin" element={<AdminPanelNew />} />
            <Route path="/admin-old" element={<AdminPage />} />

            <Route path="/weapons" element={<WeaponCategoriesIndexPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/weapons`} element={<WeaponCategoriesIndexPage />} />

            <Route path="/weapons/:category" element={<WeaponCategoryPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/weapons/:category`} element={<WeaponCategoryPage />} />

            <Route path="/weapons/:category/:weapon" element={<WeaponCategoryPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/weapons/:category/:weapon`} element={<WeaponCategoryPage />} />

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

            <Route path="/blog" element={<BlogIndexPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/blog`} element={<BlogIndexPage />} />
            <Route path="/blog/:slug" element={<BlogDetailPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/blog/:slug`} element={<BlogDetailPage />} />

            <Route path="/sitemap" element={<SitemapPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/sitemap`} element={<SitemapPage />} />

            <Route path="/shop/:shopUrl" element={<UserShopPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/shop/:shopUrl`} element={<UserShopPage />} />

            {/* ─── SEO landing pages ──────────────────────────────────
                Long-form, statically-rendered pages targeting specific
                search queries (buy-cs2-skins, cs2-skiny-koupit, vs/*).
                Content lives in src/data/seoLandingPages.ts; the
                SeoLandingPage component reads it via slug. */}
            <Route path="/buy-cs2-skins" element={<SeoLandingPage />} />
            <Route path="/cs2-sell-skins" element={<SeoLandingPage />} />
            <Route path="/instant-sell-cs2-skins" element={<SeoLandingPage />} />
            <Route path="/cs2-skins-to-cash" element={<SeoLandingPage />} />
            <Route path="/cs2-skiny-koupit" element={<SeoLandingPage />} />
            <Route path="/cs2-nuze-koupit" element={<SeoLandingPage />} />
            <Route path="/vs/:slug" element={<SeoLandingPage />} />

            <Route path="/developers" element={<DevelopersPage />} />
            <Route path={`/:lang(${LANG_PATTERN})/developers`} element={<DevelopersPage />} />

            {/* /developers is the marketing preview (above). /docs is the
                full multi-page API reference (Cohere-docs style). The
                DocsPage shell renders a left nav + outlet + right TOC;
                each child route below mounts its own content page in
                the outlet. External links to docs.skinify.gg should
                rewrite to /docs at the host layer. */}
            <Route path="/docs" element={<DocsPage />}>
              <Route index element={<DocsPages.OverviewDoc />} />
              <Route path="quickstart" element={<DocsPages.QuickstartDoc />} />
              <Route path="authentication" element={<DocsPages.AuthenticationDoc />} />
              <Route path="rate-limits" element={<DocsPages.RateLimitsDoc />} />
              <Route path="errors" element={<DocsPages.ErrorsDoc />} />
              <Route path="versioning" element={<DocsPages.VersioningDoc />} />
              <Route path="endpoints/prices" element={<DocsPages.PricesEndpointDoc />} />
              <Route path="endpoints/listings" element={<DocsPages.ListingsEndpointDoc />} />
              <Route path="endpoints/listing" element={<DocsPages.ListingEndpointDoc />} />
              <Route path="endpoints/search" element={<DocsPages.SearchEndpointDoc />} />
              <Route path="endpoints/render" element={<DocsPages.RenderEndpointDoc />} />
              <Route path="endpoints/trends" element={<DocsPages.TrendsEndpointDoc />} />
              <Route path="endpoints/floor" element={<DocsPages.FloorEndpointDoc />} />
              <Route path="endpoints/inventory" element={<DocsPages.InventoryEndpointDoc />} />
              <Route path="endpoints/shops" element={<DocsPages.ShopsEndpointDoc />} />
              <Route path="endpoints/shop-listings" element={<DocsPages.ShopListingsEndpointDoc />} />
              <Route path="webhooks/overview" element={<DocsPages.WebhooksOverviewDoc />} />
              <Route path="webhooks/events" element={<DocsPages.WebhooksEventsDoc />} />
              <Route path="webhooks/signatures" element={<DocsPages.WebhooksSignaturesDoc />} />
              <Route path="shop/overview" element={<DocsPages.ShopOverviewDoc />} />
              <Route path="shop/structure" element={<DocsPages.ShopStructureDoc />} />
              <Route path="shop/variables" element={<DocsPages.ShopVariablesDoc />} />
              <Route path="shop/selectors" element={<DocsPages.ShopSelectorsDoc />} />
              <Route path="shop/examples" element={<DocsPages.ShopExamplesDoc />} />
              <Route path="shop/publishing" element={<DocsPages.ShopPublishingDoc />} />
              <Route path="sdks" element={<DocsPages.SdksDoc />} />
              <Route path="guides/price-ticker" element={<DocsPages.PriceTickerGuideDoc />} />
              <Route path="guides/price-alerts" element={<DocsPages.PriceAlertsGuideDoc />} />
              <Route path="api-changelog" element={<DocsPages.ApiChangelogDoc />} />
              <Route path="support" element={<DocsPages.SupportDoc />} />
              <Route path="api" element={<DocsPages.OverviewDoc />} />
            </Route>
            <Route path={`/:lang(${LANG_PATTERN})/docs/*`} element={<DocsPage />}>
              <Route index element={<DocsPages.OverviewDoc />} />
            </Route>
            <Route path="/api/docs" element={<DocsPage />}>
              <Route index element={<DocsPages.OverviewDoc />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>

        {/* Global Search Palette - opens via ⌘K or openSearchPalette().
            Must live inside <BrowserRouter> because it uses useNavigate(). */}
        <SearchPalette />

        {/* Global Deposit Modal - opens via openDepositModal().
            Inside Router for consistency / future routing-aware behavior. */}
        <DepositModal />

        {/* Mobile top bar — small fixed header with Log In / Sign Up
            (logged out) or refill + bell + avatar (logged in). Hidden
            on lg+ where the full LandingNav handles it. Inside Router
            because its buttons use react-router <Link>. */}
        <MobileTopBar />

        {/* Mobile menu drawer — full-screen panel opened by the top-bar
            hamburger via openMobileMenu(). Inside Router because its
            rows navigate. */}
        <MobileMenu />

        {/* Mobile bottom tab bar — only renders <md. Inside Router because
            tab links use react-router <Link>. */}
        <MobileTabBar />
      </BrowserRouter>

      {/* Toast Container - Always Present */}
      <ToastContainer />

      {/* Age Verification Modal */}
      <AgeVerificationModal />

      {/* VPN/proxy soft banner — listens for the skinify:vpn-detected
          event fired by the boot effect, shows a dismissible card.
          Rendered outside the router so it can sit over any page. */}
      <VpnBanner />
    </ThemeProvider>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   OnboardingGate — force logged-in users into /onboarding until they
   have (a) a linked Steam account and (b) a saved trade URL.

   Rules:
     - No user signed in           →  no-op.
     - Already on /onboarding       →  no-op (let them finish).
     - Already on /auth/*           →  no-op (don't interrupt OAuth callbacks).
     - User has both fields         →  no-op.
     - Otherwise                    →  redirect to /onboarding (replace).

   The redirect uses `replace` so the back button doesn't drop the user
   into a loop. The Steam-link return ALSO comes through /auth/callback,
   which is exempt above, so the linking flow can finish without us
   bouncing the user mid-OAuth.
   ───────────────────────────────────────────────────────────────────────── */
function OnboardingGate() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  /* Push the authenticated user's steam id into the DM store so it
     can subscribe to its inbox channel + send messages with the right
     `from_steam_id`. Pulled in lazily here so the DM store doesn't
     have to depend on authStore directly (avoids a circular import). */
  React.useEffect(() => {
    const sid = user?.steamId || null;
    import('./store/dmStore').then(({ useDMStore }) => {
      useDMStore.getState().setMySteamId(sid);
      /* Pull the inbox once so the profile-dropdown unread badge
         reflects reality on first paint instead of "0 until the
         user opens /messages". Realtime keeps it fresh after that. */
      if (sid) {
        useDMStore.getState().hydrateInbox().catch(() => {
          /* silently ignore — best effort */
        });
      }
    });
  }, [user?.steamId]);

  React.useEffect(() => {
    if (!user) return;
    const path = location.pathname || '/';
    if (path.startsWith('/onboarding')) return;
    if (path.startsWith('/auth')) return;
    /* Strip optional lang prefix so /cs/onboarding matches too. */
    if (/^\/[a-z]{2}\/onboarding/i.test(path)) return;
    const needsSteam = !user.steamLinked;
    const needsTradeLink = !user.tradeLink;
    if (needsSteam || needsTradeLink) {
      navigate('/onboarding', { replace: true });
    }
  }, [user?.steamLinked, user?.tradeLink, location.pathname, navigate]);

  return null;
}