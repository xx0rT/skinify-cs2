import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, Gift, TrendingUp, Users } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useToastStore } from '../../../store/toastStore';
import { spring, tap } from '../../../lib/motion';
import { getSupabaseCredentials } from '../../../utils/supabaseHelpers';
import { useCurrencyStore } from '../../../store/currencyStore';

interface ReferralRow {
  steamId: string;
  name: string;
  avatar: string | null;
  registeredAt: string;
  status: string;
  spent: number;
  sold: number;
  commission: number;
}

/**
 * ReferralTab — mirrors the standalone /referral page but sized for
 * the profile column. Same referral-link generator + KPI tiles + how-
 * it-works walkthrough, minus the marketing chrome.
 *
 * The referral code is derived deterministically from steamId
 * (`SKIN-<last6>`) so the tab renders instantly without a DB round-
 * trip; when the backend ships proper referral rows, replace the
 * derivation with a fetched value from the users table.
 */

const ReferralTab: React.FC = () => {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const { formatPrice } = useCurrencyStore();
  const [copied, setCopied] = useState(false);

  /* Real referral data — who signed up through the link, what they've
     spent, and the commission each of them earned you. */
  const [rows, setRows] = useState<ReferralRow[]>([]);
  const [totals, setTotals] = useState({ count: 0, spent: 0, commission: 0 });
  const [loadingRows, setLoadingRows] = useState(true);
  useEffect(() => {
    if (!user?.steamId) return;
    let alive = true;
    (async () => {
      try {
        const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
        const res = await fetch(`${supabaseUrl}/functions/v1/referral-stats`, {
          headers: {
            'x-steam-id': user.steamId,
            Authorization: `Bearer ${supabaseKey}`,
            apikey: supabaseKey,
          },
        });
        const body = await res.json().catch(() => ({}));
        if (!alive) return;
        if (res.ok) {
          setRows(body.referrals || []);
          setTotals(body.totals || { count: 0, spent: 0, commission: 0 });
        }
      } catch {
        /* leave empty state */
      } finally {
        if (alive) setLoadingRows(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user?.steamId]);

  const referralCode = useMemo(() => {
    if (user?.steamId) return `SKIN-${user.steamId.slice(-6)}`;
    return 'SKIN-XXXXXX';
  }, [user?.steamId]);

  const referralLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?ref=${referralCode}`
      : `https://skinify.gg/?ref=${referralCode}`;

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      addToast({ type: 'success', title: 'Odkaz zkopírován' });
      setTimeout(() => setCopied(false), 1600);
    } catch {
      addToast({ type: 'error', title: 'Kopírování selhalo' });
    }
  };

  const kpis = [
    { label: 'Pozvaní kamarádi', value: String(totals.count), Icon: Users, sub: 'Registrace přes váš odkaz' },
    { label: 'Vydělaná provize', value: formatPrice(totals.commission), Icon: TrendingUp, sub: '25 % z jejich prodejních poplatků' },
    { label: 'Utratili celkem', value: formatPrice(totals.spent), Icon: Gift, sub: 'Nákupy vašich doporučení' },
  ];

  return (
    <div className="space-y-4">
      {/* Referral link card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="card p-5 sm:p-6 relative overflow-hidden"
      >
        <div
          aria-hidden
          className="absolute -top-16 -right-16 w-[280px] h-[280px] rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(closest-side, rgb(var(--accent) / 0.18), transparent 65%)',
          }}
        />
        <div className="relative">
          <div className="label-eyebrow mb-2">Váš doporučovací odkaz</div>
          <h2 className="text-[20px] sm:text-[22px] font-bold tracking-tight text-ink leading-tight">
            Získejte <span className="text-accent">25 %</span> z každého
            prodejního poplatku vašich kamarádů — napořád
          </h2>
          <p className="text-[13px] text-ink-muted font-medium mt-2 leading-relaxed">
            Sdílejte odkaz níže. Když se kamarád zaregistruje, prodá skin nebo
            vloží peníze, automaticky získáte podíl z poplatku. Výplaty chodí
            na váš Skinify zůstatek.
          </p>

          {/* Link + copy */}
          <div className="mt-4 flex items-stretch gap-2">
            <div className="flex-1 min-w-0 rounded-full bg-subtle px-4 h-11 flex items-center">
              <code className="text-[12.5px] font-mono text-ink truncate select-all">
                {referralLink}
              </code>
            </div>
            <motion.button
              whileTap={tap}
              onClick={doCopy}
              className="h-11 px-4 rounded-full bg-accent text-on-accent text-[13px] font-bold inline-flex items-center gap-1.5 shrink-0"
              style={{ boxShadow: '0 10px 22px -10px rgb(var(--accent) / 0.55)' }}
            >
              {copied ? (
                <>
                  <Check size={13} strokeWidth={2.6} />
                  Zkopírováno
                </>
              ) : (
                <>
                  <Copy size={13} strokeWidth={2.4} />
                  Kopírovat
                </>
              )}
            </motion.button>
          </div>

          <div className="mt-3 text-[11.5px] text-ink-dim font-medium">
            Kód: <code className="font-mono text-ink">{referralCode}</code>
          </div>
        </div>
      </motion.div>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.05 + i * 0.04 }}
            className="card p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-2xl bg-accent-soft text-accent grid place-items-center">
                <k.Icon size={14} strokeWidth={2.2} />
              </div>
              <span className="label-meta">{k.label}</span>
            </div>
            <div className="text-[22px] font-bold text-ink tracking-tight tabular-nums leading-none">
              {k.value}
            </div>
            <div className="text-[11.5px] text-ink-muted font-medium mt-1.5 leading-snug">
              {k.sub}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Signups through the link — who, when, spend, and commission. */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.12 }}
        className="card p-5 sm:p-6"
      >
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <div className="label-eyebrow">Vaše doporučení</div>
          {rows.length > 0 && (
            <span className="text-[11.5px] font-bold text-ink-muted tabular-nums">
              {rows.length} {rows.length === 1 ? 'uživatel' : rows.length <= 4 ? 'uživatelé' : 'uživatelů'}
            </span>
          )}
        </div>
        {loadingRows ? (
          <div className="py-8 text-center text-[13px] text-ink-muted font-medium">Načítám…</div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center">
            <Users size={22} className="mx-auto text-ink-dim mb-2" />
            <p className="text-[13px] text-ink-muted font-medium">
              Zatím se přes váš odkaz nikdo nezaregistroval. Sdílejte ho a začněte vydělávat.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim border-b border-line">
                  <th className="text-left py-2 px-1">Uživatel</th>
                  <th className="text-left py-2 px-1">Registrace</th>
                  <th className="text-right py-2 px-1">Utraceno</th>
                  <th className="text-right py-2 px-1">Prodali za</th>
                  <th className="text-right py-2 px-1">Vaše provize</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {rows.map((r) => (
                  <tr key={r.steamId} className="hover:bg-subtle/40 transition-colors">
                    <td className="py-2.5 px-1">
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <span className="w-7 h-7 rounded-full bg-subtle ring-1 ring-line overflow-hidden grid place-items-center shrink-0">
                          {r.avatar ? (
                            <img src={r.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-bold text-ink-muted">
                              {r.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </span>
                        <span className="text-[12.5px] font-bold text-ink truncate max-w-[140px]">
                          {r.name}
                        </span>
                      </span>
                    </td>
                    <td className="py-2.5 px-1 text-[12px] text-ink-muted font-medium whitespace-nowrap">
                      {r.registeredAt
                        ? new Date(r.registeredAt).toLocaleDateString('cs-CZ')
                        : '—'}
                    </td>
                    <td className="py-2.5 px-1 text-right text-[12.5px] font-bold text-ink tabular-nums">
                      {formatPrice(r.spent)}
                    </td>
                    <td className="py-2.5 px-1 text-right text-[12.5px] font-semibold text-ink-muted tabular-nums">
                      {formatPrice(r.sold)}
                    </td>
                    <td className="py-2.5 px-1 text-right text-[12.5px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      +{formatPrice(r.commission)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line">
                  <td colSpan={2} className="py-2.5 px-1 text-[11px] font-bold uppercase tracking-wider text-ink-dim">
                    Celkem
                  </td>
                  <td className="py-2.5 px-1 text-right text-[13px] font-bold text-ink tabular-nums">
                    {formatPrice(totals.spent)}
                  </td>
                  <td className="py-2.5 px-1" />
                  <td className="py-2.5 px-1 text-right text-[13px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    +{formatPrice(totals.commission)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </motion.div>

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.15 }}
        className="card p-5 sm:p-6"
      >
        <div className="label-eyebrow mb-3">Jak to funguje</div>
        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              n: '01',
              t: 'Sdílejte svůj odkaz',
              s: 'Pošlete odkaz kamarádům nebo ho sdílejte na sítích.',
            },
            {
              n: '02',
              t: 'Kamarád se zaregistruje',
              s: 'Zaregistruje se a začne obchodovat. Provize se přiřadí automaticky.',
            },
            {
              n: '03',
              t: 'Vyděláváte napořád',
              s: '25 % z každého jejich prodejního poplatku, připsáno na váš zůstatek.',
            },
          ].map((step) => (
            <li key={step.n} className="card-flat p-4">
              <div className="text-[11px] font-bold text-accent tracking-wider">
                {step.n}
              </div>
              <div className="text-[14px] font-bold text-ink tracking-tight mt-1.5">
                {step.t}
              </div>
              <div className="text-[12px] text-ink-muted font-medium mt-1 leading-relaxed">
                {step.s}
              </div>
            </li>
          ))}
        </ol>
      </motion.div>
    </div>
  );
};

export default ReferralTab;
