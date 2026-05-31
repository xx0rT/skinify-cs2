import { useEffect } from 'react';

interface MetaOptions {
  /** Page title — automatically suffixed with " · Skinify" if missing. */
  title?: string;
  /** Meta description. Truncates to 160 chars for SERP friendliness. */
  description?: string;
  /** Canonical URL. Defaults to the current location pathname. */
  canonical?: string;
}

/**
 * Lightweight per-page SEO hook — no helmet dependency, just direct DOM
 * writes. Sets document.title, meta[name="description"], the canonical
 * <link>, and the matching og:title / og:description / og:url tags so
 * social cards stay in sync.
 *
 * Skips entirely when the values are unchanged from the previous render,
 * so re-mounts on tab switches are cheap.
 */
export function useDocumentMeta({ title, description, canonical }: MetaOptions) {
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

    const url = canonical ?? `https://skinify.gg${window.location.pathname}`;
    setLink('canonical', url);
    setMeta('property', 'og:url', url);
  }, [title, description, canonical]);
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

export default useDocumentMeta;
