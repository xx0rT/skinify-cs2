import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, BadgeCheck, Loader2 } from 'lucide-react';
import SumsubWebSdk from '@sumsub/websdk-react';
import { getSupabaseCredentials } from '../../utils/supabaseHelpers';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { tap } from '../../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   KycVerification — Settings section that launches Sumsub identity
   verification. Credentials/Steam users must pass KYC before buying (the
   buy-gate reads user.kycVerified). The Sumsub secret never touches the
   client — the sumsub-kyc edge function issues short-lived access tokens
   and reports the review status back.
   ───────────────────────────────────────────────────────────────────────── */

async function kycPost(payload: Record<string, unknown>): Promise<any> {
  const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
  const { data: { session } } = await supabase.auth.getSession();
  const steamId = useAuthStore.getState().user?.steamId;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  else headers.Authorization = `Bearer ${supabaseKey}`;
  if (steamId) headers['X-Steam-Id'] = steamId;

  const res = await fetch(`${supabaseUrl}/functions/v1/sumsub-kyc`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `Server error (${res.status})`);
  return body;
}

const KycVerification: React.FC = () => {
  const { user, patchUser } = useAuthStore();
  const { addToast } = useToastStore();

  const [verified, setVerified] = useState<boolean>(!!user?.kycVerified);
  const [statusLoading, setStatusLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await kycPost({ action: 'status' });
      setVerified(!!res.verified);
      if (res.verified) patchUser?.({ kycVerified: true });
    } catch {
      /* leave as-is */
    } finally {
      setStatusLoading(false);
    }
  }, [patchUser]);

  useEffect(() => {
    if (user) refreshStatus();
    else setStatusLoading(false);
  }, [user, refreshStatus]);

  const startVerification = async () => {
    setLaunching(true);
    try {
      const res = await kycPost({ action: 'access_token' });
      if (!res.token) throw new Error('No verification token returned.');
      setAccessToken(res.token);
      setOpen(true);
    } catch (e: any) {
      addToast({ type: 'error', title: 'Could not start verification', message: e?.message });
    } finally {
      setLaunching(false);
    }
  };

  // WebSDK asks for a fresh token when the current one expires.
  const refreshToken = async () => {
    const res = await kycPost({ action: 'access_token' });
    return res.token as string;
  };

  const onSdkMessage = (type: string, payload: any) => {
    // When the applicant is submitted/approved, re-poll our status so the
    // gate flips without a manual refresh.
    if (
      type === 'idCheck.onApplicantStatusChanged' ||
      type === 'idCheck.applicantStatus' ||
      type === 'idCheck.onApplicantSubmitted'
    ) {
      refreshStatus();
    }
  };

  return (
    <div className="card p-5 md:p-6">
      <div className="mb-4">
        <h2 className="text-[17px] font-bold tracking-tight leading-none text-ink">
          Identity verification
        </h2>
        <p className="text-[12.5px] text-ink-muted font-medium mt-1.5">
          A one-time KYC check, required before your first purchase.
        </p>
      </div>

      {statusLoading ? (
        <div className="rounded-2xl bg-subtle/30 p-6 text-center">
          <p className="text-[12.5px] text-ink-muted font-medium">Checking status…</p>
        </div>
      ) : verified ? (
        <div
          className="rounded-2xl p-4 flex items-center gap-3 bg-emerald-500/10"
          style={{ boxShadow: 'inset 0 0 0 1px rgb(16 185 129 / 0.35)' }}
        >
          <BadgeCheck size={20} strokeWidth={2.4} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <div className="text-[13.5px] font-bold text-ink">You're verified</div>
            <p className="text-[12px] text-ink-muted font-medium mt-0.5">
              Your identity check passed — you can buy without restrictions.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-subtle/50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-accent/12 grid place-items-center shrink-0">
            <ShieldCheck size={18} strokeWidth={2.2} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-bold text-ink leading-tight">Verify your identity</div>
            <p className="text-[12px] text-ink-muted font-medium mt-0.5 leading-relaxed">
              Takes ~2 minutes with a photo ID. Powered by Sumsub — your documents are handled by them, not stored on Skinify.
            </p>
          </div>
          <motion.button
            whileTap={tap}
            onClick={startVerification}
            disabled={launching}
            className="h-11 px-5 rounded-full bg-accent text-on-accent font-bold text-[13.5px] inline-flex items-center justify-center gap-2 disabled:opacity-60 shrink-0"
          >
            {launching ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} strokeWidth={2.4} />}
            {launching ? 'Starting…' : 'Start verification'}
          </motion.button>
        </div>
      )}

      {/* Sumsub WebSDK modal */}
      <AnimatePresence>
        {open && accessToken && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              className="w-full sm:max-w-lg h-full sm:h-auto sm:max-h-[90vh] bg-surface sm:rounded-3xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
                <h3 className="text-[16px] font-bold text-ink">Verify your identity</h3>
                <button
                  onClick={() => { setOpen(false); refreshStatus(); }}
                  className="icon-chip-sm hover:bg-subtle"
                  aria-label="Close"
                >
                  <X size={16} strokeWidth={2.2} className="text-ink-muted" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <SumsubWebSdk
                  accessToken={accessToken}
                  expirationHandler={refreshToken}
                  config={{ lang: 'en' }}
                  options={{ addViewportTag: false, adaptIframeHeight: true }}
                  onMessage={onSdkMessage}
                  onError={(e: any) => addToast({ type: 'error', title: 'Verification error', message: String(e?.message || e) })}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default KycVerification;
