import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Lock, BarChart3, Settings, MessageSquare, Wrench, Wallet, Activity, Search, RefreshCw, Download, Eye, CreditCard as Edit, Trash2, CheckCircle, X, Shield, TrendingUp, Users, DollarSign, AlertTriangle, Bell, Database, Code, TestTube, FileText, MousePointerClick, Calendar, ShoppingCart, Globe } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuthStore } from '../../store/authStore';
import { fetchSiteFlags, type SiteFlags } from '../../utils/siteFlags';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

/* Today's dashboard counters — the get_today_stats Postgres RPC was never
   created (404). We fetch them from the admin-settings edge function
   (service_role) so Steam-OpenID admins, who hold no Supabase session,
   still get real numbers instead of an RLS 401 / RPC 404. */
async function fetchTodayStats(steamId: string | undefined): Promise<any | null> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/admin-settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseKey}`,
        'X-Steam-Id': steamId || '',
      },
      body: JSON.stringify({ action: 'today_stats' }),
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return data?.stats ?? null;
  } catch {
    return null;
  }
}

/* adminSettingsPost — service-role caller shared by the admin tabs in
   this file. Anon reads miss the users join (RLS) and every write is
   blocked, so all inventory operations go through admin-settings. */
async function adminSettingsPost(adminSteamId: string | undefined, payload: Record<string, unknown>) {
  const res = await fetch(`${supabaseUrl}/functions/v1/admin-settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseKey}`,
      'X-Steam-Id': adminSteamId || '',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Server error (${res.status})`);
  return data;
}

export const InventoryTab: React.FC<{ addToast: any }> = ({ addToast }) => {
  const adminSteamId = useAuthStore((s) => s.user?.steamId);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [editPriceId, setEditPriceId] = useState<string | number | null>(null);
  const [editPrice, setEditPrice] = useState('');

  useEffect(() => {
    fetchListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const { listings: data } = await adminSettingsPost(adminSteamId, { action: 'admin_listings' });
      setListings(data || []);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Load failed', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const setActive = async (l: any, isActive: boolean) => {
    setListings((prev) => prev.map((x) => (x.id === l.id ? { ...x, is_active: isActive } : x)));
    try {
      await adminSettingsPost(adminSteamId, { action: 'listing_set_active', id: l.id, isActive });
      addToast({ type: 'success', title: isActive ? 'Listing activated' : 'Listing paused', message: l.item_name });
    } catch (error: any) {
      setListings((prev) => prev.map((x) => (x.id === l.id ? { ...x, is_active: !isActive } : x)));
      addToast({ type: 'error', title: 'Update failed', message: error.message });
    }
  };

  const removeListing = async (l: any) => {
    if (!confirm(`Delete listing "${l.item_name}"? This cannot be undone.`)) return;
    try {
      await adminSettingsPost(adminSteamId, { action: 'listing_delete', id: l.id });
      setListings((prev) => prev.filter((x) => x.id !== l.id));
      addToast({ type: 'success', title: 'Listing deleted', message: l.item_name });
    } catch (error: any) {
      addToast({ type: 'error', title: 'Delete failed', message: error.message });
    }
  };

  const savePrice = async (l: any) => {
    const price = Number(editPrice.replace(',', '.'));
    if (!Number.isFinite(price) || price < 0) {
      addToast({ type: 'warning', title: 'Invalid price' });
      return;
    }
    try {
      await adminSettingsPost(adminSteamId, { action: 'listing_update_price', id: l.id, price });
      setListings((prev) => prev.map((x) => (x.id === l.id ? { ...x, price } : x)));
      setEditPriceId(null);
      addToast({ type: 'success', title: 'Price updated', message: `${l.item_name} → ${price.toLocaleString('cs-CZ')} Kč` });
    } catch (error: any) {
      addToast({ type: 'error', title: 'Update failed', message: error.message });
    }
  };

  const filtered = listings.filter((l) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      String(l.item_name || '').toLowerCase().includes(q) ||
      String(l.users?.display_name || '').toLowerCase().includes(q) ||
      String(l.steam_id || '').includes(q)
    );
  });

  const kpis = [
    { label: 'Total listings', value: listings.length },
    { label: 'Active', value: listings.filter((l) => l.is_active !== false).length, tone: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Paused', value: listings.filter((l) => l.is_active === false).length, tone: 'text-amber-600 dark:text-amber-400' },
    { label: 'High value (5 000+ Kč)', value: listings.filter((l) => Number(l.price || 0) >= 5000).length, tone: 'text-accent' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <span className="label-eyebrow">Marketplace</span>
          <h2 className="text-[20px] font-bold text-ink tracking-tight mt-1 leading-none">
            Inventory & listings
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-dim" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search item, seller, Steam ID…"
              className="h-10 w-64 pl-9 pr-3 rounded-full bg-subtle ring-1 ring-line outline-none text-ink text-[12.5px] font-medium focus:ring-2 focus:ring-accent transition-all"
            />
          </div>
          <button
            onClick={fetchListings}
            className="h-10 w-10 rounded-full bg-subtle ring-1 ring-line hover:bg-bg grid place-items-center text-ink-muted hover:text-ink transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-3xl ring-1 ring-line bg-surface p-5">
            <div className={`text-[22px] font-bold tabular-nums leading-none ${k.tone || 'text-ink'}`}>
              {k.value}
            </div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-dim mt-2">
              {k.label}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl ring-1 ring-line bg-surface overflow-hidden">
        {loading && listings.length === 0 ? (
          <div className="p-10 text-center text-[13px] text-ink-muted font-medium">Loading listings…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-[13px] text-ink-muted font-medium">No listings found.</div>
        ) : (
          <div className="divide-y divide-line">
            {filtered.map((l) => {
              const active = l.is_active !== false;
              const sellerName = l.users?.display_name || l.steam_id || 'Unknown';
              const editing = editPriceId === l.id;
              return (
                <div key={l.id} className="flex items-center gap-3 px-4 py-3 hover:bg-subtle/40 transition-colors">
                  {/* Item */}
                  <div className="w-12 h-12 rounded-xl bg-subtle ring-1 ring-line grid place-items-center overflow-hidden shrink-0">
                    {l.image_url ? (
                      <img src={l.image_url} alt="" className="w-[86%] h-[86%] object-contain" loading="lazy" />
                    ) : (
                      <Package size={16} className="text-ink-dim" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-bold text-ink tracking-tight truncate">
                      {l.item_name || 'Unknown item'}
                    </div>
                    <div className="text-[11px] text-ink-muted font-medium truncate mt-0.5">
                      {l.item_type || '—'} · {new Date(l.created_at).toLocaleDateString('cs-CZ')} ·{' '}
                      <span className="tabular-nums">{Number(l.views || 0)} views</span>
                    </div>
                  </div>

                  {/* Seller — real display name from the users join */}
                  <div className="hidden md:flex items-center gap-2 w-44 shrink-0">
                    <div className="w-7 h-7 rounded-full bg-subtle ring-1 ring-line overflow-hidden grid place-items-center shrink-0">
                      {l.users?.avatar_url ? (
                        <img src={l.users.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-ink-muted">
                          {String(sellerName).charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-[12px] font-semibold text-ink truncate">{sellerName}</span>
                  </div>

                  {/* Price — click to edit */}
                  <div className="w-32 text-right shrink-0">
                    {editing ? (
                      <div className="flex items-center gap-1 justify-end">
                        <input
                          autoFocus
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') savePrice(l);
                            if (e.key === 'Escape') setEditPriceId(null);
                          }}
                          className="w-20 h-8 px-2 rounded-lg bg-subtle ring-1 ring-line outline-none text-ink text-[12px] font-bold tabular-nums focus:ring-2 focus:ring-accent"
                        />
                        <button
                          onClick={() => savePrice(l)}
                          className="h-8 w-8 rounded-lg bg-accent text-on-accent grid place-items-center"
                          aria-label="Save price"
                        >
                          <CheckCircle size={12} strokeWidth={2.6} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditPriceId(l.id);
                          setEditPrice(String(l.price ?? ''));
                        }}
                        className="text-[13.5px] font-bold text-ink tabular-nums hover:text-accent transition-colors"
                        title="Click to edit price"
                      >
                        {Number(l.price || 0).toLocaleString('cs-CZ')} Kč
                      </button>
                    )}
                  </div>

                  {/* Status */}
                  <span
                    className={`hidden sm:inline-flex w-16 justify-center px-2 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider shrink-0 ${
                      active
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {active ? 'Active' : 'Paused'}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => window.open(`/item/${l.id}`, '_blank')}
                      className="h-8 px-3 rounded-full bg-subtle ring-1 ring-line hover:bg-accent-soft text-ink text-[11.5px] font-bold inline-flex items-center gap-1 transition-colors"
                      title="Open the listing page"
                    >
                      <Eye size={11} strokeWidth={2.4} />
                      Open
                    </button>
                    <button
                      onClick={() => setActive(l, !active)}
                      className={`h-8 px-3 rounded-full ring-1 ring-line text-[11.5px] font-bold transition-colors ${
                        active
                          ? 'bg-subtle hover:bg-amber-500/15 text-ink hover:text-amber-600 dark:hover:text-amber-400'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                    >
                      {active ? 'Pause' : 'Activate'}
                    </button>
                    <button
                      onClick={() => removeListing(l)}
                      className="h-8 w-8 rounded-full ring-1 ring-line bg-subtle hover:bg-rose-500/15 grid place-items-center text-ink-muted hover:text-rose-500 transition-colors"
                      aria-label="Delete listing"
                    >
                      <Trash2 size={12} strokeWidth={2.4} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16'];

/* ISO-3166 alpha-2 → display name + rough map position (percent of an
   equirectangular world, x = longitude 0–100, y = latitude 0–100). Only
   the countries we realistically see traffic from; unknown codes fall
   back to the raw code and sit off-map. */
const COUNTRY_NAMES: Record<string, string> = {
  CZ: 'Czechia', SK: 'Slovakia', DE: 'Germany', PL: 'Poland', AT: 'Austria',
  GB: 'United Kingdom', US: 'United States', FR: 'France', NL: 'Netherlands',
  ES: 'Spain', IT: 'Italy', SE: 'Sweden', NO: 'Norway', DK: 'Denmark',
  FI: 'Finland', RU: 'Russia', UA: 'Ukraine', CA: 'Canada', BR: 'Brazil',
  AU: 'Australia', JP: 'Japan', IN: 'India', CN: 'China', TR: 'Turkey',
  RO: 'Romania', HU: 'Hungary', BE: 'Belgium', CH: 'Switzerland', PT: 'Portugal',
  IE: 'Ireland', GR: 'Greece', BG: 'Bulgaria', HR: 'Croatia', RS: 'Serbia',
};

/* x,y as % on an equirectangular projection (0,0 = top-left / -180°,+90°). */
const COUNTRY_COORDS: Record<string, { x: number; y: number }> = {
  CZ: { x: 53.9, y: 30.5 }, SK: { x: 55.3, y: 31 }, DE: { x: 52.8, y: 29.5 },
  PL: { x: 55.5, y: 28.5 }, AT: { x: 53.7, y: 31.3 }, GB: { x: 49.5, y: 27 },
  US: { x: 22, y: 37 }, FR: { x: 50.6, y: 31.5 }, NL: { x: 51.6, y: 28.3 },
  ES: { x: 48.8, y: 35 }, IT: { x: 53.3, y: 34 }, SE: { x: 54.5, y: 23 },
  NO: { x: 52.8, y: 22 }, DK: { x: 52.7, y: 27 }, FI: { x: 57, y: 22 },
  RU: { x: 63, y: 24 }, UA: { x: 58, y: 30 }, CA: { x: 22, y: 26 },
  BR: { x: 33, y: 63 }, AU: { x: 84, y: 68 }, JP: { x: 87, y: 36 },
  IN: { x: 70, y: 44 }, CN: { x: 77, y: 37 }, TR: { x: 59, y: 35 },
  RO: { x: 57, y: 32 }, HU: { x: 55.5, y: 31 }, BE: { x: 51.2, y: 29 },
  CH: { x: 52.4, y: 31.5 }, PT: { x: 47.5, y: 35 }, IE: { x: 47.8, y: 27 },
  GR: { x: 57, y: 35.5 }, BG: { x: 57.5, y: 33.5 }, HR: { x: 54.5, y: 32.5 },
  RS: { x: 56, y: 32.8 },
};

/* Lightweight sessions map — an equirectangular graticule drawn in SVG
   (no maplibre / tiles / external deps) with a bubble per country sized
   by session share. Good enough to see "where traffic comes from" at a
   glance without shipping a megabyte of map tiles into the admin
   bundle. Countries without known coords are listed but not plotted. */
const WorldSessionMap: React.FC<{
  data: { code: string; name: string; sessions: number; pct: number }[];
}> = ({ data }) => {
  const plotted = data.filter((d) => COUNTRY_COORDS[d.code]);
  const max = Math.max(1, ...plotted.map((d) => d.sessions));
  const [hover, setHover] = useState<string | null>(null);

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-subtle/40" style={{ aspectRatio: '2 / 1' }}>
      {/* Graticule background */}
      <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-30">
        {[10, 20, 30, 40].map((y) => (
          <line key={`h${y}`} x1="0" y1={y} x2="100" y2={y} stroke="currentColor" strokeWidth="0.15" className="text-ink-muted" />
        ))}
        {[20, 40, 60, 80].map((x) => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2="50" stroke="currentColor" strokeWidth="0.15" className="text-ink-muted" />
        ))}
        {/* crude continent blobs so dots have context */}
        <g className="text-ink-muted" fill="currentColor" opacity="0.18">
          <ellipse cx="24" cy="34" rx="10" ry="9" />
          <ellipse cx="33" cy="60" rx="6" ry="9" />
          <ellipse cx="52" cy="30" rx="9" ry="6" />
          <ellipse cx="58" cy="42" rx="10" ry="8" />
          <ellipse cx="75" cy="38" rx="12" ry="9" />
          <ellipse cx="84" cy="66" rx="6" ry="5" />
        </g>
      </svg>

      {/* Session bubbles */}
      {plotted.map((d, i) => {
        const c = COUNTRY_COORDS[d.code];
        const size = 8 + (d.sessions / max) * 30;
        const color = COLORS[i % COLORS.length];
        return (
          <div
            key={d.code}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-bg/60 transition-transform"
            style={{
              left: `${c.x}%`,
              top: `${c.y}%`,
              width: size,
              height: size,
              background: color,
              opacity: hover && hover !== d.code ? 0.35 : 0.8,
              transform: `translate(-50%,-50%) scale(${hover === d.code ? 1.15 : 1})`,
            }}
            onMouseEnter={() => setHover(d.code)}
            onMouseLeave={() => setHover(null)}
            title={`${d.name}: ${d.sessions} sessions (${d.pct}%)`}
          />
        );
      })}

      {hover && (() => {
        const d = plotted.find((x) => x.code === hover);
        const c = d && COUNTRY_COORDS[d.code];
        if (!d || !c) return null;
        return (
          <div
            className="absolute z-10 -translate-x-1/2 rounded-lg bg-bg border border-line px-2.5 py-1.5 text-xs shadow-lg pointer-events-none whitespace-nowrap"
            style={{ left: `${c.x}%`, top: `calc(${c.y}% + ${18}px)` }}
          >
            <div className="font-bold text-ink">{d.name}</div>
            <div className="text-ink-muted tabular-nums">{d.sessions} sessions · {d.pct}%</div>
          </div>
        );
      })()}

      {plotted.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-ink-muted text-sm text-center px-4">
          No geo-tagged sessions yet — visitors get located automatically as they browse.
        </div>
      )}
    </div>
  );
};

export const AnalyticsTab: React.FC<{ addToast: any }> = ({ addToast }) => {
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState<any>(null);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [pageStats, setPageStats] = useState<any[]>([]);
  const [eventStats, setEventStats] = useState<any[]>([]);
  const [countryStats, setCountryStats] = useState<{ code: string; name: string; sessions: number; pct: number }[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  /* Time-series bucket granularity for the "Activity over time" chart —
     independent of timeRange (the lookback window). */
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const adminSteamId = useAuthStore((s) => s.user?.steamId);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, granularity]);

  /* Live traffic table — poll recent sessions every 15s while the tab
     is open, independent of the heavier full-range refresh. */
  useEffect(() => {
    fetchLiveSessions();
    const id = window.setInterval(fetchLiveSessions, 15000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLiveSessions = async () => {
    if (!supabase) return;
    try {
      const { data } = await supabase
        .from('user_activity')
        .select('created_at, event_type, page_url, country_code, user_steam_id, session_id')
        .order('created_at', { ascending: false })
        .limit(25);
      if (data) setLiveSessions(data);
    } catch {
      /* non-fatal */
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      if (supabase) {
        const todayData = await fetchTodayStats(adminSteamId);
        if (todayData) {
          setTodayStats(todayData);
        }

        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data: activityRaw } = await supabase
          .from('user_activity')
          .select('created_at, event_type, event_data, country_code, session_id')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true });

        if (activityRaw) {
          /* Bucket key by granularity: day / ISO-week / month. */
          const bucketKey = (d: Date): string => {
            if (granularity === 'monthly') {
              return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
            }
            if (granularity === 'weekly') {
              // Monday-anchored week start.
              const dow = (d.getDay() + 6) % 7;
              const monday = new Date(d);
              monday.setDate(d.getDate() - dow);
              monday.setHours(0, 0, 0, 0);
              return monday.toLocaleDateString();
            }
            return d.toLocaleDateString();
          };

          const groupedByDate: Record<string, any> = {};
          const bucketOrder: string[] = [];

          activityRaw.forEach((activity: any) => {
            const date = bucketKey(new Date(activity.created_at));

            if (!groupedByDate[date]) {
              groupedByDate[date] = { date, visits: 0, users: 0, deposits: 0, purchases: 0 };
              bucketOrder.push(date);
            }

            if (activity.event_type === 'page_view') {
              groupedByDate[date].visits += 1;
            } else if (activity.event_type === 'deposit') {
              groupedByDate[date].deposits += activity.event_data?.amount || 0;
            } else if (activity.event_type === 'purchase') {
              groupedByDate[date].purchases += activity.event_data?.amount || 0;
            }
          });

          setActivityData(bucketOrder.map((k) => groupedByDate[k]));

          /* Sessions by country — count DISTINCT session_id per country
             so it reads as "how many visitors from each country", not
             raw event volume. */
          const countrySessions: Record<string, Set<string>> = {};
          activityRaw.forEach((a: any) => {
            const cc = (a.country_code || '').toUpperCase();
            if (!cc) return;
            (countrySessions[cc] ||= new Set()).add(a.session_id || a.created_at);
          });
          const countryEntries = Object.entries(countrySessions)
            .map(([code, set]) => ({ code, sessions: set.size }))
            .sort((a, b) => b.sessions - a.sessions);
          const totalCountrySessions = countryEntries.reduce((s, c) => s + c.sessions, 0) || 1;
          setCountryStats(
            countryEntries.map((c) => ({
              code: c.code,
              name: COUNTRY_NAMES[c.code] || c.code,
              sessions: c.sessions,
              pct: Math.round((c.sessions / totalCountrySessions) * 100),
            })),
          );

          const pageViews = activityRaw.filter((a: any) => a.event_type === 'page_view');
          const pageCount: Record<string, number> = {};

          pageViews.forEach((view: any) => {
            const page = view.event_data?.page_url || 'Unknown';
            pageCount[page] = (pageCount[page] || 0) + 1;
          });

          const totalViews = Object.values(pageCount).reduce((sum: number, count) => sum + count, 0);
          const topPages = Object.entries(pageCount)
            .map(([page, views]) => ({
              page: page.replace('/', '').replace('-', ' ') || 'Home',
              views,
              percentage: Math.round((views / totalViews) * 100)
            }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 10);

          setPageStats(topPages);

          const eventCount: Record<string, number> = {};
          activityRaw.forEach((a: any) => {
            eventCount[a.event_type] = (eventCount[a.event_type] || 0) + 1;
          });

          setEventStats(
            Object.entries(eventCount).map(([name, value]) => ({
              name: name.replace('_', ' ').toUpperCase(),
              value
            }))
          );
        }
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink flex items-center gap-2">
            <Activity className="w-6 h-6 text-accent" />
            Analytics Dashboard
          </h2>
          <p className="text-ink-muted text-sm mt-1">Monitor user activity and platform metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value as any)}
            className="bg-subtle text-ink px-4 py-2 rounded-lg border border-line focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="bg-subtle text-ink px-4 py-2 rounded-lg border border-line focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent text-ink rounded-lg transition"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface border border-accent/30 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <Eye className="w-8 h-8 text-accent" />
            <span className="text-2xl font-bold text-ink">{todayStats?.total_visits || 0}</span>
          </div>
          <div className="text-ink-muted font-medium">Total Visits Today</div>
          <div className="text-xs text-ink-muted mt-1">{todayStats?.unique_visitors || 0} unique visitors</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface border border-line rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-accent" />
            <span className="text-2xl font-bold text-ink">{todayStats?.new_registrations || 0}</span>
          </div>
          <div className="text-ink-muted font-medium">New Registrations</div>
          <div className="text-xs text-ink-muted mt-1">Today's sign-ups</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface border border-green-500/30 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            <span className="text-2xl font-bold text-ink">
              {todayStats?.deposits_today?.toLocaleString() || 0} Kč
            </span>
          </div>
          <div className="text-ink-muted font-medium">Deposits Today</div>
          <div className="text-xs text-ink-muted mt-1">Total deposited</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-surface border border-orange-500/30 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <ShoppingCart className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            <span className="text-2xl font-bold text-ink">
              {todayStats?.purchases_today?.toLocaleString() || 0} Kč
            </span>
          </div>
          <div className="text-ink-muted font-medium">Purchases Today</div>
          <div className="text-xs text-ink-muted mt-1">Total revenue</div>
        </motion.div>
      </div>

      <div className="bg-surface border border-line rounded-xl p-6">
        <h3 className="text-xl font-bold text-ink mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-accent" />
          Activity Over Time
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={activityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#F3F4F6' }}
            />
            <Legend />
            <Area type="monotone" dataKey="visits" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} name="Visits" />
            <Area type="monotone" dataKey="deposits" stroke="#10B981" fill="#10B981" fillOpacity={0.6} name="Deposits (Kč)" />
            <Area type="monotone" dataKey="purchases" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} name="Purchases (Kč)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-line rounded-xl p-6">
          <h3 className="text-xl font-bold text-ink mb-4 flex items-center gap-2">
            <MousePointerClick className="w-5 h-5 text-accent" />
            Event Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={eventStats}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {eventStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-surface border border-line rounded-xl p-6">
          <h3 className="text-xl font-bold text-ink mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Top Pages
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pageStats} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9CA3AF" />
              <YAxis dataKey="page" type="category" width={100} stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
              />
              <Bar dataKey="views" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Sessions by country: world map + pie + ranked list ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface border border-line rounded-xl p-6">
          <h3 className="text-xl font-bold text-ink mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-accent" />
            Sessions by country
          </h3>
          <WorldSessionMap data={countryStats} />
        </div>

        <div className="bg-surface border border-line rounded-xl p-6 flex flex-col">
          <h3 className="text-xl font-bold text-ink mb-4">Top countries</h3>
          {countryStats.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-ink-muted text-sm py-8 text-center">
              No geo-tagged sessions yet.<br />Data appears as visitors are located.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={countryStats.slice(0, 6)}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="sessions"
                    nameKey="name"
                  >
                    {countryStats.slice(0, 6).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                    formatter={(v: any, _n: any, p: any) => [`${v} sessions`, p?.payload?.name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2 overflow-y-auto max-h-[200px]">
                {countryStats.slice(0, 10).map((c, i) => (
                  <div key={c.code} className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-sm text-ink font-medium truncate flex-1">{c.name}</span>
                    <span className="text-sm text-ink-muted tabular-nums">{c.sessions}</span>
                    <span className="text-xs text-ink-dim tabular-nums w-9 text-right">{c.pct}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Live traffic table (polls every 15s) ── */}
      <div className="bg-surface border border-line rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-ink flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            Live traffic
          </h3>
          <span className="text-xs text-ink-muted">Auto-refreshes every 15s · last 25 events</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-muted border-b border-line">
                <th className="pb-2 font-medium">Time</th>
                <th className="pb-2 font-medium">Event</th>
                <th className="pb-2 font-medium">Page</th>
                <th className="pb-2 font-medium">Country</th>
                <th className="pb-2 font-medium">User</th>
              </tr>
            </thead>
            <tbody>
              {liveSessions.length === 0 ? (
                <tr><td colSpan={5} className="py-6 text-center text-ink-muted">No recent activity.</td></tr>
              ) : (
                liveSessions.map((s, i) => (
                  <tr key={`${s.session_id}-${s.created_at}-${i}`} className="border-b border-line/50">
                    <td className="py-2 text-ink-muted tabular-nums whitespace-nowrap">
                      {new Date(s.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-subtle text-ink">
                        {String(s.event_type || '').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2 text-ink truncate max-w-[220px]">{s.page_url || '—'}</td>
                    <td className="py-2 text-ink">
                      {s.country_code
                        ? (COUNTRY_NAMES[String(s.country_code).toUpperCase()] || s.country_code)
                        : '—'}
                    </td>
                    <td className="py-2 text-ink-muted font-mono text-xs truncate max-w-[140px]">
                      {s.user_steam_id || 'guest'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-surface border border-line rounded-xl p-6">
        <h3 className="text-xl font-bold text-ink mb-4">Quick Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-subtle rounded-lg">
            <div className="text-3xl font-bold text-accent">{todayStats?.page_views || 0}</div>
            <div className="text-ink-muted text-sm mt-1">Page Views Today</div>
          </div>
          <div className="text-center p-4 bg-subtle rounded-lg">
            <div className="text-3xl font-bold text-accent">{todayStats?.clicks || 0}</div>
            <div className="text-ink-muted text-sm mt-1">Clicks Today</div>
          </div>
          <div className="text-center p-4 bg-subtle rounded-lg">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{todayStats?.unique_visitors || 0}</div>
            <div className="text-ink-muted text-sm mt-1">Unique Visitors</div>
          </div>
          <div className="text-center p-4 bg-subtle rounded-lg">
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {((todayStats?.page_views || 0) / (todayStats?.unique_visitors || 1)).toFixed(1)}
            </div>
            <div className="text-ink-muted text-sm mt-1">Avg Pages/Visitor</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const SupportTab: React.FC<{ addToast: any; user: any }> = ({ addToast, user }) => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  /* Staff users.id — resolved from the Steam ID (the auth store has no
     users-row uuid, which is why staff replies used to silently fail). */
  const [staffId, setStaffId] = useState<string | null>(null);
  useEffect(() => {
    if (!supabase || !user?.steamId) return;
    supabase
      .from('users')
      .select('id')
      .eq('steam_id', user.steamId)
      .maybeSingle()
      .then(({ data }: any) => setStaffId(data?.id ?? null));
  }, [user?.steamId]);

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const fetchTickets = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      let query = supabase
        .from('support_tickets')
        .select('*, users!support_tickets_user_id_fkey(display_name, avatar_url, email)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error:', error);
      addToast({ type: 'error', title: 'Error', message: 'Failed to fetch tickets' });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('support_ticket_messages')
        .select('*, users:user_id(display_name, avatar_url)')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const openTicket = (t: any) => {
    setSelectedTicket(t);
    fetchMessages(t.id);
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    if (!supabase) return;
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'resolved' || newStatus === 'closed') {
        updateData.resolved_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);
      if (error) throw error;
      addToast({ type: 'success', title: 'Updated', message: `Ticket marked ${newStatus.replace('_', ' ')}` });
      fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message });
    }
  };

  const sendReply = async () => {
    if (!newMessage.trim() || !selectedTicket || !supabase || sending) return;
    if (!staffId) {
      addToast({ type: 'error', title: 'Error', message: 'Could not resolve your staff account — re-login and try again.' });
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.from('support_ticket_messages').insert([
        {
          ticket_id: selectedTicket.id,
          user_id: staffId,
          message: newMessage.trim(),
          is_staff_reply: true,
        },
      ]);
      if (error) throw error;

      if (selectedTicket.status === 'open') {
        await updateTicketStatus(selectedTicket.id, 'in_progress');
      }

      /* Notify the ticket owner by email (Brevo) — fire-and-forget. */
      const ownerEmail = selectedTicket?.users?.email;
      if (ownerEmail) {
        import('../../utils/emailService').then(({ sendTicketReplyEmail }) =>
          sendTicketReplyEmail({
            to: ownerEmail,
            ticketSubject: selectedTicket.subject,
            preview: newMessage.trim(),
          }),
        );
      }

      setNewMessage('');
      fetchMessages(selectedTicket.id);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message });
    } finally {
      setSending(false);
    }
  };

  const STATUS_STYLES: Record<string, { dot: string; pill: string; label: string }> = {
    open: { dot: 'bg-accent', pill: 'bg-accent-soft text-accent', label: 'Open' },
    in_progress: { dot: 'bg-amber-500', pill: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', label: 'In progress' },
    resolved: { dot: 'bg-emerald-500', pill: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', label: 'Resolved' },
    closed: { dot: 'bg-ink-dim', pill: 'bg-subtle text-ink-muted', label: 'Closed' },
  };

  return (
    <motion.div
      initial="hidden"
      animate="shown"
      variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.05 } } }}
      className="space-y-4"
    >
      {/* Filter pills */}
      <motion.div
        variants={{ hidden: { opacity: 0, y: 12 }, shown: { opacity: 1, y: 0 } }}
        className="flex gap-1.5 overflow-x-auto scrollbar-hide"
      >
        {['all', 'open', 'in_progress', 'resolved', 'closed'].map((s) => {
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`relative h-10 px-4 rounded-full text-[12.5px] font-bold whitespace-nowrap transition-colors ${
                active ? 'text-on-accent' : 'bg-subtle text-ink-muted hover:text-ink'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="admin-support-filter"
                  className="absolute inset-0 rounded-full bg-accent"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative">
                {s === 'all' ? 'All' : STATUS_STYLES[s]?.label || s}
              </span>
            </button>
          );
        })}
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr] lg:items-start">
        {/* Ticket list */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 12 }, shown: { opacity: 1, y: 0 } }}
          className="panel overflow-hidden"
        >
          {loading ? (
            <div className="p-8 text-center text-[13px] text-ink-muted font-medium">Loading…</div>
          ) : tickets.length === 0 ? (
            <div className="p-10 text-center">
              <MessageSquare size={22} className="mx-auto text-ink-muted mb-2" />
              <p className="text-[13px] text-ink-muted font-medium">No tickets in this state.</p>
            </div>
          ) : (
            <ul className="max-h-[70vh] overflow-y-auto">
              {tickets.map((t, i) => {
                const meta = STATUS_STYLES[t.status] || STATUS_STYLES.open;
                const active = selectedTicket?.id === t.id;
                return (
                  <motion.li
                    key={t.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.25) }}
                  >
                    <button
                      onClick={() => openTicket(t)}
                      className={`w-full text-left px-4 py-3.5 flex items-start gap-3 border-l-2 transition-colors ${
                        active ? 'bg-accent-soft border-l-accent' : 'border-l-transparent hover:bg-subtle/60'
                      }`}
                    >
                      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13.5px] font-bold text-ink truncate tracking-tight">
                          {t.subject}
                        </span>
                        <span className="block text-[11.5px] text-ink-muted font-medium truncate mt-0.5">
                          {t.users?.display_name || 'Unknown user'} · {new Date(t.created_at).toLocaleDateString()}
                        </span>
                        <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.pill}`}>
                          {meta.label}
                        </span>
                      </span>
                    </button>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </motion.div>

        {/* Conversation + actions */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 12 }, shown: { opacity: 1, y: 0 } }}
          className="panel flex flex-col overflow-hidden min-h-[420px] max-h-[80vh]"
        >
          {!selectedTicket ? (
            <div className="flex-1 grid place-items-center p-16 text-center">
              <div>
                <MessageSquare size={22} className="mx-auto text-ink-muted mb-3" />
                <p className="text-[14px] font-bold text-ink">Select a ticket</p>
                <p className="text-[12px] text-ink-muted font-medium mt-1">
                  Pick one from the list to read and reply.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Header + status actions */}
              <div className="shrink-0 px-5 py-4 border-b border-line/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[15px] font-bold text-ink tracking-tight truncate">
                      {selectedTicket.subject}
                    </div>
                    <div className="text-[11.5px] text-ink-muted font-medium mt-1">
                      {selectedTicket.users?.display_name || 'Unknown'} ·{' '}
                      {selectedTicket.category} · {selectedTicket.priority} ·{' '}
                      {new Date(selectedTicket.created_at).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="w-9 h-9 rounded-full bg-subtle grid place-items-center text-ink-muted hover:text-ink transition-colors shrink-0"
                    aria-label="Close"
                  >
                    <X size={14} strokeWidth={2.4} />
                  </button>
                </div>
                <div className="mt-3 flex gap-1.5 flex-wrap">
                  {['open', 'in_progress', 'resolved', 'closed'].map((s) => {
                    const active = selectedTicket.status === s;
                    return (
                      <button
                        key={s}
                        onClick={() => updateTicketStatus(selectedTicket.id, s)}
                        className={`h-8 px-3 rounded-full text-[11.5px] font-bold transition-colors ${
                          active
                            ? STATUS_STYLES[s].pill
                            : 'bg-subtle text-ink-muted hover:text-ink'
                        }`}
                      >
                        {STATUS_STYLES[s].label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3">
                <div className="flex justify-start">
                  <div className="max-w-[80%] px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-subtle text-ink text-[13.5px] font-medium leading-snug whitespace-pre-wrap break-words">
                    {selectedTicket.description}
                  </div>
                </div>
                {messages.map((m: any) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${m.is_staff_reply ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] flex flex-col gap-1 ${m.is_staff_reply ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`px-3.5 py-2.5 rounded-2xl text-[13.5px] font-medium leading-snug whitespace-pre-wrap break-words ${
                          m.is_staff_reply
                            ? 'bg-accent text-on-accent rounded-br-md'
                            : 'bg-subtle text-ink rounded-bl-md'
                        }`}
                      >
                        {m.message}
                      </div>
                      <span className="text-[10px] text-ink-dim font-medium tabular-nums px-1">
                        {m.is_staff_reply ? 'Staff' : m.users?.display_name || 'User'} ·{' '}
                        {new Date(m.created_at).toLocaleString([], {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Composer */}
              <div className="shrink-0 border-t border-line/60 px-4 py-3 flex items-end gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendReply();
                    }
                  }}
                  placeholder="Reply as staff…"
                  rows={1}
                  maxLength={2000}
                  className="flex-1 min-h-[42px] max-h-[140px] rounded-2xl bg-subtle px-3.5 py-2.5 text-[13.5px] text-ink font-medium outline-none focus:ring-2 focus:ring-accent/40 resize-none"
                />
                <button
                  onClick={sendReply}
                  disabled={!newMessage.trim() || sending}
                  className="h-10 px-4 rounded-full bg-accent text-on-accent text-[13px] font-bold disabled:opacity-40 shrink-0"
                >
                  {sending ? 'Sending…' : 'Reply'}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export const SettingsTab: React.FC<{ addToast: any }> = ({ addToast }) => {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState<any>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      if (supabase) {
        const { data, error } = await supabase.from('system_settings').select('*');
        if (error) throw error;
        setSettings(data || []);
      }
    } catch (error: any) {
      console.error('Error:', error);
      addToast({ type: 'error', title: 'Error', message: error.message || 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (setting: any) => {
    setEditModal(setting);
    setEditValue(JSON.stringify(setting.value, null, 2));
  };

  const handleSave = async () => {
    try {
      if (!supabase || !editModal) return;

      const parsedValue = JSON.parse(editValue);

      const { error } = await supabase
        .from('system_settings')
        .update({ value: parsedValue, updated_at: new Date().toISOString() })
        .eq('id', editModal.id);

      if (error) throw error;

      addToast({ type: 'success', title: 'Success', message: 'Setting updated successfully' });
      setEditModal(null);
      fetchSettings();
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message || 'Failed to update setting' });
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="shown"
      variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.04 } } }}
      className="space-y-4"
    >
      <motion.div
        variants={{ hidden: { opacity: 0, y: 10 }, shown: { opacity: 1, y: 0 } }}
        className="flex justify-between items-center gap-3"
      >
        <p className="text-[13px] text-ink-muted font-medium">
          Platform parameters stored in <code className="font-mono">system_settings</code> — edited as JSON.
        </p>
        <button
          onClick={fetchSettings}
          className="w-10 h-10 rounded-full bg-subtle hover:bg-surface grid place-items-center text-ink-muted hover:text-ink transition-colors shrink-0"
          aria-label="Refresh"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {loading ? (
          <div className="col-span-2 text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        ) : settings.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-ink-muted">
            No settings found. Please run the database setup script.
          </div>
        ) : (
          settings.map((setting) => (
            <motion.div
              key={setting.id}
              variants={{ hidden: { opacity: 0, y: 12 }, shown: { opacity: 1, y: 0 } }}
              whileHover={{ y: -2 }}
              className="panel p-5"
            >
              <div className="flex justify-between items-start gap-2 mb-1.5">
                <h3 className="text-[14.5px] font-bold text-ink tracking-tight truncate">
                  {setting.key}
                </h3>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  setting.category === 'finance' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                  setting.category === 'security' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                  setting.category === 'system' ? 'bg-accent-soft text-accent' :
                  'bg-subtle text-ink-muted'
                }`}>
                  {setting.category}
                </span>
              </div>
              <p className="text-[12px] text-ink-muted font-medium mb-3 line-clamp-2">
                {setting.description}
              </p>
              <div className="rounded-xl bg-subtle px-3 py-2.5 text-[12px] text-ink font-mono mb-3 overflow-x-auto whitespace-nowrap">
                {JSON.stringify(setting.value)}
              </div>
              <button
                onClick={() => openEditModal(setting)}
                className="w-full h-10 rounded-full bg-subtle hover:bg-accent-soft text-ink text-[12.5px] font-bold transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <Edit size={13} strokeWidth={2.4} />
                Edit
              </button>
            </motion.div>
          ))
        )}
      </div>

      {editModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setEditModal(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="panel p-6 max-w-2xl w-full"
          >
            <span className="label-eyebrow">System setting</span>
            <h3 className="text-[19px] font-bold text-ink tracking-tight mt-1 leading-none mb-2 font-mono">
              {editModal.key}
            </h3>
            <p className="text-[12.5px] text-ink-muted font-medium mb-4">{editModal.description}</p>

            <div className="mb-4">
              <label className="label-meta block mb-1.5">Value (JSON)</label>
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full bg-subtle rounded-xl px-4 py-3 text-[13px] text-ink font-mono outline-none focus:ring-2 focus:ring-accent/40 transition-shadow resize-y"
                rows={7}
              />
              <p className="text-ink-dim text-[11px] font-medium mt-1.5">Must be valid JSON.</p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditModal(null)}
                className="h-11 px-5 rounded-full bg-subtle hover:bg-bg text-ink text-[13px] font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="h-11 px-5 rounded-full bg-accent hover:opacity-90 text-on-accent text-[13px] font-bold transition-opacity"
              >
                Save changes
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export const DeveloperTab: React.FC<{ addToast: any }> = ({ addToast }) => {
  const [tableCounts, setTableCounts] = useState<{ name: string; count: number | null }[]>([]);
  const [countsLoading, setCountsLoading] = useState(false);
  const [pings, setPings] = useState<Record<string, { ms: number; ok: boolean } | 'pending'>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('skinify_feature_flags') || '{}');
    } catch {
      return {};
    }
  });

  const TABLES = ['users', 'marketplace_listings', 'user_transactions', 'support_tickets', 'api_keys'];
  const FUNCTIONS = ['orders', 'api-keys', 'send-email', 'support-chat', 'user-profile'];
  const FLAGS = [
    { id: 'verbose_logging', label: 'Verbose logging', sub: 'Extra console logging in this browser' },
  ];

  /* SITEWIDE flags — persisted to system_settings (key `site_flags`) via
     admin-settings; every visitor reads them through get_public_flags. */
  const adminSteamId = useAuthStore((s) => s.user?.steamId);
  const [siteFlags, setSiteFlags] = useState<SiteFlags>({});
  const [flagsLoading, setFlagsLoading] = useState(true);
  const [flagsSaving, setFlagsSaving] = useState(false);
  const [maintenanceText, setMaintenanceText] = useState('');

  useEffect(() => {
    fetchSiteFlags(true).then((f) => {
      setSiteFlags(f);
      setMaintenanceText(f.maintenance_text || '');
      setFlagsLoading(false);
    });
  }, []);

  const saveSiteFlags = async (next: SiteFlags) => {
    setSiteFlags(next);
    setFlagsSaving(true);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/admin-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
          'X-Steam-Id': adminSteamId || '',
        },
        body: JSON.stringify({
          action: 'save_setting',
          key: 'site_flags',
          value: next,
          description: 'Sitewide feature flags (Developer tab)',
          category: 'features',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Server error (${res.status})`);
      addToast({ type: 'success', title: 'Sitewide flags saved', message: 'Live for all visitors within a minute.' });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Save failed', message: e?.message });
    } finally {
      setFlagsSaving(false);
    }
  };

  const fetchCounts = async () => {
    if (!supabase) return;
    setCountsLoading(true);
    const results = await Promise.all(
      TABLES.map(async (name) => {
        try {
          const { count, error } = await supabase
            .from(name)
            .select('*', { count: 'exact', head: true });
          return { name, count: error ? null : count ?? 0 };
        } catch {
          return { name, count: null };
        }
      }),
    );
    setTableCounts(results);
    setCountsLoading(false);
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  const pingFunction = async (fn: string) => {
    setPings((prev) => ({ ...prev, [fn]: 'pending' }));
    try {
      const start = performance.now();
      const res = await fetch(`${supabaseUrl}/functions/v1/${fn}`, { method: 'OPTIONS' });
      const ms = Math.round(performance.now() - start);
      setPings((prev) => ({ ...prev, [fn]: { ms, ok: res.ok || res.status === 405 } }));
    } catch {
      setPings((prev) => ({ ...prev, [fn]: { ms: -1, ok: false } }));
    }
  };

  const toggleFlag = (id: string) => {
    setFlags((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem('skinify_feature_flags', JSON.stringify(next));
      } catch {
        /* private mode */
      }
      return next;
    });
  };

  const clearLocalCaches = () => {
    try {
      const kept = ['skinify_ui_scale', 'skinify_feature_flags'];
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('skinify_') && !kept.includes(key)) toRemove.push(key);
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
      (window as any).__skinifyPeerProfileCache = undefined;
      (window as any).__skinifySellerAvatarCache = undefined;
      addToast({ type: 'success', title: 'Caches cleared', message: `${toRemove.length} local keys removed.` });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Failed', message: e?.message });
    }
  };

  const exportSnapshot = async () => {
    if (!supabase) return;
    try {
      const [tx, tickets] = await Promise.all([
        supabase
          .from('user_transactions')
          .select('id, type, status, amount, created_at')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('support_tickets')
          .select('id, subject, status, priority, category, created_at')
          .order('created_at', { ascending: false })
          .limit(100),
      ]);
      const blob = new Blob(
        [
          JSON.stringify(
            {
              exported_at: new Date().toISOString(),
              table_counts: tableCounts,
              recent_transactions: tx.data || [],
              recent_tickets: tickets.data || [],
            },
            null,
            2,
          ),
        ],
        { type: 'application/json' },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `skinify-snapshot-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast({ type: 'success', title: 'Snapshot exported' });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Export failed', message: e?.message });
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="shown"
      variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.05 } } }}
      className="space-y-4"
    >
      {/* Database counts */}
      <motion.section
        variants={{ hidden: { opacity: 0, y: 12 }, shown: { opacity: 1, y: 0 } }}
        className="panel p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="label-eyebrow">Database</span>
            <h3 className="text-[16px] font-bold tracking-tight mt-1 leading-none">Table sizes</h3>
          </div>
          <button
            onClick={fetchCounts}
            className="w-10 h-10 rounded-full bg-subtle hover:bg-surface grid place-items-center text-ink-muted hover:text-ink transition-colors"
            aria-label="Refresh counts"
          >
            <RefreshCw size={15} strokeWidth={2.2} className={countsLoading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {tableCounts.map((tc) => (
            <div key={tc.name} className="rounded-2xl bg-subtle p-4">
              <div className="text-[20px] font-bold tabular-nums text-ink leading-none">
                {tc.count == null ? '—' : tc.count.toLocaleString()}
              </div>
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim mt-2 truncate">
                {tc.name}
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Edge function pings */}
      <motion.section
        variants={{ hidden: { opacity: 0, y: 12 }, shown: { opacity: 1, y: 0 } }}
        className="panel p-6"
      >
        <span className="label-eyebrow">Edge functions</span>
        <h3 className="text-[16px] font-bold tracking-tight mt-1 leading-none mb-4">
          Ping a function
        </h3>
        <div className="space-y-1">
          {FUNCTIONS.map((fn) => {
            const result = pings[fn];
            return (
              <div key={fn} className="flex items-center gap-3 py-2">
                <code className="flex-1 text-[13px] font-mono font-semibold text-ink truncate">
                  /functions/v1/{fn}
                </code>
                {result && result !== 'pending' && (
                  <span
                    className={`text-[12px] font-bold tabular-nums ${
                      result.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {result.ms >= 0 ? `${result.ms} ms` : 'unreachable'}
                  </span>
                )}
                <button
                  onClick={() => pingFunction(fn)}
                  disabled={result === 'pending'}
                  className="h-9 px-4 rounded-full bg-subtle hover:bg-accent-soft text-ink text-[12px] font-bold transition-colors disabled:opacity-50 shrink-0"
                >
                  {result === 'pending' ? 'Pinging…' : 'Ping'}
                </button>
              </div>
            );
          })}
        </div>
      </motion.section>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Feature flags — sitewide + local */}
        <motion.section
          variants={{ hidden: { opacity: 0, y: 12 }, shown: { opacity: 1, y: 0 } }}
          className="panel p-6"
        >
          <span className="label-eyebrow">Feature flags</span>
          <h3 className="text-[16px] font-bold tracking-tight mt-1 leading-none mb-1">
            Sitewide toggles
          </h3>
          <p className="text-[11.5px] text-ink-dim font-medium mb-4">
            Saved to the database — apply to every visitor within a minute.
            {flagsSaving && <span className="text-accent font-bold"> Saving…</span>}
          </p>
          <div className="space-y-4 mb-6">
            {/* Maintenance banner + editable text */}
            <div className="rounded-2xl ring-1 ring-line p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-bold text-ink tracking-tight">Maintenance banner</div>
                  <div className="text-[11.5px] text-ink-muted font-medium">
                    Amber notice pinned above the whole site
                  </div>
                </div>
                <button
                  onClick={() =>
                    saveSiteFlags({
                      ...siteFlags,
                      maintenance_banner: !siteFlags.maintenance_banner,
                      maintenance_text: maintenanceText,
                    })
                  }
                  disabled={flagsLoading}
                  aria-pressed={!!siteFlags.maintenance_banner}
                  className={`relative h-6 w-11 rounded-full transition-colors shrink-0 disabled:opacity-50 ${
                    siteFlags.maintenance_banner ? 'bg-amber-500' : 'bg-subtle'
                  }`}
                >
                  <motion.span
                    animate={{ x: siteFlags.maintenance_banner ? 20 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                    className="absolute top-0.5 left-0 w-5 h-5 rounded-full bg-surface shadow-sm"
                  />
                </button>
              </div>
              <div className="mt-3 flex items-stretch gap-1.5">
                <input
                  value={maintenanceText}
                  onChange={(e) => setMaintenanceText(e.target.value)}
                  placeholder="Probíhá plánovaná údržba — některé funkce mohou být dočasně nedostupné."
                  className="flex-1 min-w-0 h-10 px-3.5 rounded-xl bg-subtle ring-1 ring-line outline-none text-ink text-[12.5px] font-medium focus:ring-2 focus:ring-accent transition-all"
                />
                <button
                  onClick={() => saveSiteFlags({ ...siteFlags, maintenance_text: maintenanceText })}
                  disabled={flagsSaving}
                  className="h-10 px-4 rounded-xl bg-accent text-on-accent text-[12px] font-bold disabled:opacity-50 shrink-0"
                >
                  Save text
                </button>
              </div>
            </div>

            {/* Promo banner */}
            <div className="rounded-2xl ring-1 ring-line p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-bold text-ink tracking-tight">Promo banner</div>
                <div className="text-[11.5px] text-ink-muted font-medium">
                  Deposit-bonus banner + landing promo banner
                </div>
              </div>
              <button
                onClick={() =>
                  saveSiteFlags({ ...siteFlags, promo_banner: !(siteFlags.promo_banner ?? true) })
                }
                disabled={flagsLoading}
                aria-pressed={siteFlags.promo_banner ?? true}
                className={`relative h-6 w-11 rounded-full transition-colors shrink-0 disabled:opacity-50 ${
                  (siteFlags.promo_banner ?? true) ? 'bg-accent' : 'bg-subtle'
                }`}
              >
                <motion.span
                  animate={{ x: (siteFlags.promo_banner ?? true) ? 20 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                  className="absolute top-0.5 left-0 w-5 h-5 rounded-full bg-surface shadow-sm"
                />
              </button>
            </div>
          </div>

          <h3 className="text-[13px] font-bold tracking-tight leading-none mb-1">Local toggles</h3>
          <p className="text-[11.5px] text-ink-dim font-medium mb-3">
            Stored in this browser (localStorage) — read them via the
            <code className="font-mono"> skinify_feature_flags</code> key.
          </p>
          <div className="space-y-3">
            {FLAGS.map((f) => {
              const on = !!flags[f.id];
              return (
                <div key={f.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-bold text-ink tracking-tight">{f.label}</div>
                    <div className="text-[11.5px] text-ink-muted font-medium">{f.sub}</div>
                  </div>
                  <button
                    onClick={() => toggleFlag(f.id)}
                    aria-pressed={on}
                    className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${
                      on ? 'bg-accent' : 'bg-subtle'
                    }`}
                  >
                    <motion.span
                      animate={{ x: on ? 20 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                      className="absolute top-0.5 left-0 w-5 h-5 rounded-full bg-surface shadow-sm"
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* Maintenance actions */}
        <motion.section
          variants={{ hidden: { opacity: 0, y: 12 }, shown: { opacity: 1, y: 0 } }}
          className="panel p-6"
        >
          <span className="label-eyebrow">Maintenance</span>
          <h3 className="text-[16px] font-bold tracking-tight mt-1 leading-none mb-4">
            Tools
          </h3>
          <div className="space-y-2">
            <button
              onClick={clearLocalCaches}
              className="w-full rounded-2xl bg-subtle hover:bg-accent-soft text-ink text-[13px] font-bold text-left px-4 py-3 transition-colors"
            >
              Clear local caches
              <span className="block text-[11px] text-ink-muted font-medium">
                Removes cached skinify_* keys + in-memory avatar caches
              </span>
            </button>
            <button
              onClick={exportSnapshot}
              className="w-full rounded-2xl bg-subtle hover:bg-accent-soft text-ink text-[13px] font-bold text-left px-4 py-3 transition-colors"
            >
              Export data snapshot (JSON)
              <span className="block text-[11px] text-ink-muted font-medium">
                Table counts + last 200 transactions + last 100 tickets
              </span>
            </button>
            <button
              onClick={() => {
                addToast({ type: 'info', title: 'Reloading…' });
                setTimeout(() => window.location.reload(), 400);
              }}
              className="w-full rounded-2xl bg-subtle hover:bg-accent-soft text-ink text-[13px] font-bold text-left px-4 py-3 transition-colors"
            >
              Hard reload app
              <span className="block text-[11px] text-ink-muted font-medium">
                Re-fetches all chunks (post-deploy sanity check)
              </span>
            </button>
          </div>
        </motion.section>
      </div>

      {/* Environment / build report */}
      <motion.section
        variants={{ hidden: { opacity: 0, y: 12 }, shown: { opacity: 1, y: 0 } }}
        className="panel p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="label-eyebrow">Environment</span>
            <h3 className="text-[16px] font-bold tracking-tight mt-1 leading-none">
              Build & runtime
            </h3>
          </div>
          <button
            onClick={() => {
              const report = [
                `mode: ${import.meta.env.MODE}`,
                `supabase: ${String(import.meta.env.VITE_SUPABASE_URL || '').replace(/^https?:\/\//, '')}`,
                `ua: ${navigator.userAgent}`,
                `viewport: ${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio}x`,
                `language: ${navigator.language}`,
                `online: ${navigator.onLine}`,
                `time: ${new Date().toISOString()}`,
              ].join('\n');
              navigator.clipboard
                .writeText(report)
                .then(() => addToast({ type: 'success', title: 'Report copied' }))
                .catch(() => addToast({ type: 'error', title: 'Copy failed' }));
            }}
            className="h-9 px-4 rounded-full bg-subtle hover:bg-accent-soft text-ink text-[12px] font-bold transition-colors"
          >
            Copy report
          </button>
        </div>
        <div>
          {[
            ['Mode', import.meta.env.MODE],
            ['Supabase host', String(import.meta.env.VITE_SUPABASE_URL || '—').replace(/^https?:\/\//, '')],
            ['Viewport', `${window.innerWidth} × ${window.innerHeight} @ ${window.devicePixelRatio}x`],
            ['Language', navigator.language],
            ['Online', navigator.onLine ? 'Yes' : 'No'],
          ].map(([k, v]) => (
            <div key={String(k)} className="kv-row">
              <span className="kv-label">{k}</span>
              <span className="kv-value font-mono truncate">{String(v)}</span>
            </div>
          ))}
        </div>
      </motion.section>
    </motion.div>
  );
};

export const WithdrawalsTab: React.FC<{ addToast: any }> = ({ addToast }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  /* Import stores lazily so this file doesn't need a new top-level import. */
  const [adminSteamId, setAdminSteamId] = useState<string | null>(null);

  useEffect(() => {
    /* Pull the admin's steam id from authStore for the review call. */
    import('../../store/authStore').then(({ useAuthStore }) => {
      setAdminSteamId(useAuthStore.getState().user?.steamId || null);
    });
  }, []);

  /* Requests are listed via the withdraw-review function (service
     role) — the table's RLS blocks anon reads, and Steam-auth admins
     have no Supabase session, so a direct .from() came back empty. */
  useEffect(() => {
    if (adminSteamId) fetchRequests(adminSteamId);
  }, [adminSteamId]);

  const fetchRequests = async (steamId?: string | null) => {
    const sid = steamId ?? adminSteamId;
    if (!sid) return;
    setLoading(true);
    try {
      const { getSupabaseCredentials } = await import('../../utils/supabaseHelpers');
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      const res = await fetch(`${supabaseUrl}/functions/v1/withdraw-review`, {
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
          'x-admin-steam-id': sid,
        },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error?.message || `Server error (${res.status})`);
      }
      setRows(body?.data || []);
    } catch (err: any) {
      console.error('[admin/withdrawals] fetch failed:', err);
      addToast({
        type: 'error',
        title: 'Load failed',
        message: err?.message || 'Could not fetch withdrawal requests.',
      });
    } finally {
      setLoading(false);
    }
  };

  const review = async (id: number, action: 'approve' | 'reject', reason?: string) => {
    if (processing) return;
    if (!adminSteamId) {
      addToast({ type: 'error', title: 'Not signed in as admin' });
      return;
    }
    setProcessing(id);
    try {
      const { getSupabaseCredentials } = await import('../../utils/supabaseHelpers');
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      const res = await fetch(`${supabaseUrl}/functions/v1/withdraw-review`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
          'Content-Type': 'application/json',
          'x-admin-steam-id': adminSteamId,
        },
        body: JSON.stringify({ request_id: id, action, reason: reason || null }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error?.message || `Server error (${res.status})`);
      }
      addToast({
        type: 'success',
        title: action === 'approve' ? 'Approved' : 'Rejected',
        message: `Request #${id} ${action}d.`,
      });
      /* Refresh the list from the server so status counters update. */
      await fetchRequests();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Review failed',
        message: err?.message || 'Unknown error.',
      });
    } finally {
      setProcessing(null);
    }
  };

  const promptReject = (id: number) => {
    const reason = window.prompt('Reason for rejection (shown to the user):');
    if (!reason || !reason.trim()) return;
    review(id, 'reject', reason.trim());
  };

  const pending = rows.filter((r) => r.status === 'pending');
  const approved = rows.filter((r) => r.status === 'approved');
  const rejected = rows.filter((r) => r.status === 'rejected');
  const pendingAmount = pending.reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-ink-muted font-medium">
          Review and process pending withdrawal requests.
        </p>
        <button
          onClick={() => fetchRequests()}
          className="text-[13px] font-bold text-ink-muted hover:text-ink flex items-center gap-1.5"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="panel p-5">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">{pending.length}</div>
          <div className="text-ink-muted text-sm">Pending review</div>
        </div>
        <div className="panel p-5">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{approved.length}</div>
          <div className="text-ink-muted text-sm">Approved</div>
        </div>
        <div className="panel p-5">
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">{rejected.length}</div>
          <div className="text-ink-muted text-sm">Rejected</div>
        </div>
        <div className="panel p-5">
          <div className="text-2xl font-bold text-ink tabular-nums">
            {pendingAmount.toLocaleString('cs-CZ')} Kč
          </div>
          <div className="text-ink-muted text-sm">Pending amount</div>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-line/50 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-line bg-surface/70">
              <th className="text-left py-3 px-4 text-ink-muted text-xs uppercase tracking-wider">User</th>
              <th className="text-left py-3 px-4 text-ink-muted text-xs uppercase tracking-wider">Amount</th>
              <th className="text-left py-3 px-4 text-ink-muted text-xs uppercase tracking-wider">Net</th>
              <th className="text-left py-3 px-4 text-ink-muted text-xs uppercase tracking-wider">Method</th>
              <th className="text-left py-3 px-4 text-ink-muted text-xs uppercase tracking-wider">Payout details</th>
              <th className="text-left py-3 px-4 text-ink-muted text-xs uppercase tracking-wider">Status</th>
              <th className="text-right py-3 px-4 text-ink-muted text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-ink-muted">Loading…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-ink-muted">
                  No withdrawal requests yet.
                </td>
              </tr>
            ) : (
              rows.map((w) => (
                <tr key={w.id} className="border-b border-line/50 hover:bg-subtle/20">
                  <td className="py-3 px-4">
                    <div className="text-ink text-sm">{w.users?.display_name || 'Unknown'}</div>
                    <div className="text-ink-dim text-xs font-mono">{w.user_steam_id}</div>
                  </td>
                  <td className="py-3 px-4 text-ink font-semibold tabular-nums">
                    {Number(w.amount || 0).toLocaleString('cs-CZ')} Kč
                  </td>
                  <td className="py-3 px-4 text-ink-muted tabular-nums">
                    {Number(w.net_amount || 0).toLocaleString('cs-CZ')} Kč
                  </td>
                  <td className="py-3 px-4 text-ink-muted text-sm">{w.method}</td>
                  <td className="py-3 px-4 text-ink-muted text-xs">
                    <code className="text-[10px] whitespace-pre-wrap">
                      {JSON.stringify(w.payout_details || {})}
                    </code>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        w.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : w.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {w.status}
                    </span>
                    {w.reason && (
                      <div className="text-xs text-ink-dim mt-1 max-w-[200px] truncate" title={w.reason}>
                        {w.reason}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {w.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => review(w.id, 'approve')}
                          disabled={processing === w.id}
                          className="text-emerald-600 dark:text-emerald-400 hover:text-green-300 px-3 py-1 rounded bg-green-500/10 hover:bg-emerald-500/10 text-sm disabled:opacity-50"
                        >
                          {processing === w.id ? '…' : 'Approve'}
                        </button>
                        <button
                          onClick={() => promptReject(w.id)}
                          disabled={processing === w.id}
                          className="text-rose-600 dark:text-rose-400 hover:text-red-300 px-3 py-1 rounded bg-red-500/10 hover:bg-rose-500/10 text-sm disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export const MonitoringTab: React.FC<{ addToast: any }> = ({ addToast }) => {
  const [activeUsers, setActiveUsers] = useState(0);
  const [txPerMin, setTxPerMin] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const [activeListings, setActiveListings] = useState(0);
  const [probes, setProbes] = useState<{ t: string; db: number; fn: number }[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [liveFeed, setLiveFeed] = useState<any[]>([]);

  const fetchMonitoringData = async () => {
    if (!supabase) return;
    try {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      /* DB probe — time a cheap head-count query. */
      const dbStart = performance.now();
      const usersData = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_login', fiveMinAgo);
      const dbMs = Math.round(performance.now() - dbStart);

      /* Edge-function probe — OPTIONS round-trip. */
      let fnMs = -1;
      try {
        const fnStart = performance.now();
        await fetch(`${supabaseUrl}/functions/v1/orders`, { method: 'OPTIONS' });
        fnMs = Math.round(performance.now() - fnStart);
      } catch {
        fnMs = -1;
      }

      const [txData, ticketsData, withdrawalsData, listingsData, feedData] = await Promise.all([
        supabase
          .from('user_transactions')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', fiveMinAgo),
        supabase
          .from('support_tickets')
          .select('*', { count: 'exact', head: true })
          .in('status', ['open', 'in_progress']),
        supabase
          .from('user_transactions')
          .select('*', { count: 'exact', head: true })
          .eq('type', 'withdrawal')
          .eq('status', 'pending'),
        supabase
          .from('marketplace_listings')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),
        supabase
          .from('user_transactions')
          .select('id, type, status, amount, created_at')
          .order('created_at', { ascending: false })
          .limit(8),
      ]);

      setLiveFeed(feedData.data || []);
      setActiveUsers(usersData.count || 0);
      setTxPerMin(Number(((txData.count || 0) / 5).toFixed(1)));
      setOpenTickets(ticketsData.count || 0);
      setPendingWithdrawals(withdrawalsData.count || 0);
      setActiveListings(listingsData.count || 0);
      setProbes((prev) =>
        [
          ...prev,
          {
            t: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            db: dbMs,
            fn: fnMs,
          },
        ].slice(-20),
      );
      setLastRefresh(new Date());
    } catch (error) {
      console.error('[monitoring] fetch failed:', error);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 10_000);
    return () => clearInterval(interval);
  }, []);

  const latest = probes[probes.length - 1];
  const okProbes = probes.filter((pr) => pr.db < 1500 && pr.fn >= 0 && pr.fn < 2500).length;
  const uptimePct = probes.length > 0 ? Math.round((okProbes / probes.length) * 100) : 100;
  const dbHealthy = latest ? latest.db < 1500 : true;
  const fnHealthy = latest ? latest.fn >= 0 && latest.fn < 2500 : true;
  const maxProbe = Math.max(60, ...probes.flatMap((pr) => [pr.db, Math.max(0, pr.fn)]));

  const stats = [
    { label: 'Active users', value: activeUsers, sub: 'Online in last 5 min', tone: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Transactions / min', value: txPerMin, sub: 'Average over 5 min', tone: 'text-accent' },
    { label: 'Open tickets', value: openTickets, sub: 'Open + in progress', tone: openTickets > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-ink' },
    { label: 'Pending withdrawals', value: pendingWithdrawals, sub: 'Awaiting review', tone: pendingWithdrawals > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-ink' },
    { label: 'Active listings', value: activeListings, sub: 'Live on the market', tone: 'text-ink' },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="shown"
      variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.05 } } }}
      className="space-y-4"
    >
      {/* Service health */}
      <motion.section
        variants={{ hidden: { opacity: 0, y: 14 }, shown: { opacity: 1, y: 0 } }}
        className="panel p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="label-eyebrow">Live health</span>
            <h3 className="text-[16px] font-bold tracking-tight mt-1 leading-none">
              Service status
            </h3>
          </div>
          <span className="text-[11px] text-ink-dim font-medium tabular-nums">
            {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : 'Loading…'} · every 10s ·{' '}
            <span className={uptimePct >= 99 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-amber-600 dark:text-amber-400 font-bold'}>
              {uptimePct}% uptime
            </span>
          </span>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { name: 'Database', ok: dbHealthy, ms: latest?.db },
            { name: 'Edge functions', ok: fnHealthy, ms: latest && latest.fn >= 0 ? latest.fn : undefined },
          ].map((svc) => (
            <div key={svc.name} className="rounded-2xl bg-subtle p-4 flex items-center gap-3">
              <motion.span
                animate={{ scale: [1, 1.35, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${svc.ok ? 'bg-emerald-500' : 'bg-rose-500'}`}
              />
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-bold text-ink tracking-tight">{svc.name}</div>
                <div className="text-[11.5px] text-ink-muted font-medium">
                  {svc.ok ? 'Operational' : 'Degraded'}
                </div>
              </div>
              <div className="text-[14px] font-bold tabular-nums text-ink shrink-0">
                {svc.ms != null ? `${svc.ms} ms` : '—'}
              </div>
            </div>
          ))}
        </div>

        {/* Latency sparkline — bars animate in as probes arrive. */}
        {probes.length > 1 && (
          <div className="mt-5">
            <div className="label-meta mb-2">Latency (last {probes.length} probes)</div>
            <div className="flex items-end gap-1 h-16">
              {probes.map((pr, i) => (
                <motion.div
                  key={`${pr.t}-${i}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(8, (pr.db / maxProbe) * 100)}%` }}
                  transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                  className="flex-1 rounded-t bg-accent/70"
                  title={`${pr.t} · db ${pr.db}ms · fn ${pr.fn >= 0 ? pr.fn + 'ms' : 'n/a'}`}
                />
              ))}
            </div>
          </div>
        )}
      </motion.section>

      {/* Live counters */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {stats.map((s) => (
          <motion.div
            key={s.label}
            variants={{ hidden: { opacity: 0, y: 14 }, shown: { opacity: 1, y: 0 } }}
            whileHover={{ y: -2 }}
            className="panel p-5"
          >
            <motion.div
              key={String(s.value)}
              initial={{ scale: 1.15, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 24 }}
              className={`text-[24px] font-bold tracking-tight tabular-nums leading-none ${s.tone}`}
            >
              {s.value}
            </motion.div>
            <div className="label-meta mt-2">{s.label}</div>
            <div className="text-[11px] text-ink-dim font-medium mt-1">{s.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Live transaction feed */}
      <motion.section
        variants={{ hidden: { opacity: 0, y: 14 }, shown: { opacity: 1, y: 0 } }}
        className="panel p-6"
      >
        <span className="label-eyebrow">Live feed</span>
        <h3 className="text-[16px] font-bold tracking-tight mt-1 leading-none mb-4">
          Latest transactions
        </h3>
        {liveFeed.length === 0 ? (
          <p className="text-[13px] text-ink-muted font-medium py-6 text-center">
            No transactions yet.
          </p>
        ) : (
          <div className="space-y-0.5">
            {liveFeed.map((tx, i) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30, delay: Math.min(i * 0.04, 0.3) }}
                className="flex items-center gap-3 py-2"
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    tx.status === 'completed'
                      ? 'bg-emerald-500'
                      : tx.status === 'pending'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                />
                <span className="text-[12.5px] font-bold text-ink capitalize w-24 shrink-0">
                  {tx.type}
                </span>
                <span className="text-[12.5px] font-bold text-ink tabular-nums shrink-0">
                  {Number(tx.amount || 0).toLocaleString()} Kč
                </span>
                <span className="flex-1 text-[11.5px] text-ink-muted font-medium capitalize truncate">
                  {String(tx.status || '').replace('_', ' ')}
                </span>
                <span className="text-[11px] text-ink-dim font-medium tabular-nums shrink-0">
                  {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </motion.section>
    </motion.div>
  );
};
