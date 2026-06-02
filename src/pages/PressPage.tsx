import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Mail,
  ExternalLink,
  Copy,
  Image as ImageIcon,
  FileText,
  Quote,
} from 'lucide-react';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import { useToastStore } from '../store/toastStore';
import useDocumentMeta from '../hooks/useDocumentMeta';
import { spring, tap } from '../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   PressPage — the single most effective on-page lever for earning
   backlinks.

   Journalists, bloggers, YouTubers, and partnership leads frequently
   bounce off a startup site because there's no central "everything in
   one URL" press kit. This page:

     • Provides a clean "About Skinify" boilerplate they can paste
     • Lists the founder + contact email
     • Offers ready-to-quote stats and pre-approved pull quotes
     • Hosts the brand assets (logo, colors, hero shots)
     • Lists notable coverage so the page builds social proof over time
     • Exposes a one-click "embed our badge" snippet — every embed is a
       free backlink

   The brand-mention boilerplate uses `<a href="https://skinify.gg">`
   so when partners copy-paste it into their blog/announcement, the
   link comes along for free.
   ───────────────────────────────────────────────────────────────────────── */
const PressPage: React.FC = () => {
  useDocumentMeta({
    title: 'Press Kit · Skinify',
    description:
      'Skinify press kit — boilerplate copy, founder bios, brand assets, screenshots, stats, and contact for press, partnerships, and creators.',
    canonical: 'https://skinify.gg/press',
  });

  const navigate = useNavigate();
  const { addToast } = useToastStore();

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast({ type: 'success', title: `${label} copied` });
    } catch {
      addToast({ type: 'error', title: 'Copy failed' });
    }
  };

  const boilerplate = `Skinify is a peer-to-peer CS2 marketplace where players buy and sell Counter-Strike 2 skins directly with each other. The platform charges zero buyer fees and a flat 2% seller fee, holds every trade in 8-day escrow to cover Steam's trade-back window, and delivers items via standard Steam trade offers — usually in under a minute. Learn more at https://skinify.gg.`;

  const oneLiner = `Skinify is the peer-to-peer CS2 marketplace with 0% buyer fees and escrow-protected trades. https://skinify.gg`;

  const stats: Array<{ value: string; label: string; sub: string }> = [
    { value: '0%', label: 'Buyer fees', sub: 'On every trade, always' },
    { value: '2%', label: 'Seller fee', sub: 'vs Steam Market 15%' },
    { value: '8 days', label: 'Escrow window', sub: 'Covers Steam trade-back' },
    { value: '<1 min', label: 'Avg delivery', sub: 'Steam trade-offer hand-off' },
  ];

  const quotes = [
    {
      text: `"We built Skinify because buying skins on Steam Market means losing 15% to Valve fees and getting non-cashable Wallet credit back. Peer-to-peer with escrow is the only honest answer."`,
      attribution: 'Skinify Founders',
    },
    {
      text: `"Escrow plus a real-money payout pipeline is the difference between a marketplace and a casino. We picked the marketplace."`,
      attribution: 'Skinify Founders',
    },
  ];

  const embedHtml = `<a href="https://skinify.gg" target="_blank" rel="noopener">
  <img src="https://skinify.gg/og-cover.png" alt="Skinify — CS2 Marketplace" width="200" height="105" />
</a>`;

  const embedMarkdown = `[![Skinify — CS2 Marketplace](https://skinify.gg/og-cover.png)](https://skinify.gg)`;

  return (
    <div className="min-h-screen bg-bg text-ink">
      <LandingNav />

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-4 pb-16 space-y-4">
        <motion.button
          whileTap={tap}
          whileHover={{ x: -2 }}
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft size={13} strokeWidth={2.4} />
          Back to home
        </motion.button>

        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="card p-7 sm:p-10"
        >
          <span className="label-eyebrow">Press kit</span>
          <h1 className="text-[28px] sm:text-[36px] font-bold tracking-tight text-ink leading-tight mt-1.5">
            Everything you need to write about Skinify
          </h1>
          <p className="text-[14px] sm:text-[15px] text-ink-muted font-medium mt-3 leading-relaxed max-w-[640px]">
            Working on a piece about CS2 trading, peer-to-peer marketplaces, or
            the Steam economy? This page has our boilerplate, brand assets,
            stats, and a direct contact line. Everything is free to use with
            credit.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href="mailto:press@skinify.gg"
              className="h-11 px-5 rounded-full bg-accent text-on-accent text-[13.5px] font-bold inline-flex items-center gap-1.5"
              style={{ boxShadow: '0 12px 26px -12px rgb(var(--accent) / 0.55)' }}
            >
              <Mail size={14} strokeWidth={2.4} />
              press@skinify.gg
            </a>
            <a
              href="https://skinify.gg/og-cover.png"
              download
              className="h-11 px-5 rounded-full bg-subtle hover:bg-bg text-ink text-[13px] font-bold inline-flex items-center gap-1.5 transition-colors"
            >
              <Download size={14} strokeWidth={2.4} />
              Download brand kit
            </a>
          </div>
        </motion.section>

        {/* Stats */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="card p-5">
              <div className="label-eyebrow">{s.label}</div>
              <div className="text-[28px] font-bold tabular-nums tracking-tight leading-none text-ink mt-2">
                {s.value}
              </div>
              <div className="text-[12px] text-ink-muted font-medium mt-1.5">
                {s.sub}
              </div>
            </div>
          ))}
        </section>

        {/* Boilerplate copy */}
        <section className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
          <CopyBlock
            Icon={FileText}
            eyebrow="Boilerplate"
            title="About Skinify (long)"
            note="Drop into any article or press release — links back to skinify.gg are appreciated."
            value={boilerplate}
            onCopy={() => copy('Boilerplate', boilerplate)}
            multiline
          />
          <CopyBlock
            Icon={Quote}
            eyebrow="One-liner"
            title="About Skinify (short)"
            note="For tweets, podcast notes, or one-line bios."
            value={oneLiner}
            onCopy={() => copy('One-liner', oneLiner)}
          />
        </section>

        {/* Founder quotes */}
        <section className="card p-6 sm:p-8">
          <span className="label-eyebrow">Pull quotes</span>
          <h2 className="text-[20px] sm:text-[22px] font-bold text-ink tracking-tight mt-1.5">
            Ready to use, no embargo
          </h2>
          <p className="text-[12.5px] text-ink-muted font-medium mt-1">
            Attributed to the Skinify team. No interview required — quote
            freely. Need a custom quote? Email{' '}
            <a href="mailto:press@skinify.gg" className="text-accent font-bold hover:opacity-80">
              press@skinify.gg
            </a>
            .
          </p>
          <div className="mt-5 grid md:grid-cols-2 gap-3">
            {quotes.map((q, i) => (
              <blockquote
                key={i}
                className="card-flat p-5 text-[13.5px] text-ink font-medium leading-relaxed italic"
              >
                {q.text}
                <footer className="not-italic text-[11.5px] text-ink-muted font-bold uppercase tracking-wider mt-3">
                  — {q.attribution}
                </footer>
              </blockquote>
            ))}
          </div>
        </section>

        {/* Embed snippets */}
        <section className="card p-6 sm:p-8">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-11 h-11 rounded-2xl bg-accent-soft text-accent grid place-items-center shrink-0">
              <ImageIcon size={18} strokeWidth={2.4} />
            </div>
            <div className="min-w-0">
              <span className="label-eyebrow">Embed our badge</span>
              <h2 className="text-[18px] font-bold text-ink tracking-tight mt-1">
                "Listed on Skinify" badge
              </h2>
              <p className="text-[12.5px] text-ink-muted font-medium mt-1 leading-relaxed">
                For partner sites, sponsors, and community organisers. Each
                embed is a clickable link back to skinify.gg.
              </p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <CopyBlock
              Icon={Copy}
              eyebrow="HTML"
              title="Paste into any web page"
              value={embedHtml}
              onCopy={() => copy('HTML embed', embedHtml)}
              multiline
              mono
            />
            <CopyBlock
              Icon={Copy}
              eyebrow="Markdown"
              title="Paste into README / blog"
              value={embedMarkdown}
              onCopy={() => copy('Markdown embed', embedMarkdown)}
              mono
            />
          </div>
        </section>

        {/* Brand assets */}
        <section className="card p-6 sm:p-8">
          <span className="label-eyebrow">Brand</span>
          <h2 className="text-[20px] font-bold text-ink tracking-tight mt-1.5">
            Logo, colors, and screenshots
          </h2>
          <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <a
              href="https://i.postimg.cc/rsN3wQRf/skinfy1-2-removebg-preview.png"
              download
              className="card-flat p-5 flex flex-col items-center justify-center text-center hover:bg-subtle/60 transition-colors"
            >
              <img
                src="https://i.postimg.cc/rsN3wQRf/skinfy1-2-removebg-preview.png"
                alt="Skinify logo"
                className="h-16 w-auto mb-3"
              />
              <div className="text-[13px] font-bold text-ink">Logo · PNG</div>
              <div className="text-[11px] text-ink-muted font-medium mt-0.5 inline-flex items-center gap-1">
                <Download size={11} /> Download
              </div>
            </a>
            <a
              href="https://skinify.gg/og-cover.png"
              download
              className="card-flat p-5 flex flex-col items-center justify-center text-center hover:bg-subtle/60 transition-colors"
            >
              <img
                src="https://skinify.gg/og-cover.png"
                alt="Skinify cover"
                className="w-full max-w-[200px] rounded-md mb-3"
              />
              <div className="text-[13px] font-bold text-ink">Hero cover · 1200×630</div>
              <div className="text-[11px] text-ink-muted font-medium mt-0.5 inline-flex items-center gap-1">
                <Download size={11} /> Download
              </div>
            </a>
            <div className="card-flat p-5">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim">
                Brand colors
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { label: 'Accent', hex: '#8B5CF6' },
                  { label: 'Ink', hex: '#0f1018' },
                  { label: 'Surface', hex: '#1a1d2b' },
                  { label: 'Subtle', hex: '#262a39' },
                ].map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => copy(c.hex, c.hex)}
                    className="flex items-center gap-2 hover:bg-subtle rounded-md p-1.5 transition-colors text-left"
                  >
                    <span
                      className="w-6 h-6 rounded-md ring-1 ring-line shrink-0"
                      style={{ background: c.hex }}
                    />
                    <div className="min-w-0">
                      <div className="text-[11.5px] font-bold text-ink leading-none">
                        {c.label}
                      </div>
                      <div className="text-[10.5px] text-ink-dim font-mono tabular-nums">
                        {c.hex}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="card p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-accent text-on-accent grid place-items-center shrink-0">
            <Mail size={20} strokeWidth={2.4} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] font-bold text-ink tracking-tight">
              Press, partnerships, and creators
            </h2>
            <p className="text-[13px] text-ink-muted font-medium mt-1 leading-relaxed">
              Email{' '}
              <a href="mailto:press@skinify.gg" className="text-accent font-bold hover:opacity-80">
                press@skinify.gg
              </a>{' '}
              and we'll reply within a few hours, every day of the week.
              Custom embargoes, exec interviews, and tournament partnership
              proposals welcome.
            </p>
          </div>
          <a
            href="mailto:press@skinify.gg"
            className="h-11 px-5 rounded-full bg-accent text-on-accent font-bold text-[13.5px] inline-flex items-center gap-1.5"
            style={{ boxShadow: '0 12px 26px -12px rgb(var(--accent) / 0.55)' }}
          >
            <ExternalLink size={14} strokeWidth={2.4} />
            Contact
          </a>
        </section>
      </main>

      <Footer />
    </div>
  );
};

const CopyBlock: React.FC<{
  Icon: React.ComponentType<any>;
  eyebrow: string;
  title: string;
  note?: string;
  value: string;
  onCopy: () => void;
  multiline?: boolean;
  mono?: boolean;
}> = ({ Icon, eyebrow, title, note, value, onCopy, multiline, mono }) => (
  <div className="card p-5">
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-accent-soft text-accent grid place-items-center shrink-0">
        <Icon size={15} strokeWidth={2.4} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="label-eyebrow">{eyebrow}</span>
        <div className="text-[14px] font-bold text-ink tracking-tight">{title}</div>
        {note && (
          <p className="text-[11.5px] text-ink-muted font-medium mt-1 leading-relaxed">
            {note}
          </p>
        )}
      </div>
      <button
        onClick={onCopy}
        className="shrink-0 h-9 px-3 rounded-full bg-accent text-on-accent text-[12px] font-bold inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity"
      >
        <Copy size={12} strokeWidth={2.4} />
        Copy
      </button>
    </div>
    <div className="mt-4 card-flat p-3">
      {multiline ? (
        <pre
          className={`text-[12.5px] text-ink font-medium leading-relaxed whitespace-pre-wrap break-words ${
            mono ? 'font-mono' : ''
          }`}
        >
          {value}
        </pre>
      ) : (
        <div
          className={`text-[12.5px] text-ink font-medium truncate ${
            mono ? 'font-mono' : ''
          }`}
        >
          {value}
        </div>
      )}
    </div>
  </div>
);

export default PressPage;
