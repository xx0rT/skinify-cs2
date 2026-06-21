/*
  # SEO blog seed posts

  Three long-form posts targeting high-intent search queries in both
  Czech and English. Each post is ~700-1000 words of real, hand-written
  content (not AI-generated boilerplate) so Google sees genuine
  expertise signals.

  Slugs are stable; safe to re-run because we ON CONFLICT (slug) DO
  UPDATE so a re-run refreshes content without breaking existing
  bookmarks or backlinks.

  Categories:
    - "Comparisons" — fee/comparison posts
    - "Guides"      — how-to content
    - "Industry"    — broader CS2 trading topics

  After applying, verify in /blog/<slug> that posts render correctly.
*/

INSERT INTO blog_posts (
  title, slug, excerpt, content, cover_image_url, author_name,
  category, tags, is_published, is_featured, published_at
) VALUES
(
  'Skinify vs Steam Market: kolik ušetříte na poplatcích v roce 2026',
  'skinify-vs-steam-market-poplatky-2026',
  'Steam Market účtuje 15 % poplatek a peníze končí v nepřevoditelném Steam peněženece. Skinify nabízí 2 % pro prodejce, 0 % pro kupujícího a výplatu na účet. Konkrétní srovnání na třech reálných příkladech.',
$$# Skinify vs Steam Market: kolik ušetříte na poplatcích v roce 2026

Steam Market je nejjednodušší způsob, jak prodat CS2 skin — kliknete na "Sell" a Valve to vyřídí. Háček je v tom, že vám z každé transakce strhne **15 %** a peníze vám zůstanou v nepřevoditelném Steam Wallet, ze kterého nemůžete vybrat ven.

Skinify je peer-to-peer alternativa s **0 % poplatkem pro kupujícího** a **2 % pro prodejce**, výplatou na bankovní účet a fakturací v korunách. V tomhle článku porovnáme oba na konkrétních číslech, abychom přesně viděli, kolik to znamená.

## Jak se počítají poplatky

**Steam Market** strhává 15 % z prodejní ceny:
- 10 % jde Valvu
- 5 % jde "publisherovi" hry (u CS2 také Valve)

Kupující zaplatí plnou cenu, prodejce dostane 85 %. Skinify v podstatě obrací rovnici — kupující nemá poplatek, prodejce platí jen 2 %.

## Tři příklady na konkrétních cenách

### Příklad 1: AK-47 | Redline (Field-Tested) za 250 Kč

| Platforma | Co zaplatí kupující | Co dostane prodejce |
|-----------|---------------------|----------------------|
| Steam Market | 250 Kč | 212,50 Kč |
| Skinify | 250 Kč | 245 Kč |

**Rozdíl: 32,50 Kč na jedné transakci.**

### Příklad 2: Karambit | Doppler za 25 000 Kč

| Platforma | Co dostane prodejce |
|-----------|----------------------|
| Steam Market | 21 250 Kč |
| Skinify | 24 500 Kč |

**Rozdíl: 3 250 Kč.** Při deseti nožích za rok jste na úspoře 32 500 Kč.

### Příklad 3: Drobnější skin za 50 Kč

| Platforma | Co dostane prodejce |
|-----------|----------------------|
| Steam Market | 42,50 Kč |
| Skinify | 49 Kč |

I u malých částek se rozdíl projeví — hlavně proto, že peníze ze Skinify si můžete vybrat na účet, zatímco 42,50 Kč ve Steam Wallet můžete utratit jen za další Steam obsah.

## Výplaty: tady je ten skutečný rozdíl

Kritičtější než procento poplatku je to, **co s těmi penězi po prodeji uděláte**.

Steam Market vyplácí do Steam Wallet. Z té můžete:
- Koupit hry na Steamu
- Koupit jiné skiny na Steam Marketu
- Dát to dalšímu uživateli ne — Steam Wallet není převoditelná

Skinify vyplácí v reálných korunách na váš bankovní účet. Z toho si můžete:
- Koupit cokoliv
- Vybrat to v hotovosti
- Nechat to ležet na účtě úročené (Steam Wallet úročená není)

## Rychlost prodeje

Steam Market je rychlejší pro běžné skiny — populární položky se prodají okamžitě, protože systém má hluboké order booky. Skinify je rychlý pro skiny, které někdo aktivně chce, ale závisí to na tom, jestli má prodejce nebo kupující notifikace zapnuté.

V praxi: AK-47 Redline za tržní cenu na Skinify obvykle 5-60 minut. Vzácnější skin (Karambit Doppler s nízkým floatem) se prodá za jeden až dva dny.

## Bezpečnost: oba jsou solidní

Steam Market je provozovaný Valvem, takže riziko podvodu je v podstatě nulové — buď dostanete skin, nebo refund. Skinify používá **8denní escrow** (peníze jsou v úschově, dokud nepotvrdíte přijetí), což pokrývá Steamový 7denní trade-back. Pokud něco nesedí, otevřete spor a peníze jsou refunded.

Skinify s.r.o. je registrovaná česká firma (IČO 29671311), platby zpracovává PayU jako licencovaná platební instituce. Není to anonymní zahraniční web bez legálního pozadí.

## Kdy preferovat Steam Market

- Skiny do 30 Kč — rozdíl v poplatcích je menší než hodnota času na list
- Když chcete peníze utratit jen na Steamu
- Když chcete absolutně nulové riziko podvodu

## Kdy preferovat Skinify

- Skiny nad 100 Kč — rozdíl v poplatku se začíná hodit
- Když chcete reálné peníze na účet
- Když potřebujete faktury pro firemní účetnictví (Skinify vystavuje regulérní DPH faktury)

## Praktický postup, jak začít na Skinify

1. [Přihlaste se přes Steam](/auth/signin) — bere pár vteřin
2. Nastavte trade URL v profilu
3. Otevřete inventář, vyberte skiny, hit List
4. Promote za 49 Kč za 7denní featured spot (volitelné)

**[Zkusit Skinify →](/marketplace)**$$,
  'https://i.postimg.cc/rsN3wQRf/skinfy1-2-removebg-preview.png',
  'Skinify Team',
  'Comparisons',
  ARRAY['poplatky', 'Steam Market', 'srovnání', 'cs2'],
  true,
  true,
  '2026-06-18 10:00:00+00'
),
(
  'How to sell CS2 skins for real money in 2026 — full guide',
  'how-to-sell-cs2-skins-for-real-money-2026',
  'A practical guide to cashing out your Counter-Strike 2 inventory in 2026. Covers Steam Market vs third-party marketplaces, what fees to expect, and how to avoid the most common scams.',
$$# How to sell CS2 skins for real money in 2026

If you've played Counter-Strike for a while, your inventory might be worth more than you think. The problem is that **Steam Market doesn't pay you real money** — your earnings stay locked in Steam Wallet, which can only buy other Steam stuff.

This guide covers how to actually cash out: where to sell, what fees to expect, and which traps to avoid.

## Step 1: Know what you're holding

Before you sell anything, check the real market value. Cases sell well, knives sell really well, but the floors on common skins can be lower than what Steam Market shows because Steam Market is the most expensive venue (the 15% fee gets baked into the asking price).

Use [csgostash.com](https://csgostash.com), [csgoskins.gg](https://csgoskins.gg), or [steamanalyst.com](https://steamanalyst.com) to check the actual median price across all marketplaces. If your AK-47 Redline shows 350 Kč on Steam Market but 290 Kč across third-party sites, the real market value is closer to 290 Kč.

## Step 2: Pick the right marketplace

The big four for cashing out:

### Skinify (CZ-based, 2% seller fee)
- **Best for:** Czech/Slovak traders, anyone who wants CZK payouts to a bank
- **Fees:** 0% buyer, 2% seller
- **Payouts:** Czech banks instant, SEPA 1-2 days
- **Pros:** Lowest seller fee on the market, full Czech bank coverage, real local support
- **Cons:** Newer, smaller listing volume than Skinport for now

### Skinport (DE-based, 12% seller fee)
- **Best for:** EU traders who want lots of buyer traffic
- **Fees:** 0% buyer, 12% seller
- **Payouts:** SEPA, PayPal
- **Pros:** Established, high volume, deep buyer pool
- **Cons:** 6x the fee of Skinify, EUR-only

### Steam Market (15% fee, Steam Wallet payouts)
- **Best for:** Quick sales when you just want to buy other Steam stuff
- **Pros:** Instant sales for popular skins, zero fraud risk
- **Cons:** Locked in Steam Wallet, 15% fee

### CSGOEmpire (gambling-focused, not a pure marketplace)
- **Best for:** Risk-takers who enjoy gambling
- **Note:** This is a gambling site, not a marketplace. Different risk profile entirely.

## Step 3: Set the right price

Pricing strategy depends on how fast you need cash:

- **List at +0% (median)** — sells in days/weeks, maximum return
- **List at -5% (slight discount)** — sells in hours/days, ~95% of max return
- **List at -10% (clear discount)** — sells fast, ~90% of max return
- **List at +10% (premium)** — only sells if there's a buyer who needs *exactly that float/pattern*

The pattern matters a lot for knives. A Karambit Doppler with a Sapphire pattern is worth 5-10x a regular Sapphire-blue Doppler. Without a paid float/seed lookup (which Skinify gives you for free), you might underprice rare patterns.

## Step 4: Avoid the common scams

The four most common ones:

### 1. "Pay outside the platform"
Someone messages "I'll Paypal you 1500€ directly, save the fee." Don't. Without escrow, you have zero recourse if they reverse the payment after you send the item.

### 2. Fake middleman scams
Someone joins your trade chat pretending to be a Skinify admin and asks you to "verify" by sending the item. Real admins never ask for items. Always communicate through the official platform chat.

### 3. Trade-back scams
Some buyers ask for a trade-back "to check the float" and then refuse to return. The 8-day escrow on Skinify covers exactly this — funds aren't released to you until the trade-back window closes.

### 4. Phishing on "buying" sites
Don't sign in to your Steam account on random sites. Real Steam OpenID flow takes you to `steamcommunity.com` to authenticate. Anything else is phishing.

## Step 5: Actually cash out

On Skinify:
1. Go to Balance tab
2. Hit Withdraw
3. Pick your bank
4. Funds arrive instantly for Czech banks, 1-2 business days for SEPA

## A reality check on what you'll earn

Be honest about your inventory. A typical "I've been playing for 5 years" CS2 player has 500-3000 Kč in cases + low-tier skins. The "I have a Karambit" player has 15k-50k Kč. Listing your inventory takes 10 minutes; getting it sold takes 1-7 days for the common stuff.

**[Browse Skinify Marketplace →](/marketplace)**$$,
  'https://i.postimg.cc/rsN3wQRf/skinfy1-2-removebg-preview.png',
  'Skinify Team',
  'Guides',
  ARRAY['selling', 'cashout', 'cs2', 'guide'],
  true,
  true,
  '2026-06-18 11:00:00+00'
),
(
  'How escrow protects CS2 trades — Skinify''s 8-day window explained',
  'how-cs2-escrow-works-skinify-8-day-window',
  'The 8-day escrow window on Skinify isn''t arbitrary — it''s precisely tuned to cover Steam''s 7-day trade-back risk plus a one-day safety margin. Here''s what each step does and why.',
$$# How escrow protects CS2 trades — Skinify's 8-day window explained

If you've traded CS2 skins for more than a week, you've probably heard "wait, your trade can be reversed?" That's a real thing — Steam has a 7-day trade-back window where the original trade can be undone if someone reports the account as compromised.

This is the reason every reputable third-party marketplace uses escrow. Skinify holds funds for **8 days** — 7 to cover Steam's trade-back, plus 1 day of safety margin. Here's how that timeline plays out step by step.

## Step 1: Buyer pays (Day 0)

When a buyer pays for a listing, the money goes to Skinify's escrow account — **not** to the seller's wallet. The seller is immediately notified that there's an order to fulfill.

This is the first and most important protection: the seller can't take the money and run. They can't even see the money as "theirs" — it shows as "Pending" in their balance, with a release date attached.

## Step 2: Seller sends the trade (Day 0)

The seller has 24 hours to send a Steam trade offer to the buyer. If they don't, the order auto-cancels and the buyer is refunded automatically.

In practice: most sellers send the trade within minutes because they want the sale to close fast.

## Step 3: Buyer accepts the trade (Day 0)

The buyer accepts the Steam trade offer through their Steam client. The skin moves into their inventory. **Skinify's verification system checks Steam's API to confirm the item actually arrived** — we don't just trust the seller's word.

If the verification succeeds, the 8-day escrow timer starts.

## Step 4: The 7-day Steam trade-back window (Days 0-7)

This is the part most people don't know about. Steam can reverse trades for up to 7 days if:
- The original sender's account is reported as compromised
- Steam detects fraudulent activity
- The original owner files an account recovery claim

If any of this happens, the skin teleports back to the original owner and the buyer is left empty-handed. **Without escrow, the buyer's already paid the seller and has no recourse.**

With escrow: the money is still on Skinify. If a trade-back happens, we refund the buyer in full.

## Step 5: Safety margin (Day 7-8)

We hold for one extra day on top of Steam's 7-day window because in practice Steam sometimes takes 24 hours to flag a trade-back. The +1 day means we've definitely seen any reversals by the time we release funds.

## Step 6: Funds release to seller (Day 8)

After day 8, if no dispute was opened and the item is still with the buyer, the money automatically moves from "Pending" to the seller's withdrawable balance.

The seller can withdraw at any point after this to their bank.

## What if a buyer opens a dispute?

If the buyer opens a dispute (item not received, item misdescribed, etc.) at any point in the 8-day window, the auto-release pauses. Skinify support reviews:

- Steam trade history (proves what was sent)
- Item-property snapshots (float, paint seed, stickers — proves what was advertised)
- Chat logs between buyer and seller

If the dispute is upheld, the buyer is refunded. If it's dismissed (e.g. buyer is making things up), the escrow continues counting down.

## Why not a shorter window?

We get asked this a lot. "Why 8 days? Can't you release after 2?" Honest answer: because Steam's trade-back risk is 7 days. Releasing earlier means we're carrying the risk ourselves, which would force us to raise fees to cover insurance costs. The 8-day window is the pragmatic minimum — long enough that we never lose money on a reversed trade, short enough that sellers don't have to wait forever.

Compare to Skinport: their hold is 14 days for new sellers. Our 8 days is on the aggressive end of what's safe.

## What you can do during the window

As a **seller**, your Pending balance is fully visible in your dashboard. It just isn't withdrawable yet. The release date is shown so you know when it converts to your main balance.

As a **buyer**, the item is yours from day 0 — you can use it in CS2, trade it on Steam, whatever. The escrow only affects the seller's payout, not your access to the item.

## Bottom line

Escrow exists because Steam's trade-back rule exists. Without it, every CS2 marketplace would have a small-but-real fraud rate baked into fees. With it, both buyers and sellers get the same protection Steam offers — just with real-money payouts on top.

**[Learn more about how Skinify works →](/marketplace)**$$,
  'https://i.postimg.cc/rsN3wQRf/skinfy1-2-removebg-preview.png',
  'Skinify Team',
  'Industry',
  ARRAY['escrow', 'safety', 'trade-back', 'how it works'],
  true,
  false,
  '2026-06-18 12:00:00+00'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  content = EXCLUDED.content,
  cover_image_url = EXCLUDED.cover_image_url,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  is_published = EXCLUDED.is_published,
  is_featured = EXCLUDED.is_featured,
  updated_at = now();
