import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  Search,
  ShieldCheck,
  Coins,
  Zap,
  MessageCircle,
  HelpCircle,
  CreditCard,
  ArrowRight,
} from 'lucide-react';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import { spring, tap } from '../lib/motion';
import { useT } from '../lib/useT';
import useDocumentMeta, {
  breadcrumbJsonLd,
  faqJsonLd,
} from '../hooks/useDocumentMeta';

/* ─────────────────────────────────────────────────────────────────────────
   /faq — full-page FAQ
   Linear/Stripe-style: search bar at top, category pills, single-column
   list with clean separators. No emoji, no per-item cards, big-question
   typography. Mobile-first.
   ───────────────────────────────────────────────────────────────────────── */

interface FAQItem {
  id: string;
  category: Category;
  question: string;
  answer: string;
}

type Category = 'General' | 'Security' | 'Fees' | 'Trading' | 'Payment' | 'Support';

const CATEGORIES: { id: Category | 'All'; label: string; Icon: React.ComponentType<any>; hue: string }[] = [
  { id: 'All',      label: 'All',       Icon: HelpCircle,   hue: 'lilac' },
  { id: 'General',  label: 'General',   Icon: HelpCircle,   hue: 'stone' },
  { id: 'Security', label: 'Security',  Icon: ShieldCheck,  hue: 'mint' },
  { id: 'Fees',     label: 'Fees',      Icon: Coins,        hue: 'lemon' },
  { id: 'Trading',  label: 'Trading',   Icon: Zap,          hue: 'peach' },
  { id: 'Payment',  label: 'Payment',   Icon: CreditCard,   hue: 'sky' },
  { id: 'Support',  label: 'Support',   Icon: MessageCircle,hue: 'rose' },
];

const FAQ: FAQItem[] = [
  { id: '1',  category: 'General',  question: 'What is Skinify?',
    answer: 'Skinify is a peer-to-peer marketplace for CS2 skins, knives, gloves and other in-game items. Buy and sell with 0% trading fees, escrow protection, and instant payouts.' },
  { id: '2',  category: 'General',  question: 'How do I create an account?',
    answer: "Click 'Sign in with Steam' and authorize through Steam's official login. Your Steam account is your Skinify account — there's no separate registration." },
  { id: '3',  category: 'Security', question: 'Is it safe to trade on Skinify?',
    answer: 'Yes. Every trade is escrow-protected, all sessions use Steam Guard, and our backend monitors trade attempts for fraud. Your card details are handled by your payment provider — we never see them.' },
  { id: '4',  category: 'Security', question: 'How does escrow work?',
    answer: "When you buy, your funds are held in escrow. The seller sends you the item via a Steam trade offer; once you confirm receipt, the funds are credited to the seller's pending balance and released after 8 days (CS2's 7-day trade-back window plus a 1-day safety margin). If a trade fails, the funds are refunded." },
  { id: '5',  category: 'Fees',     question: 'What are the trading fees?',
    answer: "We charge 0% on peer-to-peer trades. You only pay your payment provider's deposit fee (if any) when adding funds. Withdrawal fees depend on the destination method." },
  { id: '6',  category: 'Fees',     question: 'Are there any hidden costs?',
    answer: 'No. The full cost is shown before you confirm any action. Listing items is free. Cancelling unfilled listings is free.' },
  { id: '7',  category: 'Trading',  question: 'How long does a trade take?',
    answer: 'Median completion is under 60 seconds when both parties are online. The seller must send the Steam trade offer manually; once accepted and confirmed, the escrow timer begins.' },
  { id: '8',  category: 'Trading',  question: 'Can I cancel a trade?',
    answer: "Before the seller sends the Steam trade offer, either party can cancel. Once items are sent, cancellation requires the buyer to refuse the offer in Steam. If you've already accepted the items, you'd need to open a dispute." },
  { id: '9',  category: 'Payment',  question: 'What payment methods do you accept?',
    answer: 'Card (Visa, MasterCard, Apple Pay), SEPA bank transfer, and major crypto (BTC, ETH, USDT). Methods available may vary by region.' },
  { id: '10', category: 'Payment',  question: 'How do I withdraw my funds?',
    answer: 'Go to Profile → Balance → Withdraw, pick the method, enter the amount, and confirm. Withdrawals typically process within 24 hours; verified users get same-day payouts.' },
  { id: '11', category: 'Support',  question: 'How can I contact support?',
    answer: '24/7 live chat from the Help page, or email support@skinify.gg. Critical trade issues are routed to a dedicated team and answered within 30 minutes.' },
  { id: '12', category: 'Support',  question: 'What if I have a dispute with another user?',
    answer: "Open a support ticket with the order ID. Disputes freeze the escrow timer and the funds. Our team reviews evidence from both sides — Steam trade history, chat logs, inventory diffs — and usually resolves within 24 hours." },
  { id: '13', category: 'General',  question: 'Do I need a Steam Mobile Authenticator?',
    answer: 'Yes. Steam requires Mobile Authenticator confirmation for all trades. Without it, trade offers are held in a 15-day escrow by Steam itself, which our platform cannot bypass. We strongly recommend enabling it before you start trading.' },
  { id: '14', category: 'General',  question: 'Why is my Steam inventory not loading?',
    answer: "Your Steam inventory must be set to Public for us to fetch it. Go to Steam → Profile → Edit Profile → Privacy Settings → Inventory → Public. After changing, hit refresh in the Inventory tab. There's a 60-second cache, so you may need to wait a minute." },
  { id: '15', category: 'Security', question: 'What happens if my Steam account gets compromised?',
    answer: 'Contact Skinify support immediately so we can pause any active trades. We can\'t recover your Steam account — that requires Steam Support — but we can protect your Skinify balance and pending withdrawals while you regain access.' },
  { id: '16', category: 'Security', question: 'Does Skinify ever ask for my Steam password?',
    answer: 'Never. We only use Steam OpenID, which authenticates you on Steam\'s servers and sends us a one-way token. Anyone asking for your Steam password while pretending to be Skinify support is impersonating us — report and ignore.' },
  { id: '17', category: 'Fees',     question: 'Are there fees for sellers?',
    answer: 'Sellers pay a 2% listing fee that\'s deducted when the item sells. VIP Gold reduces it to 1.5%, Platinum to 1.0%, and Diamond to 0%. There are no upfront listing fees and no charge for unsold items.' },
  { id: '18', category: 'Fees',     question: 'Do withdrawal fees vary?',
    answer: 'Card and PayPal withdrawals charge 1.5% (capped at 200 Kč). SEPA bank transfer is a flat 50 Kč. Crypto withdrawals charge the network fee at the time of payout. VIP Diamond gets one free withdrawal per week.' },
  { id: '19', category: 'Trading',  question: 'Can I sell stickers separately from the gun?',
    answer: 'No — CS2 stickers are physically applied to weapons and cannot be detached. The gun listing inherits the stickers and their value. Scrape-able stickers can be removed in-game, but they\'re destroyed when scraped, not returned to your inventory.' },
  { id: '20', category: 'Trading',  question: 'How does the float value affect pricing?',
    answer: 'Float is the wear value of a skin (0.00 = pristine, 1.00 = battle-scarred). Within a wear bucket, lower floats command a premium — sometimes 5x more for sub-0.0001 Factory New on rare patterns. Our marketplace shows the exact float of every listing.' },
  { id: '21', category: 'Trading',  question: 'What is a "pattern" or "fade percentage"?',
    answer: 'Each skin instance has a pattern seed (0-1000) that determines its visual layout. Famous patterns (e.g. Case Hardened blue gem, Fade 100%) sell at huge premiums. Our listing page shows the pattern template number so collectors can spot rare ones.' },
  { id: '22', category: 'Payment',  question: 'Do you support cryptocurrency?',
    answer: 'Yes — Bitcoin, Ethereum, USDT (ERC-20 and TRC-20), and USDC. Deposits credit after 2 confirmations. Crypto withdrawals are processed within 30 minutes if balance is liquid.' },
  { id: '23', category: 'Payment',  question: 'Is my deposit refundable if I don\'t use it?',
    answer: 'Yes. Unused balance can be withdrawn at any time via the same method used to deposit. Funds spent on items can\'t be refunded by deposit reversal — that\'d need to go through the seller and our dispute process.' },
  { id: '24', category: 'Support',  question: 'How fast does support respond?',
    answer: 'Live chat: under 5 minutes during peak hours, under 30 minutes off-peak. Email: under 4 hours on average. Trade disputes: under 24 hours. VIP users get a dedicated queue with priority response times.' },
];

/* Map FAQ index id → detail-page slug. We only have detail pages for
   the questions worth deep-linking; the rest stay accordion-only.
   Add more here as we write more detail pages. */
const FAQ_TO_DETAIL: Record<string, string> = {
  '1':  'what-is-skinify',
  '2':  'how-to-sell-cs2-skins',
  '3':  'is-skinify-safe',
  '4':  'how-does-escrow-work',
  '5':  'what-are-the-fees',
  '7':  'how-long-does-trade-take',
  '10': 'how-to-withdraw-money',
  '11': 'how-to-contact-support',
  '13': 'do-i-need-mobile-authenticator',
  '16': 'does-skinify-ask-steam-password',
};

const FAQPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [query, setQuery] = useState('');

  useDocumentMeta({
    title: 'CS2 Marketplace FAQ · Skinify',
    description:
      'Answers to the most common questions about buying, selling, and trading CS2 skins on Skinify. Fees, escrow, payouts, security and more.',
    canonical: 'https://skinify.gg/faq',
    keywords:
      'cs2 marketplace faq, skinify faq, cs2 trading help, cs2 escrow, cs2 trade fees, how to buy cs2 skins, how to sell cs2 skins',
    jsonLd: [
      faqJsonLd(
        FAQ.map((f) => ({ question: f.question, answer: f.answer })),
      ),
      breadcrumbJsonLd([
        { name: 'Home', url: 'https://skinify.gg/' },
        { name: 'Help', url: 'https://skinify.gg/support' },
        { name: 'FAQ', url: 'https://skinify.gg/faq' },
      ]),
    ],
  });
  const tr = useT();
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQ.filter((f) => {
      if (activeCategory !== 'All' && f.category !== activeCategory) return false;
      if (!q) return true;
      return (
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q)
      );
    });
  }, [activeCategory, query]);

  return (
    <div className="min-h-screen bg-bg text-ink">
      <LandingNav />

      <main className="max-w-[960px] mx-auto px-4 sm:px-6 pt-4 pb-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="text-center mt-6 mb-8"
        >
          <span className="label-eyebrow">{tr('faq.hero.eyebrow', 'Help center')}</span>
          <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight mt-2 leading-none">
            {tr('faq.hero.title', 'How can we help?')}
          </h1>
          <p className="text-[13.5px] sm:text-[14px] text-ink-muted font-medium mt-3 max-w-md mx-auto">
            {tr('faq.hero.lead', 'Answers to the most common questions about trading on Skinify.')}
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.06 }}
          className="card p-2 mb-4"
        >
          <div className="flex items-center gap-3 px-4 h-12">
            <Search size={18} strokeWidth={2} className="text-ink-muted shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the help center…"
              className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink-dim text-[14px] font-medium"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-[12px] text-ink-muted hover:text-ink font-semibold"
              >
                Clear
              </button>
            )}
          </div>
        </motion.div>

        {/* Categories */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.12 }}
          className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-3 mb-4 -mx-1 px-1"
        >
          {CATEGORIES.map((c) => {
            const active = activeCategory === c.id;
            const Icon = c.Icon;
            return (
              <motion.button
                whileTap={tap}
                key={c.id}
                onClick={() => setActiveCategory(c.id as Category | 'All')}
                className={`relative h-10 px-4 rounded-full text-[13px] font-semibold whitespace-nowrap flex items-center gap-2 transition-colors ${
                  active ? 'text-on-accent' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="faq-cat-pill"
                    className="absolute inset-0 rounded-full bg-accent"
                    transition={spring}
                  />
                )}
                {!active && (
                  <span className="absolute inset-0 rounded-full bg-subtle" aria-hidden />
                )}
                <Icon
                  size={14}
                  strokeWidth={active ? 2.4 : 2}
                  className="relative"
                  style={!active ? { color: `rgb(var(--hue-${c.hue}))` } : undefined}
                />
                <span className="relative">{tr(`faq.cat.${c.id}`, c.label)}</span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Results */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.18 }}
          className="card p-6 md:p-8"
        >
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <HelpCircle size={22} className="mx-auto text-ink-muted mb-3" strokeWidth={2} />
              <p className="text-[14px] text-ink font-bold tracking-tight">No matches</p>
              <p className="text-[12.5px] text-ink-muted font-medium mt-1">
                Try a different keyword or pick another category.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {filtered.map((f) => {
                const open = openId === f.id;
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : f.id)}
                      aria-expanded={open}
                      className="w-full text-left py-5 flex items-start gap-4 group"
                    >
                      <span className="flex-1 text-[15px] sm:text-[16px] font-bold text-ink leading-snug tracking-tight">
                        {tr(`faq.item.${f.id}.q`, f.question)}
                      </span>
                      <span
                        className={`shrink-0 mt-0.5 w-7 h-7 rounded-full grid place-items-center transition-all duration-200 ${
                          open
                            ? 'bg-accent text-on-accent rotate-180'
                            : 'bg-subtle text-ink-muted group-hover:bg-accent-soft group-hover:text-ink'
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
                          <div className="pb-5 pr-12 max-w-3xl">
                            <p className="text-[13.5px] sm:text-[14px] text-ink-muted leading-relaxed font-medium">
                              {tr(`faq.item.${f.id}.a`, f.answer)}
                            </p>
                            {/* If we shipped a detail page for this
                                question, surface a "read more" link.
                                Detail pages have ~5x the content + are
                                indexable per-question — both better SEO
                                and a better user experience. */}
                            {(() => {
                              const detail = FAQ_TO_DETAIL[f.id];
                              if (!detail) return null;
                              return (
                                <button
                                  onClick={() => navigate(`/faq/${detail}`)}
                                  className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-accent hover:underline"
                                >
                                  Read the full answer
                                  <ChevronRight size={12} strokeWidth={2.6} />
                                </button>
                              );
                            })()}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          )}
        </motion.section>

        {/* Contact CTA */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={spring}
          className="card p-6 md:p-8 mt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden"
        >
          <motion.div
            aria-hidden
            className="absolute -bottom-20 -right-20 w-[300px] h-[300px] rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(closest-side, rgb(var(--accent) / 0.14), transparent 65%)',
            }}
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative">
            <span className="label-eyebrow">Still stuck?</span>
            <h2 className="text-[17px] sm:text-[20px] font-bold tracking-tight mt-1.5 leading-none">
              Talk to a human
            </h2>
            <p className="text-[13.5px] text-ink-muted font-medium mt-1.5 max-w-lg">
              Our support team answers within 30 minutes for trade issues, 2 hours for everything else.
            </p>
          </div>
          <motion.button
            whileTap={tap}
            whileHover={{ scale: 1.02 }}
            onClick={() => navigate('/support')}
            className="relative h-12 px-6 rounded-full bg-accent text-on-accent font-bold text-[14px] flex items-center gap-2 shrink-0"
            style={{ boxShadow: '0 10px 24px -10px rgb(var(--accent) / 0.6)' }}
          >
            <MessageCircle size={15} strokeWidth={2.4} />
            Contact support
            <ArrowRight size={14} strokeWidth={2.4} />
          </motion.button>
        </motion.section>
      </main>

      <Footer />
    </div>
  );
};

export default FAQPage;
