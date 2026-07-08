import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, Link2, ShieldCheck, Send, Check } from 'lucide-react';
import { useAuthStore, AuthUser } from '../../store/authStore';
import { tap } from '../../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   Buy-eligibility gate.

   An email/credentials user must, before they can buy:
     1. Link a Steam account   (so we know where to send skins)
     2. Have a Steam trade URL  (the actual delivery target)
     3. Pass KYC / identity verification

   Steam-OpenID users satisfy (1) inherently; they still need a trade link.
   Every purchase path routes through `checkBuyEligibility` — when it
   returns requirements, callers open <BuyGate> instead of proceeding.
   ───────────────────────────────────────────────────────────────────────── */

export interface BuyRequirement {
  key: 'steam' | 'trade' | 'kyc';
  label: string;
  desc: string;
}

export function getBuyRequirements(user: AuthUser | null): BuyRequirement[] {
  if (!user) return [];
  const reqs: BuyRequirement[] = [];
  const steamLinked = !!(user.steamId && user.steamId.length > 0);
  if (!steamLinked) {
    reqs.push({
      key: 'steam',
      label: 'Link your Steam account',
      desc: 'We send purchased skins to your Steam inventory, so your account must be connected.',
    });
  }
  if (!user.tradeLink) {
    reqs.push({
      key: 'trade',
      label: 'Add your Steam trade URL',
      desc: 'This is the exact delivery target sellers use to send you items.',
    });
  }
  if (!user.kycVerified) {
    reqs.push({
      key: 'kyc',
      label: 'Verify your identity (KYC)',
      desc: 'A one-time identity check is required before your first purchase.',
    });
  }
  return reqs;
}

/** True when the user can proceed to buy. */
export function canBuy(user: AuthUser | null): boolean {
  return !!user && getBuyRequirements(user).length === 0;
}

const ICONS: Record<BuyRequirement['key'], React.ComponentType<any>> = {
  steam: Link2,
  trade: Send,
  kyc: ShieldCheck,
};

const BuyGate: React.FC<{
  open: boolean;
  onClose: () => void;
  requirements: BuyRequirement[];
}> = ({ open, onClose, requirements }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const go = (key: BuyRequirement['key']) => {
    onClose();
    if (key === 'steam') {
      // Steam OpenID begin — same entry the login button uses.
      navigate('/profile?tab=settings&sub=profile');
    } else if (key === 'trade') {
      navigate('/profile?tab=settings&sub=profile');
    } else {
      navigate('/profile?tab=settings&sub=profile&verify=1');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-[95] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-start justify-between p-5 pb-3">
              <div>
                <div className="label-eyebrow">Before you buy</div>
                <h2 className="text-[20px] font-bold text-ink tracking-tight mt-1">
                  Finish setting up your account
                </h2>
              </div>
              <button
                onClick={onClose}
                className="icon-chip-sm hover:bg-subtle transition-colors -mr-1"
                aria-label="Close"
              >
                <X size={16} strokeWidth={2.2} className="text-ink-muted" />
              </button>
            </div>

            <p className="px-5 text-[13px] text-ink-muted font-medium leading-relaxed">
              To keep trades safe and deliverable, complete the step
              {requirements.length > 1 ? 's' : ''} below. It only takes a minute.
            </p>

            <div className="p-5 space-y-2.5">
              {requirements.map((r) => {
                const Icon = ICONS[r.key];
                return (
                  <button
                    key={r.key}
                    onClick={() => go(r.key)}
                    className="w-full flex items-center gap-3.5 rounded-2xl bg-subtle/60 hover:bg-subtle p-3.5 text-left transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-accent/12 grid place-items-center shrink-0">
                      <Icon size={18} strokeWidth={2.2} className="text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-bold text-ink leading-tight">{r.label}</div>
                      <div className="text-[11.5px] text-ink-muted font-medium mt-0.5 leading-snug">
                        {r.desc}
                      </div>
                    </div>
                    <span className="text-[12px] font-bold text-accent shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      Set up →
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={() => go(requirements[0]?.key || 'steam')}
                className="w-full h-12 rounded-full bg-accent text-on-accent font-bold text-[14px] inline-flex items-center justify-center gap-2"
                style={{ boxShadow: '0 10px 24px -12px rgb(var(--accent) / 0.7)' }}
              >
                <Check size={16} strokeWidth={2.6} />
                Complete setup
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BuyGate;
