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
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Monitor as MonitorIcon, MapPin } from 'lucide-react';
import { listDevices, revokeDevice, isCurrentDevice, DeviceRow } from '../../utils/twoFactor';
import KycVerification from './KycVerification';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { useBalanceStore } from '../../store/balanceStore';
import { useTheme } from '../../theme/ThemeProvider';
import { useCurrencyStore, currencies } from '../../store/currencyStore';
import { palettes, PaletteId } from '../../theme/palettes';
import { spring, tap } from '../../lib/motion';
import { openDepositModal } from '../DepositModal';
import { UI_SCALE_MIN, UI_SCALE_MAX, UI_SCALE_STEP, UiScale, getUiScale, setUiScale } from '../../utils/uiScale';

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

/* The edge function ships full-key creation, masked listing, and
   soft-revoke. We hit it via the standard Supabase function URL pattern.
   `supabaseUrl` + the user's access token from authStore both come
   from existing helpers — no new infra. */
import { supabase } from '../../lib/supabaseClient';
import { getSupabaseCredentials } from '../../utils/supabaseHelpers';

/* Server response shape from /functions/v1/api-keys (GET list). */
interface ServerKeyRow {
  id: string;
  name: string;
  masked: string;
  is_active: boolean;
  created_at: string;
  last_used_at?: string | null;
}

/* Auth headers for the api-keys function: Supabase JWT when the user
   has an email session, otherwise anon key + X-Steam-Id (Steam-OpenID
   accounts never hold a Supabase Auth session). */
async function apiKeyAuthHeaders(): Promise<Record<string, string>> {
  const { supabaseKey } = getSupabaseCredentials();
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }
  const steamId = useAuthStore.getState().user?.steamId;
  if (steamId) {
    return { Authorization: `Bearer ${supabaseKey}`, 'X-Steam-Id': steamId };
  }
  throw new Error('Not signed in');
}

async function fetchKeys(): Promise<ApiKey[]> {
  const { supabaseUrl } = getSupabaseCredentials();
  const headers = await apiKeyAuthHeaders();
  const res = await fetch(`${supabaseUrl}/functions/v1/api-keys`, { headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error?.message || `Server error (${res.status})`);
  }
  const rows: ServerKeyRow[] = body?.data || [];
  /* Only surface active keys in the UI. Revoked ones stay in the
     audit trail server-side. */
  return rows
    .filter((r) => r.is_active)
    .map((r) => ({
      id: r.id,
      name: r.name,
      masked: r.masked,
      createdAt: r.created_at,
      lastUsedAt: r.last_used_at || undefined,
    }));
}

interface CreatedKey {
  id: string;
  name: string;
  /* Full plaintext value — only returned on creation. */
  key: string;
  masked: string;
}

async function createKey(name: string): Promise<CreatedKey> {
  const { supabaseUrl } = getSupabaseCredentials();
  const headers = await apiKeyAuthHeaders();
  const res = await fetch(`${supabaseUrl}/functions/v1/api-keys`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    /* Surface the server's structured error so the verification
       message / key-limit message read clearly. */
    throw new Error(body?.error?.message || `Server error (${res.status})`);
  }
  return body.data as CreatedKey;
}

async function revokeKey(id: string): Promise<void> {
  const { supabaseUrl } = getSupabaseCredentials();
  const headers = await apiKeyAuthHeaders();
  const res = await fetch(`${supabaseUrl}/functions/v1/api-keys/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Server error (${res.status})`);
  }
}

/* ───── Two-factor (TOTP / Google Authenticator) API ─────────────────
   Backed by the `two-factor` edge function. Uses the same auth-header
   strategy as the api-keys calls (Supabase JWT when present, else anon
   key + X-Steam-Id). The QR is rendered client-side from the returned
   otpauth URI — the app CSP blocks third-party image hosts. */
interface TwoFactorStatus {
  enabled: boolean;
  hasPending: boolean;
}
interface TwoFactorSetup {
  secret: string;
  otpauth: string;
}

async function fetchTwoFactorStatus(): Promise<TwoFactorStatus> {
  const { supabaseUrl } = getSupabaseCredentials();
  const headers = await apiKeyAuthHeaders();
  const res = await fetch(`${supabaseUrl}/functions/v1/two-factor`, { headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `Server error (${res.status})`);
  return { enabled: !!body.enabled, hasPending: !!body.hasPending };
}

async function postTwoFactor(payload: Record<string, unknown>): Promise<any> {
  const { supabaseUrl } = getSupabaseCredentials();
  const headers = await apiKeyAuthHeaders();
  const res = await fetch(`${supabaseUrl}/functions/v1/two-factor`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `Server error (${res.status})`);
  return body;
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
  const [uiScale, setUiScaleState] = useState<UiScale>(() => getUiScale());
  /* True while the user is actively dragging the font-size slider —
     lets us defer the (expensive) zoom apply until the drag ends. */
  const uiScaleDraggingRef = useRef(false);
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

  /* API keys — backed by the api-keys edge function. Fetch on mount;
     re-fetch after create/revoke so the list stays accurate. While the
     initial fetch is in-flight we render a tiny loading state. */
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(true);
  const [apiKeysError, setApiKeysError] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<{ id: string; key: string } | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  /* ── Two-factor (TOTP) state ──
     - tfaStatus: enabled? (drives the enabled vs. disabled card)
     - tfaSetup: the pending secret + otpauth once "Enable" is clicked
     - tfaQr: data URL of the QR rendered from the otpauth URI
     - tfaCode: the 6-digit code the user types to confirm enrollment
     - tfaBackup: single-use recovery codes returned on activation
     - tfaDisableCode: code required to turn 2FA off again */
  const [tfaStatus, setTfaStatus] = useState<TwoFactorStatus | null>(null);
  const [tfaSetup, setTfaSetup] = useState<TwoFactorSetup | null>(null);
  const [tfaQr, setTfaQr] = useState<string | null>(null);
  const [tfaCode, setTfaCode] = useState('');
  const [tfaBackup, setTfaBackup] = useState<string[] | null>(null);
  const [tfaBusy, setTfaBusy] = useState(false);
  const [tfaSecretCopied, setTfaSecretCopied] = useState(false);
  const [showDisable2fa, setShowDisable2fa] = useState(false);
  const [tfaDisableCode, setTfaDisableCode] = useState('');

  /* Stable primitive dep — see the note on the devices effect below. */
  const authKey = user?.steamId || user?.id || user?.authUserId || '';
  useEffect(() => {
    if (!authKey) return;
    let cancelled = false;
    fetchTwoFactorStatus()
      .then((s) => { if (!cancelled) setTfaStatus(s); })
      .catch(() => { if (!cancelled) setTfaStatus({ enabled: false, hasPending: false }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authKey]);

  const handleStart2fa = async () => {
    setTfaBusy(true);
    try {
      const setup = (await postTwoFactor({ action: 'setup' })) as TwoFactorSetup;
      setTfaSetup(setup);
      setTfaCode('');
      setTfaBackup(null);
      const qr = await QRCode.toDataURL(setup.otpauth, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 220,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setTfaQr(qr);
    } catch (e: any) {
      addToast({ type: 'error', title: 'Could not start 2FA', message: e?.message });
    } finally {
      setTfaBusy(false);
    }
  };

  const handleConfirm2fa = async () => {
    if (!/^\d{6}$/.test(tfaCode.trim())) {
      addToast({ type: 'warning', title: 'Zadejte 6místný kód', message: 'Z vaší autentizační aplikace.' });
      return;
    }
    setTfaBusy(true);
    try {
      const res = await postTwoFactor({ action: 'enable', code: tfaCode.trim() });
      setTfaBackup(res.backupCodes || []);
      setTfaSetup(null);
      setTfaQr(null);
      setTfaCode('');
      setTfaStatus({ enabled: true, hasPending: false });
      addToast({ type: 'success', title: 'Dvoufázové ověření zapnuto', message: 'Váš účet je nyní chráněn.' });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Verification failed', message: e?.message });
    } finally {
      setTfaBusy(false);
    }
  };

  const handleDisable2fa = async () => {
    if (!tfaDisableCode.trim()) {
      addToast({ type: 'warning', title: 'Zadejte kód', message: 'Kód z autentizátoru nebo záložní kód.' });
      return;
    }
    setTfaBusy(true);
    try {
      await postTwoFactor({ action: 'disable', code: tfaDisableCode.trim() });
      setTfaStatus({ enabled: false, hasPending: false });
      setShowDisable2fa(false);
      setTfaDisableCode('');
      setTfaBackup(null);
      addToast({ type: 'info', title: 'Dvoufázové ověření vypnuto' });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Could not disable', message: e?.message });
    } finally {
      setTfaBusy(false);
    }
  };

  /* ── Sessions / devices ── */
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [revokingDevice, setRevokingDevice] = useState<string | null>(null);

  const loadDevices = async () => {
    setDevicesLoading(true);
    try {
      setDevices(await listDevices());
    } catch {
      setDevices([]);
    } finally {
      setDevicesLoading(false);
    }
  };

  /* Depend on a STABLE primitive (the id), not the whole `user` object —
     authStore hands back a new object reference on many updates (patchUser,
     KYC/status refreshes), and depending on the object re-ran this fetch on
     every one of those, which set state → re-render → new object → refetch,
     an infinite "Loading sessions…" loop. */
  const userKey = user?.steamId || user?.id || user?.authUserId || '';
  useEffect(() => {
    if (userKey) loadDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userKey]);

  const handleRevokeDevice = async (id: string) => {
    setRevokingDevice(id);
    try {
      await revokeDevice(id);
      setDevices((prev) => prev.filter((d) => d.id !== id));
      addToast({ type: 'info', title: 'Signed out of device' });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Could not revoke', message: e?.message });
    } finally {
      setRevokingDevice(null);
    }
  };

  const copyTfaSecret = async () => {
    if (!tfaSetup?.secret) return;
    try {
      await navigator.clipboard.writeText(tfaSetup.secret);
      setTfaSecretCopied(true);
      setTimeout(() => setTfaSecretCopied(false), 1500);
    } catch { /* clipboard blocked */ }
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setApiKeysLoading(true);
    setApiKeysError(null);
    fetchKeys()
      .then((rows) => {
        if (!cancelled) setApiKeys(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setApiKeysError(err?.message || 'Failed to load API keys');
        }
      })
      .finally(() => {
        if (!cancelled) setApiKeysLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

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

  const handleCreateKey = async () => {
    if (creatingKey) return;
    /* Client-side gate so the verification message shows instantly,
       but the server enforces it again — never trust the client. */
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
    setCreatingKey(true);
    try {
      const created = await createKey(newKeyName.trim());
      /* Insert the new (masked) row at the top of the list so the UI
         shows it before the server response settles. The full key
         lives only in the `justCreated` reveal panel. */
      setApiKeys((prev) => [
        {
          id: created.id,
          name: created.name,
          masked: created.masked,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setJustCreated({ id: created.id, key: created.key });
      setNewKeyName('');
      addToast({
        type: 'success',
        title: 'API key created',
        message: 'Copy it now — you won\'t see the full value again.',
        duration: 6000,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Could not create key',
        message: err?.message || 'Unknown error.',
        duration: 6000,
      });
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (revokingId) return;
    if (!confirm('Revoke this key? Any app using it will start getting 401s immediately.')) {
      return;
    }
    setRevokingId(id);
    /* Optimistic remove — restore on error. */
    const snapshot = apiKeys;
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
    if (justCreated?.id === id) setJustCreated(null);
    try {
      await revokeKey(id);
      addToast({ type: 'success', title: 'Key revoked' });
    } catch (err: any) {
      setApiKeys(snapshot);
      addToast({
        type: 'error',
        title: 'Could not revoke',
        message: err?.message || 'Unknown error.',
        duration: 6000,
      });
    } finally {
      setRevokingId(null);
    }
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
      addToast({ type: 'success', title: 'Steam ID zkopírováno' });
      setTimeout(() => setCopiedId(false), 1500);
    } catch {
      addToast({ type: 'error', title: 'Copy failed' });
    }
  };

  const handleSaveTradeLink = async () => {
    const link = tradeLink.trim();
    if (!link) {
      addToast({ type: 'warning', title: 'Prázdný odkaz', message: 'Vložte svou Steam trade URL.' });
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
      <Section title="Steam identita" subtitle="Váš účet Skinify je propojen s tímto Steam profilem.">
        <Row label="Zobrazované jméno" value={user.displayName} />
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
          label="Profil"
          value={
            <a
              href={`https://steamcommunity.com/profiles/${user.steamId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent hover:opacity-80 transition-opacity"
            >
              Otevřít na Steamu
              <ExternalLink size={12} strokeWidth={2.2} />
            </a>
          }
        />
      </Section>

      {/* ───── Trade URL ─────────────────────────────────────── */}
      <Section
        title="Steam trade URL"
        subtitle="Potřebujeme ji k odeslání skinů po úspěšném obchodu."
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
            Svoji URL najdete v{' '}
            <a
              href="https://steamcommunity.com/my/tradeoffers/privacy"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:opacity-80 transition-opacity font-semibold"
            >
              Steam → Soukromí inventáře
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
            {savingTrade ? 'Ukládám…' : 'Uložit trade URL'}
          </motion.button>
        </div>
      </Section>

      {/* ───── Two-factor authentication ─────────────────────── */}
      <Section
        title="Dvoufázové ověření"
        subtitle="Chraňte svůj účet kódem z Google Authenticatoru, Authy nebo jiné TOTP aplikace."
      >
        {/* Enabled state */}
        {tfaStatus?.enabled && !tfaBackup && (
          <div>
            <div
              className="rounded-2xl p-4 flex items-start gap-3 bg-emerald-500/10"
              style={{ boxShadow: 'inset 0 0 0 1px rgb(16 185 129 / 0.35)' }}
            >
              <ShieldCheck size={18} strokeWidth={2.4} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-bold text-ink leading-tight">
                  Dvoufázové ověření je zapnuté
                </div>
                <p className="text-[12px] text-ink-muted font-medium mt-1 leading-relaxed">
                  Při citlivých akcích budete požádáni o 6místný kód z vaší autentizační aplikace.
                </p>
              </div>
            </div>
            {!showDisable2fa ? (
              <div className="flex justify-end mt-3">
                <button
                  onClick={() => setShowDisable2fa(true)}
                  className="h-10 px-4 rounded-full bg-rose-500/10 hover:bg-rose-500/15 text-rose-700 dark:text-rose-300 font-semibold text-[13px] transition-colors"
                >
                  Vypnout 2FA
                </button>
              </div>
            ) : (
              <div className="mt-3 rounded-2xl bg-subtle/60 p-4">
                <div className="text-[12.5px] font-semibold text-ink mb-2">
                  Pro potvrzení zadejte kód z autentizátoru nebo záložní kód.
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={tfaDisableCode}
                    onChange={(e) => setTfaDisableCode(e.target.value)}
                    placeholder="123456 nebo záložní kód"
                    className="flex-1 h-11 px-4 rounded-full bg-bg text-ink text-[14px] font-medium outline-none focus:ring-2 ring-accent/30"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleDisable2fa}
                      disabled={tfaBusy}
                      className="h-11 px-4 rounded-full bg-rose-500 text-white font-bold text-[13px] disabled:opacity-60"
                    >
                      {tfaBusy ? 'Pracuji…' : 'Vypnout'}
                    </button>
                    <button
                      onClick={() => { setShowDisable2fa(false); setTfaDisableCode(''); }}
                      className="h-11 px-4 rounded-full bg-subtle hover:bg-bg text-ink font-semibold text-[13px] transition-colors"
                    >
                      Zrušit
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Backup codes reveal — shown once, right after enabling. */}
        {tfaBackup && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4"
            style={{ background: 'rgb(var(--accent) / 0.08)', boxShadow: 'inset 0 0 0 1px rgb(var(--accent) / 0.35)' }}
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-accent mb-1.5">
              Uložte si záložní kódy — už je znovu neuvidíte
            </div>
            <p className="text-[12px] text-ink-muted font-medium mb-3">
              Každý kód funguje jednou, pokud ztratíte přístup k autentizační aplikaci.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {tfaBackup.map((c) => (
                <code key={c} className="text-[13px] font-mono font-semibold text-ink bg-bg rounded-xl px-3 py-2 text-center select-all">
                  {c}
                </code>
              ))}
            </div>
            <div className="flex justify-end mt-3 gap-2">
              <button
                onClick={() => navigator.clipboard?.writeText(tfaBackup.join('\n')).catch(() => {})}
                className="h-10 px-4 rounded-full bg-subtle hover:bg-bg text-ink font-semibold text-[13px] transition-colors inline-flex items-center gap-1.5"
              >
                <Copy size={13} strokeWidth={2.2} /> Kopírovat vše
              </button>
              <button
                onClick={() => setTfaBackup(null)}
                className="h-10 px-4 rounded-full bg-accent text-on-accent font-bold text-[13px]"
              >
                Hotovo
              </button>
            </div>
          </motion.div>
        )}

        {/* Disabled state — either the CTA to begin, or the enrollment flow */}
        {tfaStatus && !tfaStatus.enabled && !tfaBackup && (
          <div>
            {!tfaSetup ? (
              <div className="rounded-2xl bg-subtle/50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-accent/12 grid place-items-center shrink-0">
                  <Smartphone size={18} strokeWidth={2.2} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-bold text-ink leading-tight">
                    Přidat autentizační aplikaci
                  </div>
                  <p className="text-[12px] text-ink-muted font-medium mt-0.5 leading-relaxed">
                    Naskenujte QR kód v Google Authenticatoru a zabezpečte účet časově založenými kódy.
                  </p>
                </div>
                <motion.button
                  whileTap={tap}
                  onClick={handleStart2fa}
                  disabled={tfaBusy}
                  className="h-11 px-5 rounded-full bg-accent text-on-accent font-bold text-[13.5px] inline-flex items-center justify-center gap-2 disabled:opacity-60 shrink-0"
                  style={{ boxShadow: '0 8px 20px -10px rgb(var(--accent) / 0.6)' }}
                >
                  <Shield size={14} strokeWidth={2.4} />
                  {tfaBusy ? 'Připravuji…' : 'Nastavit 2FA'}
                </motion.button>
              </div>
            ) : (
              <div className="rounded-2xl bg-subtle/50 p-4 md:p-5">
                <div className="flex flex-col md:flex-row gap-5">
                  {/* QR */}
                  <div className="shrink-0 mx-auto md:mx-0">
                    {tfaQr ? (
                      <img
                        src={tfaQr}
                        alt="Authenticator QR code"
                        className="w-[200px] h-[200px] rounded-2xl bg-white p-2"
                      />
                    ) : (
                      <div className="w-[200px] h-[200px] rounded-2xl bg-bg grid place-items-center">
                        <span className="text-[12px] text-ink-muted font-medium">Generating…</span>
                      </div>
                    )}
                  </div>
                  {/* Steps */}
                  <div className="flex-1 min-w-0">
                    <ol className="space-y-2.5 text-[13px] text-ink font-medium">
                      <li className="flex gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[11px] font-bold grid place-items-center shrink-0 mt-0.5">1</span>
                        <span>Otevřete Google Authenticator (nebo jinou TOTP aplikaci) a naskenujte QR kód.</span>
                      </li>
                      <li className="flex gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[11px] font-bold grid place-items-center shrink-0 mt-0.5">2</span>
                        <span>
                          Nejde naskenovat? Zadejte tento klíč ručně:
                          <span className="mt-1.5 flex items-center gap-2">
                            <code className="text-[12.5px] font-mono font-semibold text-ink bg-bg rounded-lg px-2.5 py-1.5 select-all break-all">
                              {tfaSetup.secret}
                            </code>
                            <button
                              onClick={copyTfaSecret}
                              className="icon-chip-sm hover:bg-bg shrink-0"
                              aria-label="Copy secret"
                            >
                              {tfaSecretCopied ? (
                                <Check size={13} strokeWidth={2.4} className="text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Copy size={13} strokeWidth={2.2} className="text-ink-muted" />
                              )}
                            </button>
                          </span>
                        </span>
                      </li>
                      <li className="flex gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[11px] font-bold grid place-items-center shrink-0 mt-0.5">3</span>
                        <span>Zadejte 6místný kód z aplikace pro dokončení.</span>
                      </li>
                    </ol>

                    <div className="flex flex-col sm:flex-row gap-2 mt-4">
                      <input
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={tfaCode}
                        onChange={(e) => setTfaCode(e.target.value.replace(/\D/g, ''))}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm2fa(); }}
                        placeholder="123456"
                        className="flex-1 h-11 px-4 rounded-full bg-bg text-ink text-[16px] font-bold tabular-nums tracking-[0.3em] text-center outline-none focus:ring-2 ring-accent/30"
                      />
                      <div className="flex gap-2">
                        <motion.button
                          whileTap={tap}
                          onClick={handleConfirm2fa}
                          disabled={tfaBusy}
                          className="h-11 px-5 rounded-full bg-accent text-on-accent font-bold text-[13.5px] disabled:opacity-60"
                        >
                          {tfaBusy ? 'Ověřuji…' : 'Ověřit a zapnout'}
                        </motion.button>
                        <button
                          onClick={() => { setTfaSetup(null); setTfaQr(null); setTfaCode(''); }}
                          className="h-11 px-4 rounded-full bg-subtle hover:bg-bg text-ink font-semibold text-[13px] transition-colors"
                        >
                          Zrušit
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading placeholder before status resolves */}
        {!tfaStatus && (
          <div className="rounded-2xl bg-subtle/30 p-6 text-center">
            <p className="text-[12.5px] text-ink-muted font-medium">Načítám nastavení zabezpečení…</p>
          </div>
        )}
      </Section>

      {/* ───── Identity verification (KYC) ────────────────────── */}
      <KycVerification />

      {/* ───── Sessions / devices ─────────────────────────────── */}
      <Section
        title="Zařízení a relace"
        subtitle="Místa, kde jste přihlášeni. Odeberte ta, která nepoznáváte."
      >
        {devicesLoading ? (
          <div className="rounded-2xl bg-subtle/30 p-6 text-center">
            <p className="text-[12.5px] text-ink-muted font-medium">Načítám relace…</p>
          </div>
        ) : devices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line p-6 text-center">
            <p className="text-[13px] text-ink-muted font-medium">
              Zatím žádné relace. Objeví se zde po vašem příštím přihlášení.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {devices.map((d) => {
              const current = isCurrentDevice(d);
              return (
                <li
                  key={d.id}
                  className="rounded-2xl bg-subtle/40 p-3.5 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-2xl bg-bg grid place-items-center shrink-0">
                    <MonitorIcon size={18} strokeWidth={2} className="text-ink-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13.5px] font-bold text-ink truncate">
                        {d.device_name || 'Unknown device'}
                      </span>
                      {current && (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          Toto zařízení
                        </span>
                      )}
                      {d.trusted && (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-accent/12 text-accent">
                          Důvěryhodné
                        </span>
                      )}
                    </div>
                    <div className="text-[11.5px] text-ink-muted font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <MapPin size={11} strokeWidth={2} className="shrink-0" />
                      <span className="font-mono">{d.ip || 'unknown IP'}</span>
                      <span className="text-ink-dim">·</span>
                      <span>Naposledy {new Date(d.last_seen_at).toLocaleString()}</span>
                    </div>
                  </div>
                  {!current && (
                    <button
                      onClick={() => handleRevokeDevice(d.id)}
                      disabled={revokingDevice === d.id}
                      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[12px] font-bold transition-colors disabled:opacity-50 shrink-0"
                    >
                      <Trash2 size={12} strokeWidth={2.4} />
                      {revokingDevice === d.id ? '…' : 'Odhlásit'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-[11.5px] text-ink-dim font-medium mt-3 leading-relaxed">
          „Důvěryhodné“ zařízení nebude při přihlášení žádáno o dvoufázový kód. Odebrání zařízení
          také zruší jeho důvěru — příště bude potřebovat nový kód.
        </p>
      </Section>

      {/* ───── Appearance ────────────────────────────────────── */}
      <Section title="Vzhled" subtitle="Jak Skinify vypadá na vašich zařízeních.">
        <div>
          <div className="label-eyebrow mb-2.5">Motiv</div>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'light', label: 'Světlý', Icon: Sun },
                { id: 'dark',  label: 'Tmavý',  Icon: Moon },
                { id: 'auto',  label: 'Systém', Icon: Monitor },
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
            Aktuálně zobrazeno: <span className="font-bold text-ink">{resolvedMode}</span>
          </p>
        </div>

        <div className="mt-5">
          <div className="label-eyebrow mb-2.5">Barva zvýraznění</div>
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

        {/* Font size / UI scale — the % readout and fill track follow
            the drag live, but the actual zoom is only applied when the
            drag ENDS. Applying it mid-drag rescaled the slider under
            the pointer, which made dragging feel jumpy. */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <div className="label-eyebrow">Velikost písma</div>
            <motion.span
              key={uiScale}
              initial={{ scale: 1.3, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className="text-[14px] font-bold tabular-nums text-ink leading-none"
            >
              {uiScale}%
            </motion.span>
          </div>
          <div className="relative h-6 flex items-center">
            <div className="absolute inset-x-0 h-1.5 rounded-full bg-subtle" />
            <motion.div
              className="absolute h-1.5 rounded-full bg-accent"
              animate={{
                width: `${((uiScale - UI_SCALE_MIN) / (UI_SCALE_MAX - UI_SCALE_MIN)) * 100}%`,
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            />
            <input
              type="range"
              min={UI_SCALE_MIN}
              max={UI_SCALE_MAX}
              step={UI_SCALE_STEP}
              value={uiScale}
              onPointerDown={() => {
                uiScaleDraggingRef.current = true;
              }}
              onChange={(e) => {
                const v = Number(e.target.value) as UiScale;
                setUiScaleState(v);
                /* Keyboard / click-to-jump (no pointer drag in
                   progress) commits immediately. */
                if (!uiScaleDraggingRef.current) setUiScale(v);
              }}
              onPointerUp={(e) => {
                uiScaleDraggingRef.current = false;
                setUiScale(Number((e.target as HTMLInputElement).value) as UiScale);
              }}
              onTouchEnd={(e) => {
                uiScaleDraggingRef.current = false;
                setUiScale(Number((e.target as HTMLInputElement).value) as UiScale);
              }}
              aria-label="Font size"
              className="relative w-full appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150 [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:active:scale-125 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-0"
            />
          </div>
          <div className="flex justify-between text-[10.5px] text-ink-dim font-semibold tabular-nums mt-1.5">
            <span>{UI_SCALE_MIN}%</span>
            <button
              type="button"
              onClick={() => {
                setUiScale(100);
                setUiScaleState(100);
              }}
              className="hover:text-ink transition-colors font-bold"
            >
              Obnovit na 100%
            </button>
            <span>{UI_SCALE_MAX}%</span>
          </div>
          <p className="text-[11.5px] text-ink-dim font-medium mt-2">
            Škáluje celé rozhraní — jako změna DPI displeje.
          </p>
        </div>
      </Section>

      {/* ───── Currency ──────────────────────────────────────── */}
      <Section
        title="Měna"
        subtitle="Všechny ceny na Skinify se zobrazí ve vybrané měně."
      >
        <div>
          <div className="label-eyebrow mb-3">Zobrazovaná měna</div>
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
      <Section title="Oznámení" subtitle="Vyberte, na co vás máme upozornit.">
        <div className="space-y-1">
          <Toggle
            label="Položka prodána"
            sub="Kupující zakoupil jednu z vašich nabídek"
            checked={notif.saleAlert}
            onChange={(v) => setNotif((s) => ({ ...s, saleAlert: v }))}
          />
          <Toggle
            label="Pokles ceny v seznamu přání"
            sub="Něco, co sledujete, kleslo o 10 %+"
            checked={notif.priceDrop}
            onChange={(v) => setNotif((s) => ({ ...s, priceDrop: v }))}
          />
          <Toggle
            label="Přijata nabídka obchodu"
            sub="Kupující přijal obchod, který musíte odeslat"
            checked={notif.tradeOffer}
            onChange={(v) => setNotif((s) => ({ ...s, tradeOffer: v }))}
          />
          <Toggle
            label="Týdenní souhrn"
            sub="Přehled výdělků, nabídek a tržních trendů"
            checked={notif.weeklyDigest}
            onChange={(v) => setNotif((s) => ({ ...s, weeklyDigest: v }))}
          />
        </div>
        <p className="text-[11.5px] text-ink-dim font-medium mt-3">
          Předvolby oznámení jsou zatím uloženy lokálně — synchronizace se serverem přijde s
          backendem push oznámení.
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
              disabled={!isVerified || creatingKey}
              className="h-10 px-4 rounded-full bg-accent text-on-accent text-[12.5px] font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Key size={13} strokeWidth={2.4} />
              {creatingKey ? 'Creating…' : 'Create API key'}
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
                  Hotovo
                </button>
              </div>
            </motion.div>
          )}

          {/* Existing keys list */}
          {apiKeysLoading ? (
            <div className="rounded-2xl bg-subtle/30 p-6 text-center">
              <p className="text-[12.5px] text-ink-muted font-medium">Načítám vaše klíče…</p>
            </div>
          ) : apiKeysError ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 text-center">
              <p className="text-[12.5px] text-rose-600 dark:text-rose-400 font-semibold">
                {apiKeysError}
              </p>
              <p className="text-[11px] text-ink-muted font-medium mt-1">
                Refresh the page to try again.
              </p>
            </div>
          ) : apiKeys.length === 0 ? (
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
                    disabled={revokingId === k.id}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[12px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={12} strokeWidth={2.4} />
                    {revokingId === k.id ? 'Revoking…' : 'Revoke'}
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
      <Section title="Účet" titleTone="danger">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              logout();
              addToast({ type: 'info', title: 'Odhlášeno' });
            }}
            className="h-11 px-5 rounded-full bg-subtle hover:bg-bg text-ink font-semibold text-[13px] transition-colors"
          >
            Odhlásit se
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
            Smazat účet
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
