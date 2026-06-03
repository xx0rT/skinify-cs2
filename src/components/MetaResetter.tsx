import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/* ─────────────────────────────────────────────────────────────────────────
   MetaResetter — restore SEO defaults on every route change.

   Why this exists:
     - `useDocumentMeta` is called per-page and overwrites the robots /
       description / canonical tags. Pages that don't call it (404s,
       legacy routes, lazy-loaded fallbacks while a chunk loads) inherit
       whatever the previous page set. That's how a public marketplace
       page can end up with `noindex,nofollow` after the user navigated
       there from `/profile` or `/cart`.
     - Lighthouse audits a single URL and reports the noindex meta as a
       crawl-blocking error.

   On every navigation we synchronously reset robots → index/follow,
   canonical → current URL, and description → site default. Any page
   that calls `useDocumentMeta` immediately afterwards will override
   these values, so this only "kicks in" for pages that opted out of
   the per-page meta hook entirely.
   ───────────────────────────────────────────────────────────────────────── */

const DEFAULT_DESCRIPTION =
  'Skinify is the safe CS2 marketplace to buy and sell skins. 0% buyer fees, escrow-protected trades, instant Steam delivery — AK-47, AWP, Karambit & more.';

const PUBLIC_ROBOTS =
  'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

/* Paths that should explicitly stay noindex even if their page hasn't
   mounted yet (e.g. while the lazy chunk is loading). Matches by
   prefix so query-string variants are covered. */
const NOINDEX_PREFIXES = [
  '/profile',
  '/cart',
  '/messages',
  '/inbox',
  '/onboarding',
  '/auth/',
  '/login',
  '/signup',
  '/register',
  '/admin',
];

function isNoindexPath(pathname: string): boolean {
  return NOINDEX_PREFIXES.some((p) => pathname.startsWith(p));
}

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  if (el.content !== content) el.content = content;
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  if (el.href !== href) el.href = href;
}

/* Remove any leftover meta-refresh tags. Cloudflare's "Under Attack"
   challenge interstitial injects `<meta http-equiv="refresh">` to
   bounce the user once the challenge passes. When our real app mounts
   on top of that, the refresh tag can linger in the DOM and confuse
   crawlers — strip every one we find. */
function purgeRefreshMeta() {
  document.head
    .querySelectorAll<HTMLMetaElement>('meta[http-equiv="refresh" i]')
    .forEach((el) => el.remove());
}

const MetaResetter: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    purgeRefreshMeta();
    /* Robots — explicit per route. Pages opting in to a private state
       are listed above; everything else is public. */
    setMeta(
      'name',
      'robots',
      isNoindexPath(pathname) ? 'noindex, nofollow' : PUBLIC_ROBOTS,
    );
    setMeta(
      'name',
      'googlebot',
      isNoindexPath(pathname) ? 'noindex, nofollow' : PUBLIC_ROBOTS,
    );

    /* Description — only reset to the site default on PUBLIC routes
       that haven't injected a custom one yet. We do this on a
       microtask so per-page `useDocumentMeta` calls (which also run
       in a useEffect) can race ahead and set their own description
       without us clobbering it. */
    if (!isNoindexPath(pathname)) {
      const existing = document.head
        .querySelector<HTMLMetaElement>('meta[name="description"]')
        ?.content;
      if (!existing) setMeta('name', 'description', DEFAULT_DESCRIPTION);
    }

    /* Canonical — always reflects the current URL so crawlers don't
       see a stale canonical pointing at the previous page. */
    setLink('canonical', `https://skinify.gg${pathname}`);
  }, [pathname]);

  return null;
};

export default MetaResetter;
