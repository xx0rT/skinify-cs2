/*
  Per-route static HTML — post-build step.

  The app is a client-rendered SPA, so every route used to serve the same
  index.html with the homepage's <title> and canonical. This script reads
  every path from public/sitemap.xml and writes dist/<path>/index.html —
  a copy of the built index.html with a route-specific <title>, canonical,
  meta description, og/twitter tags, and a screen-reader-only <h1> inside
  #root so crawlers that don't execute JS still see the primary heading.

  Netlify serves an existing dist/<path>/index.html BEFORE the /* SPA
  redirect kicks in, so hydration works exactly as before — the React
  bundle replaces the placeholder H1 on mount.
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

const titleCase = (slug) =>
  slug
    .split('-')
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');

/* Route-family rules → { title, h1, description }. */
function metaFor(path) {
  const segs = path.split('/').filter(Boolean);
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

  let h1, desc;
  if (path === '/marketplace') {
    h1 = 'CS2 Market — Buy & Sell CS2 Skins';
    desc = 'Browse thousands of CS2 skins on the Skinify CS2 market. Verified sellers, 0% buyer fees, escrow protection, instant Steam delivery.';
  } else if (path === '/weapons') {
    h1 = 'CS2 Weapon Skins by Category';
    desc = 'Explore CS2 skins by weapon category — rifles, pistols, knives, gloves and more. Real prices, real floats.';
  } else if (segs[0] === 'weapons' && segs.length === 2) {
    h1 = `${segs[1]} — CS2 Skins`;
    desc = `Buy and sell ${segs[1]} CS2 skins with escrow protection and 0% buyer fees on Skinify.`;
  } else if (segs[0] === 'weapons' && segs.length === 3) {
    h1 = `${segs[2]} Skins — Prices & Floats`;
    desc = `All ${segs[2]} skins listed on Skinify — live prices, wear, floats and patterns. Buy with 0% buyer fees.`;
  } else if (path === '/blog') {
    h1 = 'CS2 Blog — Guides & Market News';
    desc = 'Guides, market analysis and news for CS2 skin traders from the Skinify team.';
  } else if (segs[0] === 'blog' && segs[1]) {
    h1 = titleCase(segs[1]);
    desc = `${titleCase(segs[1])} — a guide from the Skinify CS2 blog.`;
  } else if (segs[0] === 'faq' && segs[1]) {
    h1 = `${titleCase(segs[1])} — FAQ`;
    desc = `${titleCase(segs[1])} — answered in the Skinify help center.`;
  } else if (segs[0] === 'vs' && segs[1]) {
    h1 = `Skinify vs ${titleCase(segs[1])}`;
    desc = `How Skinify compares to ${titleCase(segs[1])} — fees, payout speed, escrow and safety.`;
  } else {
    h1 = titleCase(segs.join(' '));
    desc = `${titleCase(segs.join(' '))} — Skinify, the CS2 skin marketplace with 0% buyer fees and escrow trades.`;
  }
  return { title: esc(`${h1} | Skinify`), h1: esc(h1), desc: esc(desc) };
}

let written = 0;
for (const path of paths) {
  const { title, h1, desc } = metaFor(path);
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

  /* Screen-reader-only H1 for no-JS crawlers; React clears it on mount. */
  html = html.replace(
    /(<div id="root">)/,
    `$1<h1 style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0">${h1}</h1>`,
  );

  const dir = join(dist, ...path.split('/').filter(Boolean));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
  written++;
}

console.log(`[route-html] wrote ${written} route pages into dist/`);
