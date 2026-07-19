/*
  Per-route static HTML — post-build step.

  The app is a client-rendered SPA, so every route used to serve the same
  index.html with the homepage's <title> and canonical. This script reads
  every path from public/sitemap.xml and writes dist/<path>.html — a copy
  of the built index.html with a route-specific <title>, canonical, meta
  description, og/twitter tags, and a screen-reader-only <h1> + intro
  paragraph inside #root so crawlers that don't execute JS still see
  unique primary content.

  FLAT `.html` FILES, not <path>/index.html: Netlify serves /foo from
  foo.html with a plain 200, while foo/index.html triggers a 301 to
  /foo/ — which contradicted the slashless canonical + sitemap URLs and
  cost a crawl hop. Flat files keep the exact sitemap URL responding 200.

  Hydration is unchanged — the React bundle replaces the placeholder on
  mount, and the /* SPA redirect still catches anything unlisted.
*/
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

const template = readFileSync(join(dist, 'index.html'), 'utf8');
const sitemap = readFileSync(join(root, 'public', 'sitemap.xml'), 'utf8');

const paths = [...sitemap.matchAll(/<loc>https:\/\/skinify\.gg([^<]*)<\/loc>/g)]
  .map((m) => decodeURIComponent(m[1]))
  .filter((p) => p && p !== '/' && !p.includes('?'));

/* Words that must keep a fixed shape regardless of position — Google
   snippets with "Cs2" look sloppy and miss the keyword's proper form. */
const FIXED_CASE = {
  cs2: 'CS2', csgo: 'CS:GO', faq: 'FAQ', api: 'API', vip: 'VIP',
  i: 'I', vs: 'vs', skinify: 'Skinify', steam: 'Steam',
  csgoempire: 'CSGOEmpire', skinport: 'Skinport',
};

const titleCase = (slug) =>
  slug
    .split('-')
    .map((w) => {
      const lw = w.toLowerCase();
      if (FIXED_CASE[lw]) return FIXED_CASE[lw];
      return w ? w[0].toUpperCase() + w.slice(1) : w;
    })
    .join(' ');

/* Hand-written titles where mechanical casing reads unnaturally. */
const SLUG_TITLES = {
  '/buy-cs2-skins': 'Buy CS2 Skins',
  '/cs2-sell-skins': 'Sell CS2 Skins',
  '/instant-sell-cs2-skins': 'Instantly Sell CS2 Skins',
  '/cs2-skins-to-cash': 'Turn CS2 Skins Into Cash',
  '/cs2-skiny-koupit': 'CS2 skiny — nákup online',
  '/cs2-nuze-koupit': 'CS2 nože — nákup online',
  '/docs': 'Developer Docs',
  '/docs/api': 'API Reference',
  '/press': 'Press Kit',
  '/sitemap': 'Site Map',
};

/* Route-family rules → { title, h1, description, extra }. `extra` is one
   or two route-specific sentences for the static shell so the no-JS
   content isn't identical across pages. */
function metaFor(path) {
  const segs = path.split('/').filter(Boolean);
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

  let h1, desc, extra;
  if (path === '/marketplace') {
    h1 = 'CS2 Market — Buy & Sell CS2 Skins';
    desc = 'Browse thousands of CS2 skins on the Skinify CS2 market. Verified sellers, 0% buyer fees, escrow protection, instant Steam delivery.';
    extra = 'Filter by weapon, wear, float, pattern and price. Every listing comes from a verified Steam inventory and every trade is escrow-protected.';
  } else if (path === '/weapons') {
    h1 = 'CS2 Weapon Skins by Category';
    desc = 'Explore CS2 skins by weapon category — rifles, pistols, knives, gloves and more. Real prices, real floats.';
    extra = 'Pick a category to see live listings, price ranges and float values for every skin in it.';
  } else if (segs[0] === 'weapons' && segs.length === 2) {
    h1 = `${titleCase(segs[1])} — CS2 Skins`;
    desc = `Buy and sell ${segs[1]} CS2 skins with escrow protection and 0% buyer fees on Skinify.`;
    extra = `Live ${segs[1]} listings from verified sellers, with wear, float and pattern shown on every card.`;
  } else if (segs[0] === 'weapons' && segs.length === 3) {
    h1 = `${segs[2]} Skins — Prices & Floats`;
    desc = `All ${segs[2]} skins listed on Skinify — live prices, wear, floats and patterns. Buy with 0% buyer fees.`;
    extra = `Compare every ${segs[2]} finish side by side, from Battle-Scarred budget picks to Factory New collector pieces.`;
  } else if (path === '/blog') {
    h1 = 'CS2 Blog — Guides & Market News';
    desc = 'Guides, market analysis and news for CS2 skin traders from the Skinify team.';
    extra = 'New articles cover pricing, floats, patterns, escrow safety and how to get the most from every trade.';
  } else if (segs[0] === 'blog' && segs[1]) {
    h1 = titleCase(segs[1]);
    desc = `${titleCase(segs[1])} — a guide from the Skinify CS2 blog.`;
    extra = 'A practical, up-to-date guide written by the Skinify team for CS2 skin traders.';
  } else if (segs[0] === 'faq' && segs[1]) {
    h1 = `${titleCase(segs[1])} — FAQ`;
    desc = `${titleCase(segs[1])} — answered in the Skinify help center.`;
    extra = 'A clear answer from the Skinify help center, covering fees, escrow and trade safety where relevant.';
  } else if (segs[0] === 'vs' && segs[1]) {
    h1 = `Skinify vs ${titleCase(segs[1])}`;
    desc = `How Skinify compares to ${titleCase(segs[1])} — fees, payout speed, escrow and safety.`;
    extra = `A side-by-side look at fees, payout options and buyer protection on Skinify and ${titleCase(segs[1])}.`;
  } else {
    h1 = SLUG_TITLES[path] || titleCase(segs.join(' '));
    desc = `${h1} — Skinify, the CS2 market with 0% buyer fees and escrow trades.`;
    extra = `${h1} on Skinify: real-money payouts, escrow-protected trades and instant Steam delivery.`;
  }
  return { title: esc(`${h1} | Skinify`), h1: esc(h1), desc: esc(desc), extra: esc(extra) };
}

const SR_ONLY =
  'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0';

let written = 0;
for (const path of paths) {
  const { title, h1, desc, extra } = metaFor(path);
  const url = `https://skinify.gg${path.split('/').map(encodeURIComponent).join('/')}`;

  let html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(
      /<link rel="canonical" href="[^"]*" \/>/,
      `<link rel="canonical" href="${url}" />`,
    )
    .replace(
      /<meta name="description" content="[^"]*" \/>/,
      `<meta name="description" content="${desc}" />`,
    )
    .replace(
      /<meta property="og:title" content="[^"]*" \/>/,
      `<meta property="og:title" content="${title}" />`,
    )
    .replace(
      /<meta property="og:description" content="[^"]*" \/>/,
      `<meta property="og:description" content="${desc}" />`,
    )
    .replace(
      /<meta property="og:url" content="[^"]*" \/>/,
      `<meta property="og:url" content="${url}" />`,
    )
    .replace(
      /<meta name="twitter:title" content="[^"]*" \/>/,
      `<meta name="twitter:title" content="${title}" />`,
    )
    .replace(
      /<meta name="twitter:description" content="[^"]*" \/>/,
      `<meta name="twitter:description" content="${desc}" />`,
    );

  /* Screen-reader-only H1 + unique intro for no-JS crawlers; React
     clears the block on mount. */
  html = html.replace(
    /(<div id="root">)/,
    `$1<div style="${SR_ONLY}"><h1>${h1}</h1><p>${desc}</p><p>${extra}</p></div>`,
  );

  /* Flat file: /weapons/Rifles/AK-47 → dist/weapons/Rifles/AK-47.html */
  const parts = path.split('/').filter(Boolean);
  const file = join(dist, ...parts.slice(0, -1), `${parts[parts.length - 1]}.html`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  written++;
}

console.log(`[route-html] wrote ${written} flat route pages into dist/`);
