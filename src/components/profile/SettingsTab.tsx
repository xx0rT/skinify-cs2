import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  Monitor,
  Moon,
  Palette,
  Save,
  Sun,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { useTheme } from '../../theme/ThemeProvider';
import { useCurrencyStore, currencies } from '../../store/currencyStore';
import { palettes, PaletteId } from '../../theme/palettes';
import { spring, tap } from '../../lib/motion';

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
  const { mode, setMode, palette, setPalette, resolvedMode } = useTheme();
  const { selectedCurrency, setSelectedCurrency, isAutoDetected } = useCurrencyStore();

  const [tradeLink, setTradeLink] = useState(user?.tradeLink || '');
  const [savingTrade, setSavingTrade] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const [notif, setNotif] = useState({
    saleAlert: true,
    priceDrop: true,
    tradeOffer: true,
    weeklyDigest: false,
  });

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
          <div className="flex items-center justify-between mb-3">
            <div className="label-eyebrow">Display currency</div>
            {isAutoDetected && (
              <span className="pill bg-accent-soft text-accent inline-flex items-center gap-1">
                <Globe size={10} strokeWidth={2.6} />
                Auto-detected
              </span>
            )}
          </div>
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
