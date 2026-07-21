/*
  Blog sitemap — post-build step, runs right after generate-route-html.

  Fetches every published row from `blog_posts` (Supabase REST, anon key
  — same policy the public blog pages read through) and writes
  public/sitemap-blog.xml + dist/sitemap-blog.xml with one <url> per
  post, lastmod from `updated_at`.

  Written to BOTH public/ and dist/: public/ so the file is committed
  and reviewable in git, dist/ so the current build actually serves it
  (vite only copies public/ at the START of the build, before this
  script runs).

  robots.txt already points at /sitemap-blog.xml — this script is what
  makes that reference resolve instead of 404ing / falling through to
  the SPA shell.
*/
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function readEnvVar(name) {
  if (process.env[name]) return process.env[name];
  const envPath = join(root, '.env');
  if (!existsSync(envPath)) return undefined;
  const line = readFileSync(envPath, 'utf8')
    .split('\n')
    .find((l) => l.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).trim() : undefined;
}

const SUPABASE_URL = readEnvVar('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = readEnvVar('VITE_SUPABASE_ANON_KEY');

const FALLBACK = [
  { slug: 'skinify-vs-steam-market-poplatky-2026', updated_at: '2026-07-16' },
  { slug: 'how-to-sell-cs2-skins-for-real-money-2026', updated_at: '2026-07-16' },
  { slug: 'how-cs2-escrow-works-skinify-8-day-window', updated_at: '2026-07-16' },
];

async function fetchPublishedPosts() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[blog-sitemap] missing Supabase env vars — using fallback post list');
    return FALLBACK;
  }
  const url = `${SUPABASE_URL}/rest/v1/blog_posts?select=slug,updated_at,published_at&is_published=eq.true&order=published_at.desc`;
  try {
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) throw new Error('empty response');
    return rows;
  } catch (err) {
    console.warn('[blog-sitemap] live fetch failed, using fallback:', err.message);
    return FALLBACK;
  }
}

function toDateStamp(iso) {
  const d = iso ? new Date(iso) : new Date();
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
}

const posts = await fetchPublishedPosts();

const urls = posts
  .map(
    (p) => `  <url>
    <loc>https://skinify.gg/blog/${encodeURIComponent(p.slug)}</loc>
    <lastmod>${toDateStamp(p.updated_at || p.published_at)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`,
  )
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

writeFileSync(join(root, 'public', 'sitemap-blog.xml'), xml);
try {
  writeFileSync(join(root, 'dist', 'sitemap-blog.xml'), xml);
} catch {
  /* dist/ may not exist yet in a public-only run — public/ copy is enough */
}

console.log(`[blog-sitemap] wrote sitemap-blog.xml with ${posts.length} posts`);
