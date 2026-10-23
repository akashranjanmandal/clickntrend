import { useEffect } from 'react';

export const SITE_NAME = 'GFTD';
export const SITE_TAGLINE = 'The Art of Gifting';
export const DEFAULT_DESCRIPTION =
  'Personalised gifts, curated gift combos and custom keepsakes from GFTD. Add your photos and words, and we deliver a gift that feels made for them — across India.';
export const DEFAULT_IMAGE = '/logo.png';

export interface SeoOptions {
  /** Page title without the site name ("Fridge Magnets") */
  title?: string;
  description?: string;
  /** Absolute or site-relative image URL used for link previews */
  image?: string;
  /** Path for the canonical URL; defaults to the current path without query string */
  path?: string;
  type?: 'website' | 'product';
  /** Keep the page out of search results (checkout, order pages, admin) */
  noindex?: boolean;
  /** Structured data (schema.org) for rich results */
  jsonLd?: Record<string, any> | Record<string, any>[];
}

const absolute = (url: string) => {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
};

const setMeta = (attr: 'name' | 'property', key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

const setCanonical = (href: string) => {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
};

const clip = (text: string, max = 160) => {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
};

/** Sets every SEO tag for the current page (missing values fall back to site defaults). */
export function setSeo(opts: SeoOptions = {}) {
  const title = opts.title ? `${opts.title} | ${SITE_NAME}` : `${SITE_NAME} — ${SITE_TAGLINE} | Personalised Gifts & Gift Combos`;
  const description = clip(opts.description || DEFAULT_DESCRIPTION);
  const image = absolute(opts.image || DEFAULT_IMAGE);
  const url = absolute(opts.path || window.location.pathname);

  document.title = title;
  setMeta('name', 'description', description);
  setMeta('name', 'robots', opts.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
  setCanonical(url);

  setMeta('property', 'og:site_name', SITE_NAME);
  setMeta('property', 'og:type', opts.type || 'website');
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:image', image);
  setMeta('property', 'og:url', url);
  setMeta('property', 'og:locale', 'en_IN');
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);
  setMeta('name', 'twitter:image', image);

  // Page-level structured data (the site-wide Organization/WebSite block lives in index.html)
  document.head.querySelectorAll('script[data-seo="page"]').forEach(el => el.remove());
  if (opts.jsonLd) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.seo = 'page';
    script.textContent = JSON.stringify(opts.jsonLd);
    document.head.appendChild(script);
  }
}

/** Call from every routed page; re-applies when `deps` change (e.g. once data has loaded). */
export function useSeo(opts: SeoOptions, deps: any[] = []) {
  useEffect(() => {
    setSeo(opts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export { absolute as absoluteUrl, clip as clipText };
