import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronDown, Scale } from 'lucide-react';
import LandingNav from '../LandingNav';
import Footer from '../Footer';
import { spring, tap } from '../../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   LegalShell — shared chrome for Terms / Privacy / Refund pages
   - LandingNav top
   - Back button
   - Hero card with eyebrow, title, last-updated, optional info box
   - Sections rendered as collapsible cards
   - Footer
   ───────────────────────────────────────────────────────────────────────── */

export interface LegalSection {
  title: string;
  body: React.ReactNode;
}

interface LegalShellProps {
  eyebrow: string;
  title: string;
  intro: string;
  lastUpdated: string;
  info?: { label: string; rows: { k: string; v: string }[] };
  sections: LegalSection[];
  Icon?: React.ComponentType<any>;
}

const LegalShell: React.FC<LegalShellProps> = ({
  eyebrow,
  title,
  intro,
  lastUpdated,
  info,
  sections,
  Icon = Scale,
}) => {
  const navigate = useNavigate();
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-bg text-ink">
      <LandingNav />

      <main className="max-w-[920px] mx-auto px-4 sm:px-6 pt-4 pb-16">
        <motion.button
          whileTap={tap}
          whileHover={{ x: -2 }}
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-subtle hover:bg-bg text-ink-muted hover:text-ink text-[13px] font-semibold transition-colors mb-3"
        >
          <ChevronLeft size={14} strokeWidth={2.4} />
          Back
        </motion.button>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="card p-7 sm:p-9 mb-3 relative overflow-hidden"
        >
          <motion.div
            aria-hidden
            className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(closest-side, rgb(var(--accent) / 0.16), transparent 65%)',
            }}
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative">
            <div className="icon-chip-lg bg-accent-soft mb-5">
              <Icon size={22} className="text-accent" />
            </div>
            <span className="label-eyebrow">{eyebrow}</span>
            <h1 className="text-[28px] sm:text-[36px] font-bold tracking-tight mt-2 leading-tight">
              {title}
            </h1>
            <p className="text-[14px] sm:text-[15px] text-ink-muted font-medium mt-3 max-w-[640px] leading-relaxed">
              {intro}
            </p>
            <div className="text-[12px] text-ink-dim font-semibold uppercase tracking-wider mt-4">
              Last updated · {lastUpdated}
            </div>
          </div>
        </motion.div>

        {/* Info box (optional) */}
        {info && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.06 }}
            className="card p-5 sm:p-6 mb-3"
          >
            <span className="label-eyebrow">{info.label}</span>
            <dl className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
              {info.rows.map((r) => (
                <div key={r.k} className="flex items-start justify-between gap-3 text-[13px]">
                  <dt className="text-ink-muted font-medium">{r.k}</dt>
                  <dd className="text-ink font-semibold text-right">{r.v}</dd>
                </div>
              ))}
            </dl>
          </motion.div>
        )}

        {/* Sections */}
        <motion.ul
          initial="hidden"
          animate="shown"
          variants={{
            hidden: {},
            shown: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
          }}
          className="space-y-2"
        >
          {sections.map((s, i) => {
            const open = openIdx === i;
            return (
              <motion.li
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  shown: { opacity: 1, y: 0, transition: spring },
                }}
                className="card overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(open ? null : i)}
                  aria-expanded={open}
                  className="w-full p-5 sm:p-6 flex items-start gap-4 text-left group"
                >
                  <div className="shrink-0 w-8 h-8 rounded-full bg-subtle text-ink-muted text-[12px] font-bold grid place-items-center tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <span className="flex-1 text-[15px] sm:text-[16px] font-bold text-ink leading-snug tracking-tight pt-1">
                    {s.title}
                  </span>
                  <span
                    className={`shrink-0 mt-0.5 w-8 h-8 rounded-full grid place-items-center transition-all duration-200 ${
                      open ? 'bg-accent text-on-accent rotate-180' : 'bg-subtle text-ink-muted group-hover:bg-accent-soft group-hover:text-ink'
                    }`}
                  >
                    <ChevronDown size={14} strokeWidth={2.4} />
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.26, ease: [0.2, 0.8, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 sm:px-6 pb-6 pl-[68px] text-[13.5px] sm:text-[14px] text-ink-muted leading-relaxed font-medium space-y-3">
                        {s.body}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </motion.ul>
      </main>

      <Footer />
    </div>
  );
};

export default LegalShell;
