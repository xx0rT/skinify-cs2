import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Coins,
  RefreshCw,
  Search,
  Plus,
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useBalanceStore } from '../../../store/balanceStore';
import { useToastStore } from '../../../store/toastStore';
import { useCurrencyStore } from '../../../store/currencyStore';
import { openDepositModal } from '../../DepositModal';
import WithdrawModal from '../../ui/WithdrawModal';
import { spring, tap } from '../../../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   BalanceTab
   - Hero card: current balance + pending breakdown + add-funds CTA
   - 4 lifetime KPI tiles
   - Transaction history: filter pills (all / deposits / spent / received) +
     search by description
   ───────────────────────────────────────────────────────────────────────── */

type TxFilter = 'all' | 'deposits' | 'spent' | 'received';

const BalanceTab: React.FC = () => {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [showWithdraw, setShowWithdraw] = useState(false);
  const { formatPrice } = useCurrencyStore();
  const {
    balance,
    pendingBalance,
    totalDeposited,
    totalSpent,
    transactions,
    fetchBalance,
    fetchTransactions,
  } = useBalanceStore();
  const [filter, setFilter] = useState<TxFilter>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (user?.steamId) {
      fetchBalance(user.steamId);
      fetchTransactions(user.steamId);
    }
  }, [user?.steamId]);

  const totalEarned = useMemo(
    () =>
      (transactions || [])
        .filter((t: any) => t.type === 'sale' && t.status === 'completed')
        .reduce((s: number, t: any) => s + Number(t.amount || 0), 0),
    [transactions],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = transactions || [];
    return all
      .filter((tx: any) => {
        if (filter === 'deposits' && tx.type !== 'deposit') return false;
        if (filter === 'spent' && !['purchase', 'withdrawal'].includes(tx.type)) return false;
        if (filter === 'received' && !['sale', 'refund'].includes(tx.type)) return false;
        if (!q) return true;
        return (
          String(tx.description || '').toLowerCase().includes(q) ||
          String(tx.type || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 200);
  }, [transactions, filter, query]);

  /* Pagination — the list used to hard-cap at 50 rows with no way to
     see more or page through them. Page size is user-selectable. */
  const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState(0);
  useEffect(() => {
    setPage(0);
  }, [filter, query, pageSize]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = useMemo(
    () => filtered.slice(page * pageSize, page * pageSize + pageSize),
    [filtered, page, pageSize],
  );

  return (
    <div className="space-y-4">
      {/* Hero + summary */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="card p-6 sm:p-8 relative overflow-hidden"
        >
          <motion.div
            aria-hidden
            className="absolute -top-32 -right-24 w-[360px] h-[360px] rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(closest-side, rgb(var(--accent) / 0.18), transparent 65%)',
            }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="label-eyebrow">Dostupný zůstatek</span>
              <button
                onClick={() => user?.steamId && fetchBalance(user.steamId)}
                className="icon-chip-sm hover:bg-bg transition-colors"
                title="Obnovit"
              >
                <RefreshCw size={13} strokeWidth={2.2} className="text-ink-muted" />
              </button>
            </div>
            <div className="text-[34px] sm:text-[44px] font-bold tracking-tight leading-none tabular-nums text-ink">
              {formatPrice(Number(balance || 0))}
            </div>
            <div className="text-[13px] text-ink-muted font-medium mt-1.5">
              {Number(pendingBalance || 0) > 0
                ? `+ ${formatPrice(Number(pendingBalance || 0))} čeká na uvolnění`
                : 'Žádné prostředky v úschově'}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <motion.button
                whileTap={tap}
                whileHover={{ scale: 1.02 }}
                onClick={openDepositModal}
                className="h-12 px-6 rounded-full bg-accent text-on-accent font-bold text-[14px] flex items-center gap-2"
                style={{ boxShadow: '0 10px 24px -10px rgb(var(--accent) / 0.6)' }}
              >
                <Plus size={15} strokeWidth={2.6} />
                Dobít zůstatek
              </motion.button>
              <motion.button
                whileTap={tap}
                whileHover={{ scale: 1.02 }}
                onClick={() => setShowWithdraw(true)}
                className="h-12 px-6 rounded-full bg-subtle hover:bg-bg text-ink font-semibold text-[14px] flex items-center gap-2 transition-colors"
              >
                <ArrowUpFromLine size={15} strokeWidth={2.2} />
                Vybrat
              </motion.button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          className="card p-6 flex flex-col"
        >
          <span className="label-eyebrow mb-3">Celkem za dobu účtu</span>
          <div className="space-y-3 flex-1">
            <SummaryRow label="Vloženo" value={formatPrice(Number(totalDeposited || 0))} />
            <SummaryRow label="Utraceno" value={formatPrice(Number(totalSpent || 0))} />
            <SummaryRow label="Vyděláno" value={formatPrice(totalEarned)} positive />
            <SummaryRow
              label="Čekající"
              value={formatPrice(Number(pendingBalance || 0))}
              note="Uvolní se 8 dní po každém prodeji"
            />
          </div>
        </motion.div>
      </div>

      {/* History */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.1 }}
        className="card p-5 md:p-6"
      >
        <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
          <div>
            <span className="label-eyebrow">Historie</span>
            <h2 className="text-[17px] font-bold tracking-tight mt-1.5 leading-none">
              Poslední transakce
            </h2>
          </div>
        </div>

        {/* Filter pills + search */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-1">
            {(
              [
                { id: 'all',       label: 'Vše' },
                { id: 'deposits',  label: 'Vklady' },
                { id: 'received',  label: 'Přijaté' },
                { id: 'spent',     label: 'Utracené' },
              ] as const
            ).map((f) => {
              const active = filter === f.id;
              return (
                <motion.button
                  whileTap={tap}
                  key={f.id}
                  onClick={() => setFilter(f.id as TxFilter)}
                  className={`relative h-9 px-3.5 rounded-full text-[12.5px] font-semibold transition-colors ${
                    active ? 'text-on-accent' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="bal-filter-pill"
                      className="absolute inset-0 rounded-full bg-accent"
                      transition={spring}
                    />
                  )}
                  <span className="relative">{f.label}</span>
                </motion.button>
              );
            })}
          </div>
          <div className="flex-1 min-w-[160px] flex items-center gap-2 h-9 px-3 rounded-full bg-subtle">
            <Search size={14} strokeWidth={2} className="text-ink-muted shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Hledat transakce…"
              className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink-dim text-[12.5px] font-medium"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Coins size={26} className="mx-auto text-ink-muted mb-3" />
            <p className="text-[14px] text-ink-muted font-medium">
              Žádné transakce neodpovídají filtru.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            <AnimatePresence initial={false}>
              {filtered.map((tx: any) => {
                const positive = ['deposit', 'sale', 'refund'].includes(String(tx.type));
                return (
                  <motion.li
                    key={tx.id}
                    layout="position"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="py-3 flex items-center gap-3"
                  >
                    <div
                      className={`icon-chip-sm ${
                        positive
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      {positive ? (
                        <ArrowDownToLine size={14} strokeWidth={2.2} />
                      ) : (
                        <ArrowUpFromLine size={14} strokeWidth={2.2} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-bold text-ink truncate tracking-tight">
                        {tx.description || tx.type}
                      </div>
                      <div className="text-[11.5px] text-ink-dim font-medium mt-0.5">
                        {tx.created_at ? new Date(tx.created_at).toLocaleString() : '—'}
                        {tx.status && tx.status !== 'completed' && (
                          <span className="ml-2 pill bg-amber-500/10 text-amber-700 dark:text-amber-300">
                            {tx.status}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 min-w-[100px]">
                      <div
                        className={`text-[14px] font-bold tabular-nums tracking-tight ${
                          positive ? 'text-emerald-700 dark:text-emerald-400' : 'text-ink'
                        }`}
                      >
                        {positive ? '+' : '−'}
                        {formatPrice(Number(tx.amount || 0))}
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </motion.div>

      {/* Withdrawal request — user picks amount + payout method; the
          request lands in the admin panel's Withdrawals queue. */}
      <WithdrawModal
        isOpen={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        onSuccess={() => {
          setShowWithdraw(false);
          if (user?.steamId) fetchBalance(user.steamId);
        }}
        currentBalance={Number(balance || 0)}
      />
    </div>
  );
};

const SummaryRow: React.FC<{
  label: string;
  value: string;
  note?: string;
  positive?: boolean;
}> = ({ label, value, note, positive }) => (
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
      <div className="text-[13px] text-ink-muted font-medium truncate">{label}</div>
      {note && <div className="text-[11px] text-ink-dim font-medium mt-0.5">{note}</div>}
    </div>
    <div
      className={`text-[14.5px] font-bold tracking-tight tabular-nums shrink-0 ${
        positive ? 'text-emerald-700 dark:text-emerald-400' : 'text-ink'
      }`}
    >
      {value}
    </div>
  </div>
);

export default BalanceTab;
