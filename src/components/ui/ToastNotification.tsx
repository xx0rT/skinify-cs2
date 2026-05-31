import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
  icon?: React.ReactNode;
}

interface ToastNotificationProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const TYPE_STYLES: Record<
  Toast['type'],
  { color: string; bg: string; ring: string; Icon: React.ComponentType<any> }
> = {
  success: {
    color: '#34D399',
    bg: 'rgba(52, 211, 153, 0.10)',
    ring: 'rgba(52, 211, 153, 0.22)',
    Icon: CheckCircle2,
  },
  error: {
    color: '#FB7185',
    bg: 'rgba(251, 113, 133, 0.10)',
    ring: 'rgba(251, 113, 133, 0.22)',
    Icon: AlertCircle,
  },
  warning: {
    color: '#FBBF24',
    bg: 'rgba(251, 191, 36, 0.10)',
    ring: 'rgba(251, 191, 36, 0.22)',
    Icon: AlertTriangle,
  },
  info: {
    color: '#B587FF', // accent-300 — keeps the purple theme for neutral toasts
    bg: 'rgba(139, 73, 242, 0.12)',
    ring: 'rgba(139, 73, 242, 0.28)',
    Icon: Info,
  },
};

/* forwardRef so AnimatePresence's PopChildMeasure can read this node's
   layout during exit — without it React logs "Function components cannot
   be given refs" on every toast removal. */
const ToastNotification = React.forwardRef<HTMLDivElement, ToastNotificationProps>(({ toast, onRemove }, ref) => {
  const duration = toast.duration ?? 3200;
  const [paused, setPaused] = useState(false);
  const elapsedRef = useRef(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (paused) return;
    const remaining = Math.max(200, duration - elapsedRef.current);
    startRef.current = Date.now();
    const t = setTimeout(() => onRemove(toast.id), remaining);
    return () => {
      elapsedRef.current += Date.now() - startRef.current;
      clearTimeout(t);
    };
  }, [paused, duration, toast.id, onRemove]);

  const s = TYPE_STYLES[toast.type] || TYPE_STYLES.info;
  const Icon = s.Icon;

  return (
    <motion.div
      ref={ref}
      layout="position"
      // Entrance: slide from right, slight overshoot via spring. Exit:
      // quick fade + small slide off right + a tiny scale-down so stacked
      // toasts feel like physical cards being flicked away. `layout="position"`
      // makes the stack reflow smoothly when one toast above us dismisses.
      initial={{ opacity: 0, x: 360, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{
        opacity: 0,
        x: 80,
        scale: 0.92,
        filter: 'blur(2px)',
        transition: { duration: 0.22, ease: [0.4, 0, 0.6, 1] },
      }}
      transition={{ type: 'spring', stiffness: 320, damping: 28, mass: 0.8 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onClick={() => onRemove(toast.id)}
      role="status"
      aria-live="polite"
      className="relative w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden bg-surface cursor-pointer select-none"
      style={{
        // Theme-safe surface: solid surface bg + hairline ring (visible in both
        // light and dark) + soft lift shadow. Toast is fully clickable to
        // dismiss; close button stops propagation if you want to be explicit.
        boxShadow:
          'inset 0 0 0 1px rgb(var(--line)), 0 20px 48px -16px rgba(20,16,40,0.22), 0 4px 12px -6px rgba(20,16,40,0.10)',
      }}
    >
      {/* type-coded left accent strip */}
      <div
        className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
        style={{ background: s.color }}
      />

      <div className="flex items-start gap-3 pl-4 pr-3 py-3.5">
        {/* icon */}
        <div
          className="shrink-0 w-9 h-9 rounded-2xl grid place-items-center"
          style={{ background: s.bg, boxShadow: `inset 0 0 0 1px ${s.ring}` }}
        >
          {toast.icon ?? <Icon size={16} style={{ color: s.color }} strokeWidth={2.4} />}
        </div>

        {/* body */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="text-[13.5px] font-bold text-ink tracking-tight leading-tight">
            {toast.title}
          </div>
          {toast.message && (
            <div className="text-[12.5px] text-ink-muted leading-snug mt-0.5 break-words font-medium">
              {toast.message}
            </div>
          )}
        </div>

        {/* close — stops propagation so the click doesn't double-fire
            with the toast's own click-to-dismiss */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(toast.id);
          }}
          aria-label="Dismiss"
          className="shrink-0 w-7 h-7 rounded-xl text-ink-muted hover:text-ink hover:bg-subtle grid place-items-center transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      {/* progress bar — fills the bottom hairline */}
      <motion.div
        key={paused ? 'paused' : 'running'}
        className="absolute bottom-0 left-0 h-[2px]"
        style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }}
        initial={{ width: `${(elapsedRef.current / duration) * 100}%` }}
        animate={paused ? { width: `${(elapsedRef.current / duration) * 100}%` } : { width: '100%' }}
        transition={{
          duration: paused ? 0 : (duration - elapsedRef.current) / 1000,
          ease: 'linear',
        }}
      />
    </motion.div>
  );
});

ToastNotification.displayName = 'ToastNotification';

export default ToastNotification;
