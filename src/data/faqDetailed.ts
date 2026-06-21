/* ─────────────────────────────────────────────────────────────────────────
   Detailed FAQ content.

   Each entry powers an individual /faq/<slug> page. We keep:
     - `slug`         — URL fragment + canonical key
     - `category`     — same taxonomy as the FAQ index
     - `question`     — short title shown on the index AND as the page H1
     - `answer`       — short answer for the index accordion (1-2 sentences)
     - `body`         — long-form answer for the detail page (multiple
                        paragraphs, headings, lists — rendered as
                        structured prose). Markdown-flavoured but we
                        process as plain blocks via the renderer.
     - `related`      — slugs of other FAQs that are useful next reads.
                        Internal links boost crawl depth + dwell time.
     - `cta`          — optional in-content CTA pointing at a real
                        site action.

   Why hand-written long-form instead of AI-padding the existing
   answers: Google's "helpful content" update rewards genuine
   expertise. The questions here describe the actual Skinify product
   (8-day escrow, 2% seller fee, real CSFloat-fetched floats, PayU
   processor, Steam OpenID auth) — pages that show specifics outrank
   pages that bullet-point platitudes.
   ───────────────────────────────────────────────────────────────────────── */

export type FaqCategory =
  | 'General'
  | 'Security'
  | 'Fees'
  | 'Trading'
  | 'Payment'
  | 'Support';

export interface FaqDetail {
  slug: string;
  category: FaqCategory;
  question: string;
  answer: string;
  /** Long-form body. Array of blocks rendered in order. */
  body: FaqBlock[];
  related: string[];
  cta?: { label: string; href: string };
}

export type FaqBlock =
  | { type: 'p'; text: string }
  | { type: 'h'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'note'; text: string };

export const FAQ_DETAILS: FaqDetail[] = [
  {
    slug: 'what-is-skinify',
    category: 'General',
    question: 'What is Skinify?',
    answer:
      'Skinify is a peer-to-peer marketplace for CS2 skins, knives, gloves, and cases. 0% buyer fee, 2% seller fee, escrow-protected trades, and real-money payouts.',
    body: [
      { type: 'p', text: 'Skinify is a Czech-based marketplace where Counter-Strike 2 players buy and sell skins directly with each other. We don\'t hold the skins ourselves — every trade is a peer-to-peer Steam trade between the original seller and the new buyer, with our platform handling payment, escrow, and dispute resolution.' },
      { type: 'h', text: 'How it differs from Steam Market' },
      { type: 'ul', items: [
        '0% buyer fee vs Steam Market\'s 15% cut',
        '2% seller fee vs Steam Market\'s 15% (you keep 98% instead of 85%)',
        'Real currency payouts to your bank account instead of Steam Wallet',
        'Real float and paint seed values fetched from CSFloat for every listing',
      ]},
      { type: 'h', text: 'How it differs from Skinport' },
      { type: 'p', text: 'Skinport charges sellers 12% — six times what we charge. Both platforms use escrow, both pay in real money, but the fee gap means you keep more of every sale on Skinify. We also have native Czech bank support via PayU, whereas Skinport routes through SEPA.' },
      { type: 'h', text: 'Who runs Skinify' },
      { type: 'p', text: 'Skinify s.r.o. — a registered Czech limited company (IČO 29671311) headquartered at Grafická 3365/1, 150 00 Praha 5. Payments are processed by PayU, a licensed European payment institution. All transactions are tax-receipted and we issue VAT invoices for business customers.' },
    ],
    related: ['how-does-escrow-work', 'what-are-the-fees', 'is-skinify-safe', 'how-to-sell-cs2-skins'],
    cta: { label: 'Browse the marketplace', href: '/marketplace' },
  },
  {
    slug: 'how-does-escrow-work',
    category: 'Security',
    question: 'How does Skinify\'s escrow work?',
    answer:
      'When you pay, your funds sit in escrow for 8 days. The seller sends the item via Steam trade, you confirm receipt, and after Steam\'s 7-day trade-back window passes (plus 1 day safety margin) funds release to the seller.',
    body: [
      { type: 'p', text: 'Escrow is the single most important safety feature on Skinify. When you pay for a listing, your money goes to a Skinify-controlled escrow account — not directly to the seller. The seller can see they have an order to fulfill, but they cannot touch the money until our system releases it.' },
      { type: 'h', text: 'Why 8 days specifically' },
      { type: 'p', text: 'Steam itself allows trades to be reversed for up to 7 days after they happen — this is the "trade-back" window. If a seller\'s Steam account gets compromised and Steam recovers it during those 7 days, the trade can be undone and your skin moves back to the original owner. Without escrow, you\'d be out the money AND the skin.' },
      { type: 'p', text: 'We hold for 7 days (matching Steam\'s window) plus 1 day of safety margin. Once the trade-back risk is gone, funds release to the seller automatically.' },
      { type: 'h', text: 'Step-by-step timeline' },
      { type: 'ul', items: [
        'Day 0: Buyer pays. Money enters Skinify escrow.',
        'Day 0: Seller is notified, sends Steam trade offer.',
        'Day 0: Buyer accepts trade in Steam. Skinify verifies the item arrived via Steam API.',
        'Day 0-8: Escrow timer counts down. Either party can open a dispute.',
        'Day 8: Funds auto-release to seller\'s withdrawable balance.',
      ]},
      { type: 'note', text: 'Disputes pause the timer. If you open a dispute on day 3, the clock stops until support resolves it.' },
      { type: 'h', text: 'What if I never receive the item?' },
      { type: 'p', text: 'The buyer always has the option to dispute. If the seller never sent the trade, or sent a different item than advertised, support reviews the evidence (Steam trade history, listing screenshots, chat logs) and refunds the buyer in full. The seller pays a strike on their account.' },
    ],
    related: ['is-skinify-safe', 'what-if-trade-fails', 'how-long-does-trade-take', 'what-is-skinify'],
    cta: { label: 'Read the trading guide', href: '/trading-guide' },
  },
  {
    slug: 'what-are-the-fees',
    category: 'Fees',
    question: 'What are Skinify\'s fees?',
    answer:
      '0% for buyers. 2% for sellers. No listing fees, no monthly fees, no minimum withdrawal. Compare to Steam Market\'s 15% or Skinport\'s 12%.',
    body: [
      { type: 'p', text: 'Skinify\'s fee structure is intentionally simple — we make money only when a sale closes successfully.' },
      { type: 'h', text: 'Buyer fees' },
      { type: 'p', text: 'You pay 0% to Skinify. The price you see on a listing is the price you pay. There are no service charges, no platform fees, no buyer-side cut. The seller pays the marketplace fee out of their proceeds.' },
      { type: 'h', text: 'Seller fees' },
      { type: 'p', text: '2% of the listing price, deducted when the sale closes. Example: list at 1000 Kč, sale closes, you receive 980 Kč.' },
      { type: 'p', text: 'There are no upfront fees. Creating a listing is free, editing the price is free, removing a listing is free, having a listing sit unsold for months is free.' },
      { type: 'h', text: 'Payment-processor fees' },
      { type: 'p', text: 'When you deposit funds, PayU (our payment processor) may charge a small percentage depending on the method — typically 1-2% for cards, 0% for Czech bank transfers, ~3% for paysafecard. These fees are shown before you confirm the deposit.' },
      { type: 'h', text: 'Withdrawal fees' },
      { type: 'ul', items: [
        'Czech bank transfer (CSOB, KB, Fio, mBank, etc.): 0 Kč',
        'SEPA international: 0 Kč under 10,000 Kč, 50 Kč above',
        'Card refund (rare, for unused deposits): handled by PayU\'s rules',
      ]},
      { type: 'h', text: 'Promotion fees (optional)' },
      { type: 'p', text: '49 Kč buys 7 days of "Promoted" placement on a listing — the item appears in the Trending Now strip on the landing page and at the top of marketplace search. Optional; most sellers don\'t use it.' },
    ],
    related: ['skinify-vs-steam-market', 'how-to-withdraw-money', 'what-is-skinify'],
    cta: { label: 'Compare to Steam Market', href: '/vs/steam-market' },
  },
  {
    slug: 'is-skinify-safe',
    category: 'Security',
    question: 'Is Skinify safe?',
    answer:
      'Yes. Every trade is escrow-protected for 8 days. Skinify s.r.o. is a registered Czech business, payments are processed by PayU (a licensed EU payment institution).',
    body: [
      { type: 'p', text: 'Safety on Skinify is layered: escrow on every trade, regulated payment processing, real legal entity behind the platform, and active fraud monitoring.' },
      { type: 'h', text: 'Trade safety' },
      { type: 'p', text: 'Every purchase enters our 8-day escrow window. Your money never sits with the seller until you\'ve received the item and the Steam trade-back risk has passed. If anything goes wrong — seller no-show, wrong item, dispute — you get a full refund.' },
      { type: 'h', text: 'Payment safety' },
      { type: 'p', text: 'Payments are processed by PayU, a licensed payment institution regulated under EU law. Your card details never touch Skinify\'s servers — they go directly from your browser to PayU\'s tokenisation API. We never see your CVV, full card number, or banking credentials.' },
      { type: 'h', text: 'Account safety' },
      { type: 'p', text: 'You sign in via Steam OpenID, which means Skinify never receives your Steam password. Anyone asking for your Steam password while pretending to be us is impersonating Skinify — report and ignore. Trade URLs are stored encrypted at rest.' },
      { type: 'h', text: 'The legal entity' },
      { type: 'p', text: 'Skinify s.r.o. is a Czech limited company (IČO 29671311), incorporated in 2026, headquartered at Grafická 3365/1, Praha 5. We issue real VAT invoices and pay Czech corporate income tax. This isn\'t an anonymous offshore site.' },
      { type: 'note', text: 'No marketplace can guarantee 100% safety against social-engineering scams (phishing, impersonation). The single biggest thing you can do to protect yourself: never type your Steam password into a site other than steamcommunity.com, and never accept Steam trade offers from people you don\'t recognise.' },
    ],
    related: ['how-does-escrow-work', 'does-skinify-ask-steam-password', 'what-if-trade-fails', 'what-is-skinify'],
  },
  {
    slug: 'how-long-does-trade-take',
    category: 'Trading',
    question: 'How long does a trade take?',
    answer:
      'Usually minutes. The seller is notified instantly when you pay, sends a Steam trade offer, you accept it in the Steam client. Skin lands in your inventory the same session.',
    body: [
      { type: 'p', text: 'Speed depends on three things: how quickly the seller responds, whether you have the Steam Mobile Authenticator set up, and whether either side is on Steam\'s 15-day "trade hold" cooldown.' },
      { type: 'h', text: 'Typical timeline (Mobile Authenticator enabled)' },
      { type: 'ul', items: [
        '0:00 — Buyer pays',
        '0:02 — Seller gets notification + email',
        '0:05 — Seller sends Steam trade offer',
        '0:06 — Buyer accepts trade in Steam client',
        '0:07 — Skin arrives in buyer\'s inventory',
      ]},
      { type: 'p', text: 'Median completion across all Skinify trades is under 5 minutes when both parties are online. P95 is about 2 hours (sellers who weren\'t online when the order came in).' },
      { type: 'h', text: 'Without Mobile Authenticator' },
      { type: 'p', text: 'Steam itself imposes a 15-day trade hold on accounts without the Mobile Authenticator. We can\'t bypass this — it\'s a Steam-level rule. If you\'re trading without Mobile Auth, expect a 15-day wait before items actually arrive. We strongly recommend enabling Mobile Auth before trading.' },
      { type: 'h', text: 'What slows trades down' },
      { type: 'ul', items: [
        'Seller offline or away from keyboard',
        'Steam Mobile Authenticator not enabled (15-day hold)',
        'Seller\'s account on Steam Guard 7-day trade hold',
        'Steam API outage (rare — we retry automatically)',
      ]},
    ],
    related: ['how-does-escrow-work', 'what-if-trade-fails', 'do-i-need-mobile-authenticator'],
  },
  {
    slug: 'how-to-sell-cs2-skins',
    category: 'Trading',
    question: 'How do I sell my CS2 skins?',
    answer:
      'Sign in with Steam, link your trade URL, open Inventory, pick items, set prices, hit List. You can list dozens of items in one click via bulk listing.',
    body: [
      { type: 'p', text: 'Selling on Skinify takes under a minute end-to-end. Here\'s the full flow.' },
      { type: 'h', text: 'Step 1: Sign in with Steam' },
      { type: 'p', text: 'Click "Sign in with Steam" anywhere on the site. You\'re redirected to Steam\'s official OpenID page, log in there, and bounce back to Skinify. We never see your Steam password — only your public Steam ID.' },
      { type: 'h', text: 'Step 2: Add your trade URL' },
      { type: 'p', text: 'Open your Steam Trade Offers page (steamcommunity.com/my/tradeoffers/privacy), copy the URL, and paste it into Skinify\'s onboarding screen. This is how buyers send you items when you sell. You only do this once.' },
      { type: 'h', text: 'Step 3: List items from your inventory' },
      { type: 'p', text: 'Profile → Inventory shows your tradable CS2 items. Click any item to start a listing, or tick multiple items and hit "List selected" for bulk listing. The bulk modal lets you set per-item prices, add descriptions, and pick listing type (fixed price or auction).' },
      { type: 'h', text: 'Step 4: Wait for a buyer' },
      { type: 'p', text: 'Listings appear on the marketplace immediately. When someone buys, you get a notification + email; you have 24 hours to send the Steam trade offer or the order auto-cancels (and the buyer is refunded).' },
      { type: 'h', text: 'Step 5: Send the Steam trade offer' },
      { type: 'p', text: 'From Profile → Listings or directly via the email notification, click "Send trade." This opens Steam with the trade pre-filled — just confirm and Steam delivers it to the buyer.' },
      { type: 'h', text: 'Step 6: Wait for funds to release' },
      { type: 'p', text: 'After the buyer accepts the trade in Steam, the 8-day escrow countdown begins. After 8 days, funds move from Pending to your withdrawable balance, where you can cash out to your bank.' },
    ],
    related: ['what-are-the-fees', 'how-to-withdraw-money', 'how-does-escrow-work'],
    cta: { label: 'Open your inventory', href: '/profile?tab=inventory' },
  },
  {
    slug: 'how-to-withdraw-money',
    category: 'Payment',
    question: 'How do I withdraw money to my bank?',
    answer:
      'Open Profile → Balance → Withdraw. Pick your bank, enter the amount, confirm. Czech bank transfers arrive instantly; international SEPA takes 1-2 business days.',
    body: [
      { type: 'p', text: 'Withdrawing from Skinify is direct — no minimums, no monthly limits, no PayPal middleman. Funds go straight from your Skinify balance to your bank account.' },
      { type: 'h', text: 'Supported withdrawal methods' },
      { type: 'ul', items: [
        'Czech bank transfer (instant): CSOB, KB, Česká spořitelna, Fio, mBank, Raiffeisenbank, UniCredit, Air Bank, Moneta',
        'SEPA international (1-2 business days)',
        'Card refund (only for unused deposits, returns to original card)',
      ]},
      { type: 'h', text: 'How long does it take' },
      { type: 'ul', items: [
        'Czech bank instant payment: 1-30 seconds',
        'Czech bank standard transfer: same business day if before 14:00 CET',
        'SEPA: 1-2 business days',
      ]},
      { type: 'h', text: 'Withdrawal fees' },
      { type: 'p', text: 'Czech bank withdrawals are free. SEPA international: free under 10,000 Kč, 50 Kč flat above. Card refunds: whatever PayU charges (typically 0 for refunds back to the original card).' },
      { type: 'h', text: 'What if my balance is in Pending' },
      { type: 'p', text: 'Pending balance is escrowed from recent sales — it can\'t be withdrawn until the 8-day Steam trade-back window passes. Your Balance tab shows the release date for each Pending entry. Once released, the funds move to your main (withdrawable) balance automatically.' },
      { type: 'h', text: 'KYC threshold' },
      { type: 'p', text: 'Withdrawals over €500 (~12,200 Kč) require identity verification. We use KYC-as-a-service (a third-party document checker — driver\'s license / passport + selfie). Verification takes 5-10 minutes and only needs to happen once. Below the threshold, no KYC required.' },
    ],
    related: ['what-are-the-fees', 'how-to-sell-cs2-skins', 'how-does-escrow-work'],
  },
  {
    slug: 'do-i-need-mobile-authenticator',
    category: 'Security',
    question: 'Do I need the Steam Mobile Authenticator?',
    answer:
      'Yes, strongly recommended. Without it, Steam puts a 15-day hold on all your trades — we can\'t override this. With it, trades complete in minutes.',
    body: [
      { type: 'p', text: 'The Steam Mobile Authenticator (also called Steam Guard Mobile or Mobile 2FA) is Valve\'s mobile-app-based 2-factor authentication for Steam. It\'s separate from email 2FA — only the mobile app gets you out of the 15-day trade hold.' },
      { type: 'h', text: 'Why Steam imposes a 15-day hold without it' },
      { type: 'p', text: 'When an account doesn\'t have Mobile Authenticator, Steam considers it harder to verify the trader is legitimate. As a security measure, all trades from such accounts are held in Steam-side escrow for 15 days. We can\'t bypass this — it\'s a Valve policy enforced at the Steam API level.' },
      { type: 'h', text: 'How to enable Mobile Authenticator' },
      { type: 'ul', items: [
        'Download the Steam mobile app (iOS / Android)',
        'Sign in with your Steam credentials',
        'Settings → Steam Guard → Add Authenticator',
        'Enter a phone number, receive SMS code, write down the recovery code',
        'Wait 7 days for the cooldown to clear (one-time hold)',
      ]},
      { type: 'p', text: 'After the 7-day cooldown, all your future trades complete instantly instead of going through 15-day escrow.' },
      { type: 'h', text: 'What about other 2FA methods' },
      { type: 'p', text: 'Email 2FA, hardware keys, and other methods don\'t exempt you from the trade hold. Only the Steam Mobile Authenticator does, because it confirms each trade via the app at trade time.' },
    ],
    related: ['how-long-does-trade-take', 'is-skinify-safe', 'how-does-escrow-work'],
  },
  {
    slug: 'what-if-trade-fails',
    category: 'Trading',
    question: 'What happens if a trade fails?',
    answer:
      'You get a full refund. Funds are held in escrow until you confirm receipt — if the trade never completes, the seller never sees the money and you\'re refunded automatically.',
    body: [
      { type: 'p', text: 'Trade failures fall into three buckets: seller no-shows, items don\'t match the listing, or Steam reverses the trade post-delivery. Each is handled differently but the buyer is always refunded in full.' },
      { type: 'h', text: 'Scenario 1: Seller never sends the trade' },
      { type: 'p', text: 'Sellers have 24 hours after a purchase to send the Steam trade offer. If they don\'t, the order auto-cancels and the buyer is refunded immediately. The seller gets a "fulfillment strike" on their account; three strikes triggers a temporary listing ban.' },
      { type: 'h', text: 'Scenario 2: Item doesn\'t match the listing' },
      { type: 'p', text: 'If the seller sends a Steam trade with a different item than what was listed (wrong skin, different float, missing stickers, etc.), you can reject the Steam trade offer and open a dispute on Skinify. Our team reviews the listing snapshot vs the trade offer and resolves within 24 hours. If the dispute is upheld, you\'re refunded and the seller\'s account is sanctioned.' },
      { type: 'h', text: 'Scenario 3: Steam reverses the trade post-delivery' },
      { type: 'p', text: 'This is the Steam trade-back risk our 8-day escrow exists for. If Steam recovers the seller\'s account during the 7-day trade-back window and reverses the trade, the skin returns to its original owner. Because the escrow hasn\'t released yet, we refund the buyer in full — the seller loses both the skin (Steam took it back) and the money (we refund the buyer).' },
      { type: 'h', text: 'How to open a dispute' },
      { type: 'p', text: 'From the order detail page, click "Open dispute." Provide a short description and any evidence (screenshots, chat logs, Steam trade ID). The escrow timer pauses immediately. Support replies within 24 hours, usually within a few.' },
    ],
    related: ['how-does-escrow-work', 'is-skinify-safe', 'how-to-contact-support'],
  },
  {
    slug: 'skinify-vs-steam-market',
    category: 'Fees',
    question: 'How does Skinify compare to Steam Market?',
    answer:
      'Skinify charges 0% buyer and 2% seller fee, pays out in real money. Steam Market charges 15% and locks payouts in Steam Wallet you can\'t cash out.',
    body: [
      { type: 'p', text: 'Steam Market is the official Valve-run marketplace. It\'s the easiest place to sell skins — one click — but it\'s also the most expensive and the most restrictive.' },
      { type: 'h', text: 'Fee comparison' },
      { type: 'p', text: 'Steam Market takes 15% on every transaction (10% to Valve, 5% to the publisher — for CS2, also Valve). Skinify takes 2% from the seller and nothing from the buyer.' },
      { type: 'p', text: 'On a 1000 Kč skin: Steam Market seller receives 850 Kč. Skinify seller receives 980 Kč. That\'s 130 Kč more per sale, or roughly 15% extra in your pocket.' },
      { type: 'h', text: 'Payout comparison' },
      { type: 'p', text: 'Steam Market pays into Steam Wallet — a balance you can use to buy other Steam content (games, DLC, more skins) but cannot withdraw to a bank. You can\'t spend it on anything outside Steam, can\'t give it to someone else, can\'t cash it out.' },
      { type: 'p', text: 'Skinify pays in real currency directly to your bank. Czech bank instant payment, SEPA, or card refund. You can spend it on rent, groceries, or anything else.' },
      { type: 'h', text: 'Speed comparison' },
      { type: 'p', text: 'Steam Market sales are instant for popular skins — they fill from the lowest sell order automatically. Skinify sales depend on the seller responding to the order; usually 5-30 minutes, occasionally a few hours for rare items.' },
      { type: 'h', text: 'When to use each' },
      { type: 'ul', items: [
        'Steam Market: you don\'t care about the 15% fee + only want to buy more Steam stuff',
        'Skinify: you want real money in your bank account',
      ]},
    ],
    related: ['what-are-the-fees', 'how-to-sell-cs2-skins', 'how-to-withdraw-money'],
    cta: { label: 'Read the full comparison', href: '/vs/steam-market' },
  },
  {
    slug: 'does-skinify-ask-steam-password',
    category: 'Security',
    question: 'Does Skinify ever ask for my Steam password?',
    answer:
      'Never. We use Steam OpenID exclusively. The login flow takes you to Steam\'s official site to authenticate. Anyone claiming to be Skinify and asking for your Steam password is a scammer.',
    body: [
      { type: 'p', text: 'Skinify never sees your Steam password. We use Steam OpenID — Valve\'s standard third-party authentication system — which keeps the password entry entirely on Steam\'s own servers.' },
      { type: 'h', text: 'How the login flow actually works' },
      { type: 'ul', items: [
        'You click "Sign in with Steam" on Skinify',
        'Your browser is redirected to steamcommunity.com/openid/login',
        'You type your Steam password and 2FA code into Steam\'s page',
        'Steam validates and bounces you back to Skinify with a signed token containing your public Steam ID',
        'Skinify reads the token, creates/updates your account, and signs you in',
      ]},
      { type: 'p', text: 'At no point does your password touch Skinify. We can\'t see it, log it, or save it. If our database leaked tomorrow, your Steam credentials would not be in it.' },
      { type: 'h', text: 'Common scam patterns to watch for' },
      { type: 'ul', items: [
        'Fake "Skinify admin" Steam friend request asking for your password to "verify your account"',
        'Lookalike domains (skinifyy.gg, skinify.online, etc.) with phishing login forms',
        'Email "from Skinify" asking you to confirm credentials via a link',
        '"Customer support" in your DMs asking you to share screen / send recovery code',
      ]},
      { type: 'note', text: 'Real Skinify support never DMs first, never asks for credentials, and only communicates through @skinify.gg email addresses or the in-app support chat.' },
    ],
    related: ['is-skinify-safe', 'how-to-contact-support'],
  },
  {
    slug: 'how-to-contact-support',
    category: 'Support',
    question: 'How can I contact Skinify support?',
    answer:
      '24/7 live chat from the Support page, or email support@skinify.gg. Trade disputes get routed to a dedicated team with a 30-minute SLA.',
    body: [
      { type: 'p', text: 'There are three ways to reach Skinify support, each with different response targets.' },
      { type: 'h', text: 'Live chat (fastest)' },
      { type: 'p', text: 'Open the Support page and click "Start live chat." We have agents online 24/7. Median first-response is under 5 minutes during peak hours (CET 10:00-22:00) and under 30 minutes off-peak. Use chat for time-sensitive issues — trade in progress, payment stuck, urgent withdrawal questions.' },
      { type: 'h', text: 'Email (best for documentation)' },
      { type: 'p', text: 'support@skinify.gg. Median response under 4 hours. Use email when you need to attach screenshots, receipts, or longer explanations. Always include your Steam ID and (if relevant) the order ID — speeds up resolution massively.' },
      { type: 'h', text: 'Trade dispute (priority queue)' },
      { type: 'p', text: 'Open from the order detail page. Bypasses general support and routes to the disputes team. 30-minute SLA for active disputes (during business hours) — these are time-sensitive because escrow is involved.' },
      { type: 'h', text: 'What to include when contacting support' },
      { type: 'ul', items: [
        'Your Steam ID (76561198...) — found in Profile',
        'Order ID if the issue is about a specific trade',
        'Screenshots of the problem',
        'Steam trade history link (if relevant)',
        'A clear one-line description of what went wrong',
      ]},
    ],
    related: ['what-if-trade-fails', 'is-skinify-safe'],
  },
];

export function findFaqDetail(slug: string): FaqDetail | undefined {
  return FAQ_DETAILS.find((f) => f.slug === slug);
}
