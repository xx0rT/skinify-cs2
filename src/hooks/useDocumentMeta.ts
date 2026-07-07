import { useEffect } from 'react';

interface MetaOptions {
  /** Page title — automatically suffixed with " · Skinify" if missing. */
  title?: string;
  /** Meta description. Truncates to 160 chars for SERP friendliness. */
  description?: string;
  /** Canonical URL. Defaults to the current location pathname. */
  canonical?: string;
  /** Per-page keywords (Yandex / Seznam still read this — Google ignores). */
  keywords?: string;
  /** Per-page social image (1200×630). Falls back to the site-wide cover. */
  ogImage?: string;
  /** Structured data — single object or array. Injected as one <script>
      tag keyed by the canonical URL so it replaces on route changes. */
  jsonLd?: object | object[];
  /** `noindex` set if true — used on Profile, Cart, Auth pages. */
  noindex?: boolean;
  /** Language codes with live `/:lang` route variants of this page.
      Emits `<link rel="alternate" hreflang>` tags (plus x-default →
      canonical). Only pass codes whose routes actually resolve. */
  langAlternates?: string[];
}

const DEFAULT_OG = 'https://skinify.gg/og-cover.png';

/**
 * Lightweight per-page SEO hook — no helmet dependency.
 * Updates document.title, meta[name="description"], canonical link, OG
 * and Twitter tags, robots, keywords, and a per-page JSON-LD script.
 */
export function useDocumentMeta({
  title,
  description,
  canonical,
  keywords,
  ogImage,
  jsonLd,
  noindex,
  langAlternates,
}: MetaOptions) {
  useEffect(() => {
    if (title) {
      const finalTitle = /skinify/i.test(title) ? title : `${title} · Skinify`;
      if (document.title !== finalTitle) document.title = finalTitle;
    }

    if (description) {
      const clean = description.length > 160 ? `${description.slice(0, 157)}…` : description;
      setMeta('name', 'description', clean);
      setMeta('property', 'og:description', clean);
      setMeta('name', 'twitter:description', clean);
    }

    if (title) {
      setMeta('property', 'og:title', title);
      setMeta('name', 'twitter:title', title);
    }

    if (keywords) setMeta('name', 'keywords', keywords);

    const img = ogImage || DEFAULT_OG;
    setMeta('property', 'og:image', img);
    setMeta('name', 'twitter:image', img);

    const url = canonical ?? `https://skinify.gg${window.location.pathname}`;
    setLink('canonical', url);
    setMeta('property', 'og:url', url);

    /* hreflang alternates — tell Google which URL serves which
       language so localized variants don't compete as duplicates.
       Managed tags are cleared on every run so route changes never
       leave stale alternates behind. */
    document.head
      .querySelectorAll('link[rel="alternate"][data-skinify-hreflang]')
      .forEach((el) => el.remove());
    if (langAlternates && langAlternates.length > 0 && !noindex) {
      const path = url.replace(/^https:\/\/skinify\.gg/, '') || '/';
      const add = (hreflang: string, href: string) => {
        const el = document.createElement('link');
        el.rel = 'alternate';
        el.hreflang = hreflang;
        el.href = href;
        el.setAttribute('data-skinify-hreflang', '1');
        document.head.appendChild(el);
      };
      add('x-default', url);
      add('en', url);
      for (const code of langAlternates) {
        if (code === 'en') continue;
        add(code, `https://skinify.gg/${code}${path === '/' ? '' : path}`);
      }
    }

    // Robots: noindex for private/account pages, otherwise full crawl.
    setMeta(
      'name',
      'robots',
      noindex
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    );

    // Per-page JSON-LD. Replaces any previous page's script of the same id.
    const SCRIPT_ID = 'skinify-page-jsonld';
    let existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (jsonLd) {
      if (!existing) {
        existing = document.createElement('script');
        existing.id = SCRIPT_ID;
        existing.type = 'application/ld+json';
        document.head.appendChild(existing);
      }
      const payload = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      const next = JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': payload,
      });
      if (existing.textContent !== next) existing.textContent = next;
    } else if (existing) {
      existing.remove();
    }
  }, [title, description, canonical, keywords, ogImage, jsonLd, noindex]);
}

function setMeta(attr: 'name' | 'property', key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  if (el.getAttribute('content') !== value) {
    el.setAttribute('content', value);
  }
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  if (el.getAttribute('href') !== href) {
    el.setAttribute('href', href);
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   Schema.org helpers — pre-built JSON-LD generators for the most common
   pages. Use these instead of hand-rolling per call site.
   ───────────────────────────────────────────────────────────────────────── */

export function breadcrumbJsonLd(
  trail: { name: string; url: string }[],
): object {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

export function productJsonLd(opts: {
  name: string;
  description?: string;
  image?: string;
  url: string;
  price: number;
  currency?: string;
  condition?: string;
  brand?: string;
  rarity?: string;
  sellerName?: string;
  rating?: number;
  ratingCount?: number;
}): object {
  return {
    '@type': 'Product',
    name: opts.name,
    description: opts.description,
    image: opts.image,
    url: opts.url,
    brand: { '@type': 'Brand', name: opts.brand || 'Counter-Strike 2' },
    category: opts.rarity ? `CS2 ${opts.rarity}` : 'CS2 Skin',
    sku: opts.url.split('/').pop(),
    offers: {
      '@type': 'Offer',
      url: opts.url,
      price: opts.price,
      priceCurrency: opts.currency || 'CZK',
      itemCondition: 'https://schema.org/UsedCondition',
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: opts.sellerName || 'Skinify seller',
      },
    },
    ...(opts.rating && opts.ratingCount
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: String(opts.rating),
            reviewCount: String(opts.ratingCount),
          },
        }
      : {}),
  };
}

export function faqJsonLd(items: { question: string; answer: string }[]): object {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: { '@type': 'Answer', text: q.answer },
    })),
  };
}

export function itemListJsonLd(opts: {
  name: string;
  url: string;
  items: { name: string; url: string; image?: string; price?: number; currency?: string }[];
}): object {
  return {
    '@type': 'ItemList',
    name: opts.name,
    url: opts.url,
    numberOfItems: opts.items.length,
    itemListElement: opts.items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: it.url,
      name: it.name,
      ...(it.image ? { image: it.image } : {}),
    })),
  };
}

export function collectionPageJsonLd(opts: {
  name: string;
  url: string;
  description: string;
}): object {
  return {
    '@type': 'CollectionPage',
    name: opts.name,
    url: opts.url,
    description: opts.description,
    isPartOf: { '@id': 'https://skinify.gg/#website' },
  };
}

export default useDocumentMeta;
