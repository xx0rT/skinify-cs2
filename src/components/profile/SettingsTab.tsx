import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Check,
  Copy,
  ExternalLink,
  Key,
  Lock,
  Monitor,
  Moon,
  Palette,
  Plus,
  Save,
  Shield,
  Sun,
  Trash2,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { useBalanceStore } from '../../store/balanceStore';
import { useTheme } from '../../theme/ThemeProvider';
import { useCurrencyStore, currencies } from '../../store/currencyStore';
import { palettes, PaletteId } from '../../theme/palettes';
import { spring, tap } from '../../lib/motion';
import { openDepositModal } from '../DepositModal';

/* $10 USD in CZK — this is the verification threshold for issuing an
   API key. We pin against USD (not CZK) because the marketing message
   in the docs talks in dollars; converting at render time would jitter
   the threshold whenever the FX rate changes. The rate below mirrors
   the currencyStore default for USD and gets updated alongside it. */
const VERIFICATION_USD_THRESHOLD = 10;
const USD_TO_CZK = 1 / 0.0426; // ≈ 23.47 — matches currencyStore.USD rate
const VERIFICATION_CZK_THRESHOLD = VERIFICATION_USD_THRESHOLD * USD_TO_CZK;

interface ApiKey {
  id: string;
  name: string;
  /* Always masked once stored — we only ever show the full key
     ONCE at creation time. After that the UI shows sk_live_…last4. */
  masked: string;
  createdAt: string;
  lastUsedAt?: string;
}

/* Local-storage backed list of API keys. The real backend would store
   only a hash + the last 4 chars; this client-side version keeps the
   masked display string and a fake last-used timestamp so the UI is
   complete while the backend endpoint is being wired. When the edge
   function ships, swap this for a Supabase-backed list — no UI changes
   needed. */
const KEYS_STORAGE_KEY = 'skinify-api-keys';

function loadKeys(): ApiKey[] {
  try {
    const raw = localStorage.getItem(KEYS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ApiKey[]) : [];
  } catch {
    return [];
  }
}
function saveKeys(keys: ApiKey[]) {
  try {
    localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(keys));
  } catch {
    /* private mode — fall through */
  }
}

/* Generate a key in the canonical sk_live_<48 hex> shape. Uses
   crypto.getRandomValues for entropy; falls back to Math.random in
   environments without it (only legacy / sandboxed browsers). */
function generateKey(): string {
  const bytes = new Uint8Array(24);
  try {
    crypto.getRandomValues(bytes);
  } catch {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `sk_live_${hex}`;
}

function maskKey(key: string): string {
  const last4 = key.slice(-4);
  return `sk_live_${'•'.repeat(24)}${last4}`;
}

/**
 * SettingsTab — fills the Profile → Settings tab content.
 *
 * Sections:
 *   - Steam identity (read-only, copy-able)
 *   - Trade URL editor (real save via authStore.updateTradeLink)
 *   - Appearance (theme mode + accent palette via ThemeProvider)
 *   - Notification stubs (UI-only until backend wired)
 *   - Danger zone (sign out, account deletion stub)
 */

const SettingsTab: React.FC = () => {
  const { user, logout, updateTradeLink } = useAuthStore();
  const { addToast } = useToastStore();
  const { totalDeposited } = useBalanceStore();
  const { mode, setMode, palette, setPalette, resolvedMode } = useTheme();
  const { selectedCurrency, setSelectedCurrency } = useCurrencyStore();
  const [searchParams] = useSearchParams();
  const apiSectionRef = useRef<HTMLDivElement | null>(null);

  const [tradeLink, setTradeLink] = useState(user?.tradeLink || '');
  const [savingTrade, setSavingTrade] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const [notif, setNotif] = useState({
    saleAlert: true,
    priceDrop: true,
    tradeOffer: true,
    weeklyDigest: false,
  });

  /* API keys local state. We seed from localStorage so a refresh keeps
     the list visible (until the real backend ships). */
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(() => loadKeys());
  const [newKeyName, setNewKeyName] = useState('');
  const [justCreated, setJustCreated] = useState<{ id: string; key: string } | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  /* Verification gate. The UI shows the section either way, but
     creation is disabled (with a clear CTA to deposit) when the user
     hasn't crossed the threshold. */
  const isVerified = totalDeposited >= VERIFICATION_CZK_THRESHOLD;
  const remainingCzk = Math.max(0, VERIFICATION_CZK_THRESHOLD - totalDeposited);

  /* Land on the API section if the URL has ?sub=api (this is the link
     the docs use everywhere). Smooth-scrolls into view once the
     section ref is mounted. */
  useEffect(() => {
    if (searchParams.get('sub') === 'api' && apiSectionRef.current) {
      requestAnimationFrame(() => {
        apiSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [searchParams]);

  const handleCreateKey = () => {
    if (!isVerified) {
      addToast({
        type: 'warning',
        title: 'Verification required',
        message: 'Deposit at least $10 to verify your account before creating API keys.',
        duration: 5000,
      });
      return;
    }
    if (apiKeys.length >= 5) {
      addToast({
        type: 'warning',
        title: 'Key limit reached',
        message: 'You can have up to 5 active keys. Revoke an unused one first.',
      });
      return;
    }
    const fullKey = generateKey();
    const newKey: ApiKey = {
      id: `key_${Date.now()}`,
      name: newKeyName.trim() || `Key ${apiKeys.length + 1}`,
      masked: maskKey(fullKey),
      createdAt: new Date().toISOString(),
    };
    const next = [newKey, ...apiKeys];
    setApiKeys(next);
    saveKeys(next);
    setJustCreated({ id: newKey.id, key: fullKey });
    setNewKeyName('');
    addToast({
      type: 'success',
      title: 'API key created',
      message: 'Copy it now — you won\'t see the full value again.',
      duration: 6000,
    });
  };

  const handleRevokeKey = (id: string) => {
    if (!confirm('Revoke this key? Any app using it will start getting 401s immediately.')) {
      return;
    }
    const next = apiKeys.filter((k) => k.id !== id);
    setApiKeys(next);
    saveKeys(next);
    if (justCreated?.id === id) setJustCreated(null);
    addToast({ type: 'success', title: 'Key revoked' });
  };

  const handleCopyKey = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKeyId(id);
      setTimeout(() => setCopiedKeyId(null), 1500);
    } catch {
      addToast({ type: 'error', title: 'Copy failed' });
    }
  };

  const handleCopyId = async () => {
    if (!user?.steamId) return;
    try {
      await navigator.clipboard.writeText(user.steamId);
      setCopiedId(true);
      addToast({ type: 'success', title: 'Steam ID copied' });
      setTimeout(() => setCopiedId(false), 1500);
    } catch {
      addToast({ type: 'error', title: 'Copy failed' });
    }
  };

  const handleSaveTradeLink = async () => {
    const link = tradeLink.trim();
    if (!link) {
      addToast({ type: 'warning', title: 'Empty link', message: 'Paste your Steam trade URL.' });
      return;
    }
    // Sanity: Steam trade URLs look like
    // https://steamcommunity.com/tradeoffer/new/?partner=...&token=...
    if (!/^https?:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+&token=\w+/i.test(link)) {
      addToast({
        type: 'warning',
        title: 'Doesn’t look like a trade URL',
        message: 'Should look like steamcommunity.com/tradeoffer/new/?partner=…&token=…',
        duration: 5000,
      });
      return;
    }
    setSavingTrade(true);
    try {
      const ok = await updateTradeLink(link);
      addToast(
        ok
          ? { type: 'success', title: 'Trade link saved' }
          : { type: 'error', title: 'Save failed', message: 'Could not update your trade link.' },
      );
    } finally {
      setSavingTrade(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-4">
      {/* ───── Identity ──────────────────────────────────────── */}
      <Section title="Steam identity" subtitle="Your Skinify account is tied to this Steam profile.">
        <Row label="Display name" value={user.displayName} />
        <Row
          label="Steam ID"
          value={
            <span className="flex items-center gap-2 font-mono text-[12.5px] select-text">
              {user.steamId}
              <button
                onClick={handleCopyId}
                className="icon-chip-sm hover:bg-bg transition-colors"
                aria-label="Copy Steam ID"
              >
                {copiedId ? (
                  <Check size={13} strokeWidth={2.4} className="text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy size={13} strokeWidth={2.2} className="text-ink-muted" />
                )}
              </button>
            </span>
          }
        />
        <Row
          label="Profile"
          value={
            <a
              href={`https://steamcommunity.com/profiles/${user.steamId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent hover:opacity-80 transition-opacity"
            >
              Open on Steam
              <ExternalLink size={12} strokeWidth={2.2} />
            </a>
          }
        />
      </Section>

      {/* ───── Trade URL ─────────────────────────────────────── */}
      <Section
        title="Steam trade URL"
        subtitle="We need this to send you skins after a successful trade."
      >
        <div>
          <input
            type="url"
            value={tradeLink}
            onChange={(e) => setTradeLink(e.target.value)}
            placeholder="https://steamcommunity.com/tradeoffer/new/?partner=…&token=…"
            className="w-full h-12 px-4 rounded-2xl bg-subtle text-ink text-[13.5px] font-medium outline-none focus:bg-bg focus:ring-2 focus:ring-accent/30 transition-all placeholder:text-ink-dim"
          />
          <p className="text-[11.5px] text-ink-dim font-medium mt-2">
            Find your URL at{' '}
            <a
              href="https://steamcommunity.com/my/tradeoffers/privacy"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:opacity-80 transition-opacity font-semibold"
            >
              Steam → Inventory Privacy
            </a>
            .
          </p>
        </div>
        <div className="flex justify-end mt-3">
          <motion.button
            whileTap={tap}
            whileHover={{ scale: 1.02 }}
            onClick={handleSaveTradeLink}
            disabled={savingTrade}
            className="h-11 px-5 rounded-full bg-accent text-on-accent font-bold text-[13.5px] flex items-center gap-2 disabled:opacity-60"
            style={{ boxShadow: '0 8px 20px -10px rgb(var(--accent) / 0.6)' }}
          >
            <Save size={14} strokeWidth={2.4} />
            {savingTrade ? 'Saving…' : 'Save trade URL'}
          </motion.button>
        </div>
      </Section>

      {/* ───── Appearance ────────────────────────────────────── */}
      <Section title="Appearance" subtitle="How Skinify looks on your devices.">
        <div>
          <div className="label-eyebrow mb-2.5">Theme</div>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'light', label: 'Light', Icon: Sun },
                { id: 'dark',  label: 'Dark',  Icon: Moon },
                { id: 'auto',  label: 'System', Icon: Monitor },
              ] as const
            ).map(({ id, label, Icon }) => {
              const active = mode === id;
              return (
                <motion.button
                  whileTap={tap}
                  key={id}
                  onClick={() => setMode(id)}
                  className={`relative h-12 rounded-2xl px-3 flex items-center justify-center gap-2 text-[13px] font-semibold transition-colors ${
                    active
                      ? 'bg-accent text-on-accent'
                      : 'bg-subtle text-ink-muted hover:bg-bg hover:text-ink'
                  }`}
                >
                  <Icon size={15} strokeWidth={active ? 2.4 : 2.2} />
                  {label}
                </motion.button>
              );
            })}
          </div>
          <p className="text-[11.5px] text-ink-dim font-medium mt-2">
            Currently displaying: <span className="font-bold text-ink">{resolvedMode}</span>
          </p>
        </div>

        <div className="mt-5">
          <div className="label-eyebrow mb-2.5">Accent color</div>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {palettes.map((p) => {
              const active = palette === p.id;
              const swatch =
                resolvedMode === 'dark'
                  ? `rgb(${p.dark.accent})`
                  : `rgb(${p.light.accent})`;
              return (
                <motion.button
                  whileTap={tap}
                  key={p.id}
                  onClick={() => setPalette(p.id as PaletteId)}
                  aria-label={p.name}
                  className={`relative h-12 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all ${
                    active
                      ? 'bg-subtle ring-2 ring-offset-2 ring-offset-surface'
                      : 'bg-subtle hover:bg-bg'
                  }`}
                  style={active ? { ['--tw-ring-color' as any]: swatch } : undefined}
                  title={p.name}
                >
                  <span
                    className="w-5 h-5 rounded-full"
                    style={{ background: swatch }}
                  />
                </motion.button>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ───── Currency ──────────────────────────────────────── */}
      <Section
        title="Currency"
        subtitle="All prices on Skinify will display in your selected currency."
      >
        <div>
          <div className="label-eyebrow mb-3">Display currency</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {currencies.map((c) => {
              const active = selectedCurrency.code === c.code;
              return (
                <motion.button
                  whileTap={tap}
                  key={c.code}
                  onClick={() => {
                    setSelectedCurrency(c);
                    addToast({
                      type: 'success',
                      title: `Currency · ${c.code}`,
                      message: `Prices now shown in ${c.name}.`,
                    });
                  }}
                  className={`relative h-14 rounded-2xl px-3 flex items-center justify-between gap-2 transition-colors ${
                    active
                      ? 'bg-accent text-on-accent'
                      : 'bg-subtle text-ink-muted hover:bg-bg hover:text-ink'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-8 h-8 rounded-xl grid place-items-center text-[13px] font-bold ${
                        active ? 'bg-white/20' : 'bg-bg/40'
                      }`}
                    >
                      {c.symbol}
                    </span>
                    <div className="text-left min-w-0">
                      <div className="text-[12.5px] font-bold leading-none">{c.code}</div>
                      <div
                        className={`text-[10.5px] mt-0.5 font-medium truncate ${
                          active ? 'text-on-accent/80' : 'text-ink-dim'
                        }`}
                      >
                        {c.name}
                      </div>
                    </div>
                  </div>
                  {active && <Check size={14} strokeWidth={2.6} className="shrink-0" />}
                </motion.button>
              );
            })}
          </div>
          <p className="text-[11.5px] text-ink-dim font-medium mt-3">
            Conversion uses fixed rates from CZK · refreshed weekly. Item sellers always price in CZK; we just translate the display for you.
          </p>
        </div>
      </Section>

      {/* ───── Notifications ─────────────────────────────────── */}
      <Section title="Notifications" subtitle="Choose what we ping you about.">
        <div className="space-y-1">
          <Toggle
            label="Item sold"
            sub="A buyer purchased one of your listings"
            checked={notif.saleAlert}
            onChange={(v) => setNotif((s) => ({ ...s, saleAlert: v }))}
          />
          <Toggle
            label="Price drop on wishlist"
            sub="Something you're watching dropped 10%+"
            checked={notif.priceDrop}
            onChange={(v) => setNotif((s) => ({ ...s, priceDrop: v }))}
          />
          <Toggle
            label="Trade offer received"
            sub="A buyer accepted a trade you need to send"
            checked={notif.tradeOffer}
            onChange={(v) => setNotif((s) => ({ ...s, tradeOffer: v }))}
          />
          <Toggle
            label="Weekly summary"
            sub="Earnings, listings, and market trends digest"
            checked={notif.weeklyDigest}
            onChange={(v) => setNotif((s) => ({ ...s, weeklyDigest: v }))}
          />
        </div>
        <p className="text-[11.5px] text-ink-dim font-medium mt-3">
          Notification preferences are stored locally for now — server sync is coming with the
          push-notifications backend.
        </p>
      </Section>

      {/* ───── API access ────────────────────────────────────────
          Lands here from /docs/* via ?sub=api. Verification gate:
          must have deposited at least $10 lifetime before keys can
          be generated — keeps spam abuse off the public tier. */}
      <div ref={apiSectionRef} className="scroll-mt-24">
        <Section
          title="API access"
          subtitle="Create keys to call the Skinify public API with the 600 rpm authenticated tier."
        >
          {/* Verification card */}
          <div
            className={`rounded-2xl p-4 mb-4 flex items-start gap-3 ${
              isVerified
                ? 'bg-emerald-500/10'
                : 'bg-amber-500/10'
            }`}
            style={{
              boxShadow: `inset 0 0 0 1px ${
                isVerified ? 'rgb(16 185 129 / 0.35)' : 'rgb(245 158 11 / 0.35)'
              }`,
            }}
          >
            <span
              className="mt-0.5 shrink-0"
              style={{ color: isVerified ? 'rgb(5 150 105)' : 'rgb(217 119 6)' }}
            >
              {isVerified ? <Shield size={16} strokeWidth={2.4} /> : <Lock size={16} strokeWidth={2.4} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold text-ink leading-tight">
                {isVerified
                  ? 'Verified account · API keys unlocked'
                  : 'Verification required'}
              </div>
              <p className="text-[12px] text-ink-muted font-medium mt-1 leading-relaxed">
                {isVerified
                  ? `You've deposited at least $${VERIFICATION_USD_THRESHOLD}. Generate up to 5 active keys below.`
                  : `Deposit at least $${VERIFICATION_USD_THRESHOLD} to verify your account and unlock API key creation. This keeps spam abuse off the free tier.`}
              </p>
              {!isVerified && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <motion.button
                    whileTap={tap}
                    onClick={openDepositModal}
                    className="h-9 px-3.5 rounded-full bg-accent text-on-accent text-[12.5px] font-bold inline-flex items-center gap-1.5"
                  >
                    <Plus size={13} strokeWidth={2.6} />
                    Deposit now
                  </motion.button>
                  <span className="text-[11.5px] text-ink-dim font-semibold tabular-nums">
                    {remainingCzk > 0
                      ? `${Math.ceil(remainingCzk).toLocaleString('cs-CZ')} CZK still needed`
                      : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Create-key row */}
          <div className="rounded-2xl bg-subtle/60 p-3 mb-4 flex flex-col sm:flex-row sm:items-center gap-2">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key label (e.g. 'price-ticker bot')"
              disabled={!isVerified}
              className="flex-1 h-10 px-3.5 rounded-full bg-bg text-[13px] font-medium text-ink placeholder:text-ink-muted outline-none focus:ring-2 ring-accent/30 disabled:opacity-50"
            />
            <motion.button
              whileTap={tap}
              onClick={handleCreateKey}
              disabled={!isVerified}
              className="h-10 px-4 rounded-full bg-accent text-on-accent text-[12.5px] font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Key size={13} strokeWidth={2.4} />
              Create API key
            </motion.button>
          </div>

          {/* Just-created reveal — the ONLY time we ever show the full
              secret. Disappears on dismiss / navigate away. */}
          {justCreated && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, mass: 0.6 }}
              className="rounded-2xl p-4 mb-4"
              style={{
                background: 'rgb(var(--accent) / 0.08)',
                boxShadow: 'inset 0 0 0 1px rgb(var(--accent) / 0.35)',
              }}
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-accent mb-1.5">
                New key — copy now, you won't see this again
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 min-w-0 text-[12px] font-mono text-ink bg-bg rounded-xl px-3 py-2 overflow-x-auto whitespace-nowrap select-all">
                  {justCreated.key}
                </code>
                <button
                  onClick={() => handleCopyKey(justCreated.id, justCreated.key)}
                  className="icon-chip-sm hover:bg-bg shrink-0"
                  aria-label="Copy key"
                >
                  {copiedKeyId === justCreated.id ? (
                    <Check size={13} strokeWidth={2.4} className="text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy size={13} strokeWidth={2.2} className="text-ink-muted" />
                  )}
                </button>
                <button
                  onClick={() => setJustCreated(null)}
                  className="text-[11px] font-bold text-ink-muted hover:text-ink transition-colors shrink-0 px-2"
                >
                  Done
                </button>
              </div>
            </motion.div>
          )}

          {/* Existing keys list */}
          {apiKeys.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-6 text-center">
              <p className="text-[13px] text-ink-muted font-medium">
                {isVerified
                  ? 'No API keys yet. Create one above to start calling the public API at the 600 rpm tier.'
                  : 'Once you verify your account, create up to 5 keys here.'}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {apiKeys.map((k) => (
                <li
                  key={k.id}
                  className="rounded-2xl bg-subtle/40 p-3 flex flex-wrap items-center gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-ink truncate">{k.name}</div>
                    <code className="text-[11.5px] font-mono text-ink-muted block truncate">
                      {k.masked}
                    </code>
                    <div className="text-[10.5px] text-ink-dim font-medium mt-0.5">
                      Created {new Date(k.createdAt).toLocaleDateString()}
                      {k.lastUsedAt ? ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : ' · Never used'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevokeKey(k.id)}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[12px] font-bold transition-colors"
                  >
                    <Trash2 size={12} strokeWidth={2.4} />
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="text-[11.5px] text-ink-dim font-medium mt-4 leading-relaxed">
            Read the{' '}
            <Link to="/docs/authentication" className="text-accent hover:underline">
              authentication docs
            </Link>{' '}
            for usage, or jump straight to the{' '}
            <Link to="/docs/quickstart" className="text-accent hover:underline">
              quickstart
            </Link>
            .
          </p>
        </Section>
      </div>

      {/* ───── Danger zone ───────────────────────────────────── */}
      <Section title="Account" titleTone="danger">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              logout();
              addToast({ type: 'info', title: 'Signed out' });
            }}
            className="h-11 px-5 rounded-full bg-subtle hover:bg-bg text-ink font-semibold text-[13px] transition-colors"
          >
            Sign out
          </button>
          <button
            onClick={() =>
              addToast({
                type: 'info',
                title: 'Account deletion',
                message: 'Email support@skinify.gg with the subject "Delete account" to start the process.',
                duration: 6000,
              })
            }
            className="h-11 px-5 rounded-full bg-rose-500/10 hover:bg-rose-500/15 text-rose-700 dark:text-rose-300 font-semibold text-[13px] transition-colors"
          >
            Delete account
          </button>
        </div>
      </Section>
    </div>
  );
};

/* ───── Helpers ───────────────────────────────────────────── */

const Section: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  titleTone?: 'danger';
}> = ({ title, subtitle, children, titleTone }) => (
  <div className="card p-5 md:p-6">
    <div className="mb-4">
      <h2
        className={`text-[17px] font-bold tracking-tight leading-none ${
          titleTone === 'danger' ? 'text-rose-700 dark:text-rose-300' : 'text-ink'
        }`}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="text-[12.5px] text-ink-muted font-medium mt-1.5">{subtitle}</p>
      )}
    </div>
    {children}
  </div>
);

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 py-2.5 border-b border-line last:border-b-0">
    <div className="text-[13px] text-ink-muted font-medium">{label}</div>
    <div className="text-[13px] text-ink font-semibold text-right min-w-0">{value}</div>
  </div>
);

const Toggle: React.FC<{
  label: string;
  sub?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, sub, checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-subtle transition-colors text-left"
  >
    <div className="flex-1 min-w-0">
      <div className="text-[13.5px] font-bold text-ink tracking-tight">{label}</div>
      {sub && <div className="text-[12px] text-ink-muted font-medium mt-0.5">{sub}</div>}
    </div>
    <motion.span
      className={`relative h-6 w-10 rounded-full transition-colors shrink-0 ${
        checked ? 'bg-accent' : 'bg-subtle'
      }`}
    >
      <motion.span
        animate={{ x: checked ? 16 : 0 }}
        transition={spring}
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-surface shadow-sm"
      />
    </motion.span>
  </button>
);

export default SettingsTab;
