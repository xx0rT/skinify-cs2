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

const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onRemove }) => {
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
      layout
      initial={{ opacity: 0, x: 48, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 48, scale: 0.96, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.7 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="status"
      aria-live="polite"
      className="relative w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden bg-surface"
      style={{
        // Theme-safe surface: solid surface bg + hairline ring (visible in both
        // light and dark) + soft lift shadow. Previous version relied on a
        // dropped `glass-strong` class so the toast had no background on the
        // light theme and effectively disappeared.
        boxShadow:
          'inset 0 0 0 1px rgb(var(--line)), 0 16px 40px -16px rgba(20,16,40,0.18), 0 4px 12px -6px rgba(20,16,40,0.08)',
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

        {/* close */}
        <button
          onClick={() => onRemove(toast.id)}
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
};

export default ToastNotification;
