/* ─────────────────────────────────────────────────────────────────────────
   SEO landing page content.

   Each entry is a long-form page targeting a specific search query. The
   shared SeoLandingPage component reads from this list and renders the
   right copy + structured-data based on the URL slug.

   We keep the copy in plain TS (not Markdown) so it ships in the same
   JS bundle, is statically discoverable by Google's first-pass HTML
   renderer (after React hydrates), AND so we can drop in real links
   to /marketplace + product pages right inside the prose. The hand-
   written copy beats AI-generated boilerplate for ranking because it
   describes the real product (fees, escrow window, supported skins)
   accurately.

   Targeting:
   - cs/* slugs → Czech buyers searching in Czech.
   - en/* slugs → wider English-speaking market.
   - vs/*       → comparison queries which have buying intent.
   ───────────────────────────────────────────────────────────────────────── */

export interface SeoLandingPageContent {
  slug: string;
  /** ISO language code for the page; drives <html lang> and hreflang. */
  lang: 'cs' | 'en';
  /** SERP title — under 60 chars to avoid truncation. */
  title: string;
  /** SERP meta description — 150-160 chars max. */
  description: string;
  /** Big H1 at the top of the page. */
  h1: string;
  /** One-line lede shown under the H1. */
  lede: string;
  /** Hero CTA button label + href. */
  cta: { label: string; href: string };
  /** Section blocks rendered in order. Each renders as an H2 + paragraphs. */
  sections: Array<{
    h2: string;
    paragraphs: string[];
    /** Optional bullet list rendered after the paragraphs. */
    bullets?: string[];
  }>;
  /** FAQ rendered as expandable details + FAQPage JSON-LD. */
  faq: Array<{ q: string; a: string }>;
  /** Internal cross-links to surface related pages — boosts crawl coverage. */
  related: Array<{ label: string; href: string }>;
}

export const SEO_LANDING_PAGES: SeoLandingPageContent[] = [
  /* ─── Czech landing pages ───────────────────────────────────────────── */
  {
    slug: 'cs2-skiny-koupit',
    lang: 'cs',
    title: 'CS2 skiny koupit — Skinify · 0 % poplatky pro kupující',
    description:
      'Bezpečné nákupy CS2 skinů s nulovými poplatky pro kupující. Escrow chrání každý obchod, dodání do Steam inventáře během minut. AK-47, AWP, nože a další.',
    h1: 'CS2 skiny koupit — bezpečně a bez poplatků',
    lede:
      'Skinify je český marketplace pro Counter-Strike 2. Nakoupíte přímo od jiných hráčů, peníze jsou v úschově, dokud nedostanete skin přes Steam trade nabídku.',
    cta: { label: 'Prohlédnout marketplace', href: '/marketplace' },
    sections: [
      {
        h2: 'Proč nakoupit CS2 skiny právě tady',
        paragraphs: [
          'Steam Market účtuje 15 % poplatek a peníze končí v nepřevoditelném Steam peněžence — nemůžete je vybrat ven. Skinify má pro kupujícího 0 % a pro prodejce 2 %, vše v reálných korunách s výplatou na účet nebo platební bránou.',
          'Každý obchod prochází 8denním escrow oknem, které kryje Steamový 7denní trade-back. Pokud prodejce neposlal skin nebo nastal jiný problém, dostanete plný refund — peníze nejsou nikdy přímo u prodejce před potvrzením.',
        ],
        bullets: [
          'Nulové poplatky pro kupujícího',
          'Úschova chrání proti podvodu i vrácení obchodu Steamem',
          'Platba kartou, bankovním převodem, Apple Pay nebo BLIK přes PayU',
          'Český zákaznický support, fakturace v Kč',
        ],
      },
      {
        h2: 'Jak nákup probíhá',
        paragraphs: [
          'Vyberete skin na marketplace, přidáte do košíku a zaplatíte. Peníze jdou rovnou do escrow, ne prodejci. Prodejce dostane notifikaci a odešle vám skin přes Steam trade nabídku — obvykle během minut.',
          'Když přijmete trade nabídku ve Steamu, Skinify začne odpočítávat 8denní bezpečnostní okno (kryje 7denní Steam trade-hold). Po jeho uplynutí se peníze automaticky uvolní prodejci. Kdykoliv předtím můžete otevřít spor, pokud něco nesedí.',
        ],
      },
      {
        h2: 'Které CS2 skiny tu najdete',
        paragraphs: [
          'Marketplace pokrývá všechny zbraně, nože, rukavice, samolepky a cases. Floaty a paint seeds jsou skutečné hodnoty z herního Game Coordinatoru (přes CSFloat), ne odhady.',
        ],
        bullets: [
          'AK-47, M4A4, M4A1-S, AWP a další pušky',
          'Karambit, M9 Bayonet, Butterfly Knife, Talon — všechny vzory',
          'Sport Gloves, Specialist, Driver — kompletní řada rukavic',
          'Glock-18, USP-S, Desert Eagle a pistole',
          'Souvenir a StatTrak verze tam, kde existují',
        ],
      },
    ],
    faq: [
      {
        q: 'Je Skinify bezpečný?',
        a: 'Ano. Každý obchod prochází 8denním escrow oknem, peníze jdou prodejci až po potvrzení doručení. Pokud něco nesedí, dostanete plný refund. Provozovatelem je česká s.r.o. (IČO 29671311) se sídlem v Praze.',
      },
      {
        q: 'Jaké jsou poplatky?',
        a: 'Pro kupujícího 0 %. Pro prodejce 2 % z prodejní ceny. Pro srovnání: Steam Market účtuje 15 % a peníze nelze vybrat ven.',
      },
      {
        q: 'Jak dlouho trvá doručení skinu?',
        a: 'Většinou minuty až hodiny. Prodejce dostane okamžitou notifikaci po vaší platbě a pošle Steam trade nabídku. Ta vám přijde do Steam klienta, kde ji přijmete jedním klikem.',
      },
      {
        q: 'Co když prodejce skin neposlal?',
        a: 'Otevřete spor přes Skinify chat nebo support. Peníze jsou stále v escrow, nikdy nebyly fyzicky u prodejce. Refund proběhne během 24 hodin.',
      },
      {
        q: 'Můžu platit českou kartou nebo bankovním převodem?',
        a: 'Ano. Skinify používá PayU jako platební bránu. Akceptujeme všechny české banky (ČSOB, KB, Česká spořitelna, Fio, mBank, Raiffeisenbank, UniCredit, Air Bank), karty Visa/Mastercard, Apple Pay a Google Pay.',
      },
    ],
    related: [
      { label: 'Marketplace', href: '/marketplace' },
      { label: 'Nakoupit AK-47 skiny', href: '/weapons/Rifles/AK-47' },
      { label: 'Nakoupit AWP skiny', href: '/weapons/Rifles/AWP' },
      { label: 'Nakoupit nože', href: '/weapons/Knives/Karambit' },
      { label: 'Skinify vs Steam Market', href: '/vs/steam-market' },
      { label: 'Jak escrow funguje', href: '/dispute-resolution' },
    ],
  },
  {
    slug: 'cs2-nuze-koupit',
    lang: 'cs',
    title: 'CS2 nože koupit — Karambit, M9 Bayonet, Butterfly | Skinify',
    description:
      'Bezpečný nákup CS2 nožů s ověřenými floaty a paint seedy. Karambit Doppler, M9 Bayonet, Butterfly Knife. 0 % poplatky pro kupujícího, escrow ochrana.',
    h1: 'CS2 nože koupit — od Karambitu po Talona',
    lede:
      'Kompletní katalog CS2 nožů s reálnými hodnotami float a paint seed pro každý kus. Nakupujte s 0% poplatkem a escrow zárukou.',
    cta: { label: 'Prohlédnout nože', href: '/weapons/Knives/Karambit' },
    sections: [
      {
        h2: 'Nejhledanější CS2 nože',
        paragraphs: [
          'Karambit a M9 Bayonet jsou stabilně nejdražší nože ve hře. Doppler, Marble Fade a Tiger Tooth varianty dosahují cen v desítkách tisíc korun. Float pod 0.01 (Factory New) a low paint seed často zdvojnásobuje cenu.',
        ],
        bullets: [
          'Karambit — Doppler, Marble Fade, Fade, Tiger Tooth, Crimson Web',
          'M9 Bayonet — všechny finishe včetně rare patterns',
          'Butterfly Knife — Doppler, Tiger Tooth, Lore',
          'Talon Knife — novější série, rychle stoupající trh',
          'Bayonet, Flip, Gut, Karambit Survival a další klasiky',
        ],
      },
      {
        h2: 'Float a paint seed — proč na nich záleží',
        paragraphs: [
          'Float (wear value, 0.0–1.0) určuje kolik opotřebení skin má. Nižší = lepší. Factory New jde od 0.00 do 0.07.',
          'Paint seed určuje konkrétní vzor na noži. U Doppler Karambitu rozhoduje, jestli je to obyčejná Sapphire nebo vzácná Ruby — rozdíl v ceně může být řádový. Skinify zobrazuje skutečný paint seed pro každý listing přes CSFloat.',
        ],
      },
    ],
    faq: [
      {
        q: 'Jak rozeznám pravý low-float Karambit?',
        a: 'Skinify zobrazuje skutečný float fetched přes CSFloat API přímo z Game Coordinatoru. Nejde o odhad — je to ta hodnota, kterou vidíte ve Steam klientu při inspektu.',
      },
      {
        q: 'Můžu si nůž před koupí prohlédnout?',
        a: 'Ano. Každý listing má inspect link, který otevře skin přímo v CS2 klientu. Tam vidíte všechny detaily — wear, paint seed, případně samolepky.',
      },
      {
        q: 'Co je StatTrak verze nože?',
        a: 'StatTrak nůž počítá zabití v CS2. Cena je obvykle 1.5–2× vyšší než ne-StatTrak. Skinify má StatTrak filter na marketplace.',
      },
    ],
    related: [
      { label: 'Karambit Doppler', href: '/weapons/Knives/Karambit' },
      { label: 'M9 Bayonet', href: '/weapons/Knives/M9%20Bayonet' },
      { label: 'Butterfly Knife', href: '/weapons/Knives/Butterfly%20Knife' },
      { label: 'Talon Knife', href: '/weapons/Knives/Talon%20Knife' },
      { label: 'Sport Gloves', href: '/weapons/Gloves/Sport%20Gloves' },
    ],
  },

  /* ─── English landing pages ─────────────────────────────────────────── */
  {
    slug: 'buy-cs2-skins',
    lang: 'en',
    title: 'Buy CS2 Skins — Skinify · 0% Buyer Fees · Escrow Protected',
    description:
      'Buy Counter-Strike 2 skins safely with zero buyer fees and full escrow protection. AK-47, AWP, Karambit, Butterfly Knife — instant Steam delivery.',
    h1: 'Buy CS2 skins safely with 0% buyer fees',
    lede:
      'Skinify is a peer-to-peer Counter-Strike 2 marketplace. Pay in your local currency, items arrive via Steam trade within minutes, funds held in escrow until you confirm.',
    cta: { label: 'Browse the marketplace', href: '/marketplace' },
    sections: [
      {
        h2: 'Why buy CS2 skins on Skinify',
        paragraphs: [
          'Steam Market takes 15% on every trade and keeps your money locked in a non-cashable wallet. Skinify charges 0% to buyers and 2% to sellers, all in real currency you can withdraw to your bank.',
          'Every trade goes through an 8-day escrow window that covers Steam\'s 7-day trade-back period plus a one-day safety margin. If anything goes wrong — seller no-shows, item misdescribed, dispute — your money is refunded in full because it never sat with the seller in the first place.',
        ],
        bullets: [
          '0% buyer fee on every transaction',
          'Escrow holds funds for 8 days — covers Steam trade-back risk',
          'Real float, paint seed, paint index via CSFloat for every listing',
          'Pay with card, Apple Pay, Google Pay or bank transfer (CZ banks via PayU)',
        ],
      },
      {
        h2: 'How buying works',
        paragraphs: [
          'Pick a skin on the marketplace, add it to your cart, pay via PayU. Your payment goes straight to escrow — not to the seller\'s wallet. The seller is notified instantly and sends you a Steam trade offer, usually within minutes.',
          'Accept the trade in Steam. Skinify\'s 8-day escrow timer starts. After it expires, funds release to the seller automatically. You can open a dispute any time before that if the trade didn\'t come through correctly.',
        ],
      },
      {
        h2: 'What you can buy',
        paragraphs: [
          'Skinify covers every CS2 item category — rifles, pistols, SMGs, shotguns, snipers, knives, gloves, stickers, cases, agents.',
        ],
        bullets: [
          'AK-47, M4A4, M4A1-S, AWP, FAMAS, Galil, AUG and SG 553',
          'Karambit, M9 Bayonet, Butterfly Knife, Talon, Bayonet, Skeleton',
          'Sport Gloves, Specialist Gloves, Driver Gloves, Moto Gloves',
          'Glock-18, USP-S, Desert Eagle, P250, Five-SeveN, Tec-9',
          'Souvenir + StatTrak variants where available',
        ],
      },
    ],
    faq: [
      {
        q: 'Is Skinify safe?',
        a: 'Yes. Every purchase is escrow-protected — your money never reaches the seller until you confirm receipt. If the trade fails for any reason, you get a full refund. Skinify s.r.o. is a registered Czech business (ID 29671311) based in Prague.',
      },
      {
        q: 'What are the fees?',
        a: '0% for buyers. 2% for sellers. Compare to Steam Market\'s 15% cut paid in non-cashable wallet credit.',
      },
      {
        q: 'How fast is delivery?',
        a: 'Usually minutes to a few hours. The seller is notified instantly when you pay and sends a Steam trade offer. Once you accept the trade in your Steam client, the skin is yours.',
      },
      {
        q: 'What payment methods do you accept?',
        a: 'Cards (Visa, Mastercard, Amex), Apple Pay, Google Pay, BLIK, and direct bank transfer from any major Czech bank — ČSOB, Komerční banka, Česká spořitelna, Fio, mBank, Raiffeisenbank, UniCredit, Air Bank. All processed by PayU.',
      },
      {
        q: 'Can I sell on Skinify too?',
        a: 'Yes. Sign in with Steam, link your trade URL, and list items from your inventory at any price you want. Sellers pay 2% of the final sale price; everything else is yours.',
      },
    ],
    related: [
      { label: 'Marketplace', href: '/marketplace' },
      { label: 'Buy AK-47 skins', href: '/weapons/Rifles/AK-47' },
      { label: 'Buy AWP skins', href: '/weapons/Rifles/AWP' },
      { label: 'Buy CS2 knives', href: '/weapons/Knives/Karambit' },
      { label: 'Sell on Skinify', href: '/cs2-sell-skins' },
      { label: 'Skinify vs Steam Market', href: '/vs/steam-market' },
    ],
  },
  {
    slug: 'cs2-sell-skins',
    lang: 'en',
    title: 'Sell CS2 Skins for Real Money — Skinify · 2% Seller Fee',
    description:
      'Sell your CS2 skins for cash, not Steam wallet credit. 2% flat fee, instant withdrawals to bank. List from your Steam inventory in under a minute.',
    h1: 'Sell CS2 skins for real money',
    lede:
      'Cash out your Counter-Strike 2 inventory directly to your bank account. Skinify charges a flat 2% — no Steam-wallet-only payouts, no 15% market cut.',
    cta: { label: 'Sign in and start listing', href: '/auth/signin' },
    sections: [
      {
        h2: 'Real money payouts, not Steam credit',
        paragraphs: [
          'Steam Market is a one-way street — you can sell skins but the money is stuck in Steam Wallet. Skinify pays out in real currency to your bank via PayU, with full invoicing for businesses.',
          'Our flat 2% seller fee is what you pay per sale. There are no listing fees, no monthly costs, no withdrawal fees.',
        ],
        bullets: [
          'Withdraw to any Czech bank account in CZK',
          'EUR / USD withdrawals to international IBANs',
          '2% flat fee per sale, nothing else',
          'No listing fees, no monthly fees, no minimum withdrawal',
        ],
      },
      {
        h2: 'List from your Steam inventory',
        paragraphs: [
          'Sign in with Steam OpenID, link your trade URL, and your CS2 inventory loads automatically. Pick items, set prices, hit list. Bulk listing supported — you can put dozens of items on the marketplace in one click.',
          'Skinify supports buy-now (fixed price) and auction listings. Promote a listing to the top of the marketplace + Trending Now for 49 Kč / 7 days.',
        ],
      },
      {
        h2: 'When does the money arrive',
        paragraphs: [
          'When a buyer pays, funds enter your Pending Balance immediately. Steam\'s 7-day trade-back window applies to every trade — once it closes (we hold +1 day as safety margin), funds move from Pending to your main balance, withdrawable any time.',
        ],
      },
    ],
    faq: [
      {
        q: 'How much do I actually receive per sale?',
        a: '98% of the listing price. Skinify charges a flat 2% seller fee. So a 1000 Kč skin = 980 Kč to your balance.',
      },
      {
        q: 'How do I withdraw the money?',
        a: 'From your Balance tab. Withdrawals go to the bank account linked to your payment method. Czech bank transfers are instant; international SEPA arrives within 1-2 business days.',
      },
      {
        q: 'Can I cancel a listing?',
        a: 'Yes, any time before a buyer pays. Once paid, the order moves into escrow and you commit to sending the item.',
      },
      {
        q: 'What if my item gets traded back by Steam?',
        a: 'That\'s exactly why we hold an 8-day escrow. Steam\'s 7-day trade-back window is over by the time you receive payment, so the risk is on us, not on the buyer.',
      },
    ],
    related: [
      { label: 'My listings', href: '/profile?tab=listings' },
      { label: 'Inventory', href: '/profile?tab=inventory' },
      { label: 'Balance & withdrawals', href: '/profile?tab=balance' },
      { label: 'Seller fees explained', href: '/faq' },
    ],
  },

  /* ─── Comparison pages ──────────────────────────────────────────────── */
  {
    slug: 'vs/steam-market',
    lang: 'en',
    title: 'Skinify vs Steam Market — Compare Fees, Speed, Cashout',
    description:
      'Skinify charges 0% buyer fee and 2% seller fee, pays out in real money. Steam Market charges 15% and locks payouts in Steam wallet. Full comparison.',
    h1: 'Skinify vs Steam Market — which CS2 marketplace is better?',
    lede:
      'Both let you buy and sell Counter-Strike 2 skins. They\'re very different in fees, payouts, and what you can do with the money.',
    cta: { label: 'Try Skinify', href: '/marketplace' },
    sections: [
      {
        h2: 'Fees',
        paragraphs: [
          'Steam Market takes 15% on every transaction — 10% to Valve, 5% to the CS2 publisher. This applies to both buyer and seller (the buyer pays the full sticker price, the seller receives 85%).',
          'Skinify takes 0% from the buyer and 2% from the seller. A 1000 Kč skin nets the seller 980 Kč on Skinify vs 850 Kč on Steam Market — a 130 Kč difference (~15%) per sale.',
        ],
      },
      {
        h2: 'Payouts',
        paragraphs: [
          'The biggest gap. Steam Market pays sellers into Steam Wallet, which can only buy other Steam content — you can\'t withdraw to a bank, can\'t spend it outside Steam, can\'t give it to someone else.',
          'Skinify pays out in real currency (CZK, EUR, USD) to your bank. Payouts arrive instantly for Czech banks, 1-2 days for international SEPA.',
        ],
      },
      {
        h2: 'Speed',
        paragraphs: [
          'Steam Market sales are instant for popular items — they fill from the lowest sell order. Skinify sales depend on the seller responding; usually minutes, occasionally hours for rare items.',
          'Buying speed is comparable. Skinify\'s 8-day escrow means the item lands in your Steam inventory the same day, just like Steam Market.',
        ],
      },
      {
        h2: 'Safety',
        paragraphs: [
          'Steam Market is run by Valve — about as safe as it gets. There\'s no fraud risk; either you get the item or you get a refund.',
          'Skinify is a third-party marketplace, so the safety question is real. We cover it with mandatory 8-day escrow — funds never touch the seller until you confirm receipt. Every dispute opened in that window pauses the release. The legal entity is Skinify s.r.o., a registered Czech business.',
        ],
      },
    ],
    faq: [
      {
        q: 'Why would I sell on Skinify instead of Steam Market?',
        a: 'You want real cash, not Steam wallet credit. You\'d rather pay 2% than 15%. You want to cash out your CS2 collection.',
      },
      {
        q: 'Why would I buy on Skinify instead of Steam Market?',
        a: 'Identical prices end up cheaper on Skinify because there\'s no 15% surcharge. You also get real float / paint seed data for every listing, which Steam Market doesn\'t show.',
      },
      {
        q: 'Is Skinify legal?',
        a: 'Yes. Skinify s.r.o. is a registered Czech company (IČO 29671311). All transactions are tax-receipted, payments processed by PayU (licensed payment institution).',
      },
    ],
    related: [
      { label: 'Skinify vs Skinport', href: '/vs/skinport' },
      { label: 'Skinify vs CSGOEmpire', href: '/vs/csgoempire' },
      { label: 'Browse the marketplace', href: '/marketplace' },
      { label: 'Sell on Skinify', href: '/cs2-sell-skins' },
    ],
  },
  {
    slug: 'vs/skinport',
    lang: 'en',
    title: 'Skinify vs Skinport — CS2 Marketplace Fee & Feature Comparison',
    description:
      'Compare Skinify (Czech-based, 2% seller fee, PayU payments) vs Skinport (German-based, 12% seller fee). Both bypass Steam wallet — see which fits you.',
    h1: 'Skinify vs Skinport',
    lede:
      'Both are EU-based CS2 marketplaces that pay in real currency, not Steam wallet. They differ on fees, payment methods, and target market.',
    cta: { label: 'Browse Skinify', href: '/marketplace' },
    sections: [
      {
        h2: 'Fees',
        paragraphs: [
          'Skinport charges sellers 12% of the sale price (recently raised from 10%). Buyers pay 0%.',
          'Skinify charges sellers 2% and buyers 0%. On a 1000 Kč sale, you keep 980 Kč on Skinify vs 880 Kč on Skinport.',
        ],
      },
      {
        h2: 'Payment methods',
        paragraphs: [
          'Skinport supports cards, SEPA, PayPal, BLIK, Klarna, and some crypto. Strong international coverage.',
          'Skinify uses PayU as the payment processor — full Czech bank coverage (ČSOB, KB, ČS, Fio, mBank, Raiffeisenbank, UniCredit, Air Bank, Moneta), cards, Apple Pay, Google Pay. International cards work too.',
        ],
      },
      {
        h2: 'Withdrawals',
        paragraphs: [
          'Skinport pays out via SEPA (EUR) and some other methods. Minimum withdrawal applies.',
          'Skinify pays out in CZK directly to Czech bank accounts (instant via bank-transfer rail), EUR/USD via SEPA. No minimum withdrawal.',
        ],
      },
      {
        h2: 'Trust signals',
        paragraphs: [
          'Skinport has been around since 2018, processes ~$100M/year in volume. Established and trusted.',
          'Skinify is newer but operates under the same legal regime (EU company, regulated payment processor). The 8-day escrow window is the same safety mechanism.',
        ],
      },
    ],
    faq: [
      {
        q: 'Which has lower fees?',
        a: 'Skinify — 2% seller fee vs Skinport\'s 12%. Both have 0% buyer fees.',
      },
      {
        q: 'Which is faster?',
        a: 'Both deliver via Steam trade offers, so speed depends on the seller. Same average response time.',
      },
      {
        q: 'Can I use both?',
        a: 'Yes. Many sellers list on multiple marketplaces. Skinify\'s 2% fee makes it the cheaper venue for most listings.',
      },
    ],
    related: [
      { label: 'Skinify vs Steam Market', href: '/vs/steam-market' },
      { label: 'Skinify vs CSGOEmpire', href: '/vs/csgoempire' },
      { label: 'Browse Skinify', href: '/marketplace' },
    ],
  },
  {
    slug: 'vs/csgoempire',
    lang: 'en',
    title: 'Skinify vs CSGOEmpire — Marketplace vs Gambling Site Compared',
    description:
      'Skinify is a peer-to-peer skin marketplace (buy & sell). CSGOEmpire is a skin gambling site (roulette, coin flip). They serve different needs — see which.',
    h1: 'Skinify vs CSGOEmpire — different products entirely',
    lede:
      'These often come up together because both deal in CS2 skins, but they\'re not direct competitors. Here\'s what each actually does.',
    cta: { label: 'Browse the marketplace', href: '/marketplace' },
    sections: [
      {
        h2: 'What each one is',
        paragraphs: [
          'CSGOEmpire is a skin gambling site — roulette, coin flip, jackpot, case opening. You deposit skins (or money), bet, win or lose. Regulated under Curaçao gaming license.',
          'Skinify is a peer-to-peer marketplace — you buy and sell skins, no gambling. The transactions are direct trades between users with escrow protection. Regulated as a Czech e-commerce business.',
        ],
      },
      {
        h2: 'When to use Skinify',
        paragraphs: [
          'You want to buy a specific skin at a known price, or cash out skins you already own. No volatility, no chance involved — you pay X and get the item Y.',
        ],
      },
      {
        h2: 'When to use CSGOEmpire',
        paragraphs: [
          'You enjoy gambling and want to risk skins (or money) for a chance at higher-value items. Different product, different risk profile, different legal regime.',
        ],
      },
    ],
    faq: [
      {
        q: 'Can I withdraw my CSGOEmpire winnings on Skinify?',
        a: 'You\'d withdraw the skins from CSGOEmpire to your Steam inventory, then list them on Skinify if you want cash. Both platforms are independent.',
      },
      {
        q: 'Which is safer?',
        a: 'Different risk profiles. Skinify has zero gambling — every transaction is a fixed-price trade with escrow. CSGOEmpire is gambling — you can lose your skins.',
      },
    ],
    related: [
      { label: 'Skinify vs Steam Market', href: '/vs/steam-market' },
      { label: 'Skinify vs Skinport', href: '/vs/skinport' },
      { label: 'Marketplace', href: '/marketplace' },
    ],
  },
];

/* Helper for the route resolver. */
export function findSeoLandingPage(slug: string): SeoLandingPageContent | undefined {
  return SEO_LANDING_PAGES.find((p) => p.slug === slug);
}
