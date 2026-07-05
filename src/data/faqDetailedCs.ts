/* ─────────────────────────────────────────────────────────────────────────
   Czech translations of the detailed FAQ articles (faqDetailed.ts).

   Keyed by slug. Only `question`, `answer`, and `body` blocks are
   translated — `category`, `related`, `cta.href` stay shared with the
   English source. The detail page merges these over the English entry
   when the active UI language is Czech, so untranslated slugs simply
   fall back to English.
   ───────────────────────────────────────────────────────────────────────── */

import type { FaqBlock } from './faqDetailed';

export interface FaqDetailCs {
  question: string;
  answer: string;
  body: FaqBlock[];
  ctaLabel?: string;
}

export const FAQ_DETAILS_CS: Record<string, FaqDetailCs> = {
  'what-is-skinify': {
    question: 'Co je Skinify?',
    answer:
      'Skinify je peer-to-peer tržiště pro CS2 skiny, nože, rukavice a bedny. 0% poplatek pro kupující, 2% pro prodejce, obchody chráněné escrowem a výplaty v reálných penězích.',
    body: [
      { type: 'p', text: 'Skinify je tržiště se sídlem v Česku, kde hráči Counter-Strike 2 nakupují a prodávají skiny přímo mezi sebou. Skiny nedržíme my — každý obchod je peer-to-peer Steam obchod mezi původním prodejcem a novým kupujícím, přičemž naše platforma zajišťuje platbu, escrow a řešení sporů.' },
      { type: 'h', text: 'Čím se liší od Steam Marketu' },
      { type: 'ul', items: [
        '0% poplatek pro kupující oproti 15% srážce Steam Marketu',
        '2% poplatek pro prodejce oproti 15% (necháte si 98 % místo 85 %)',
        'Výplaty v reálné měně na váš bankovní účet místo Steam Peněženky',
        'Skutečné hodnoty float a paint seed načtené z CSFloat u každé nabídky',
      ]},
      { type: 'h', text: 'Čím se liší od Skinportu' },
      { type: 'p', text: 'Skinport účtuje prodejcům 12 % — šestkrát víc než my. Obě platformy používají escrow a platí v reálných penězích, ale rozdíl v poplatcích znamená, že na Skinify si z každého prodeje necháte víc. Máme také nativní podporu českých bank přes PayU, zatímco Skinport směruje platby přes SEPA.' },
      { type: 'h', text: 'Kdo Skinify provozuje' },
      { type: 'p', text: 'Skinify s.r.o. — registrovaná česká společnost s ručením omezeným (IČO 29671311) se sídlem na adrese Grafická 3365/1, 150 00 Praha 5. Platby zpracovává PayU, licencovaná evropská platební instituce. Všechny transakce jsou daňově doložené a firemním zákazníkům vystavujeme faktury s DPH.' },
    ],
    ctaLabel: 'Procházet tržiště',
  },
  'how-does-escrow-work': {
    question: 'Jak funguje escrow na Skinify?',
    answer:
      'Když zaplatíte, vaše prostředky zůstanou v úschově (escrow) po dobu 8 dnů. Prodejce pošle předmět přes Steam obchod, vy potvrdíte přijetí a po uplynutí 7denního okna Steamu na vrácení obchodu (plus 1 den rezerva) se prostředky uvolní prodejci.',
    body: [
      { type: 'p', text: 'Escrow je nejdůležitější bezpečnostní prvek na Skinify. Když zaplatíte za nabídku, peníze putují na escrow účet spravovaný Skinify — ne přímo prodejci. Prodejce vidí, že má objednávku k vyřízení, ale k penězům se nedostane, dokud je náš systém neuvolní.' },
      { type: 'h', text: 'Proč zrovna 8 dnů' },
      { type: 'p', text: 'Samotný Steam umožňuje vrátit obchod až 7 dní po jeho uskutečnění — to je „trade-back" okno. Pokud je prodejcův Steam účet napaden a Steam ho během těchto 7 dnů obnoví, obchod lze vrátit a skin se přesune zpět původnímu vlastníkovi. Bez escrow byste přišli o peníze I o skin.' },
      { type: 'p', text: 'Držíme 7 dní (odpovídá oknu Steamu) plus 1 den rezervy. Jakmile riziko vrácení pomine, prostředky se prodejci automaticky uvolní.' },
      { type: 'h', text: 'Časová osa krok za krokem' },
      { type: 'ul', items: [
        'Den 0: Kupující platí. Peníze vstupují do escrow Skinify.',
        'Den 0: Prodejce je upozorněn, odesílá Steam trade nabídku.',
        'Den 0: Kupující přijme obchod ve Steamu. Skinify ověří přijetí předmětu přes Steam API.',
        'Den 0–8: Escrow časovač odpočítává. Kterákoli strana může otevřít spor.',
        'Den 8: Prostředky se automaticky uvolní na vybíratelný zůstatek prodejce.',
      ]},
      { type: 'note', text: 'Spory časovač pozastaví. Pokud otevřete spor 3. den, hodiny se zastaví, dokud podpora spor nevyřeší.' },
      { type: 'h', text: 'Co když předmět nikdy nedostanu?' },
      { type: 'p', text: 'Kupující má vždy možnost otevřít spor. Pokud prodejce obchod nikdy neodeslal nebo poslal jiný předmět, než byl inzerován, podpora prověří důkazy (historii Steam obchodů, screenshoty nabídky, chatové logy) a kupujícímu vrátí plnou částku. Prodejce dostane strike na účet.' },
    ],
    ctaLabel: 'Přečíst průvodce obchodováním',
  },
  'what-are-the-fees': {
    question: 'Jaké jsou poplatky na Skinify?',
    answer:
      '0 % pro kupující. 2 % pro prodejce. Žádné poplatky za vystavení, žádné měsíční poplatky, žádný minimální výběr. Srovnejte s 15 % Steam Marketu nebo 12 % Skinportu.',
    body: [
      { type: 'p', text: 'Struktura poplatků na Skinify je záměrně jednoduchá — vyděláváme jen tehdy, když se prodej úspěšně uzavře.' },
      { type: 'h', text: 'Poplatky pro kupující' },
      { type: 'p', text: 'Skinify platíte 0 %. Cena, kterou u nabídky vidíte, je cena, kterou zaplatíte. Žádné servisní poplatky, žádné poplatky platformy. Poplatek tržiště hradí prodejce ze svého výnosu.' },
      { type: 'h', text: 'Poplatky pro prodejce' },
      { type: 'p', text: '2 % z ceny nabídky, strhávají se při uzavření prodeje. Příklad: vystavíte za 1000 Kč, prodej se uzavře, obdržíte 980 Kč.' },
      { type: 'p', text: 'Žádné poplatky předem. Vytvoření nabídky je zdarma, úprava ceny je zdarma, odebrání nabídky je zdarma, i nabídka ležící měsíce neprodaná je zdarma.' },
      { type: 'h', text: 'Poplatky platebního procesoru' },
      { type: 'p', text: 'Při vkladu prostředků může PayU (náš platební procesor) účtovat malé procento podle metody — obvykle 1–2 % u karet, 0 % u českých bankovních převodů, ~3 % u paysafecard. Tyto poplatky se zobrazí před potvrzením vkladu.' },
      { type: 'h', text: 'Poplatky za výběr' },
      { type: 'ul', items: [
        'Český bankovní převod (ČSOB, KB, Fio, mBank atd.): 0 Kč',
        'SEPA mezinárodní: 0 Kč pod 10 000 Kč, 50 Kč nad',
        'Vrácení na kartu (vzácné, u nevyužitých vkladů): dle pravidel PayU',
      ]},
      { type: 'h', text: 'Poplatky za propagaci (volitelné)' },
      { type: 'p', text: '49 Kč koupí 7 dní „propagovaného" umístění nabídky — předmět se objeví v pruhu Aktuálně populární na úvodní stránce a nahoře ve vyhledávání tržiště. Volitelné; většina prodejců to nepoužívá.' },
    ],
    ctaLabel: 'Srovnat se Steam Marketem',
  },
  'is-skinify-safe': {
    question: 'Je Skinify bezpečný?',
    answer:
      'Ano. Každý obchod je chráněn escrowem po dobu 8 dnů. Skinify s.r.o. je registrovaná česká firma, platby zpracovává PayU (licencovaná EU platební instituce).',
    body: [
      { type: 'p', text: 'Bezpečnost na Skinify je vrstvená: escrow u každého obchodu, regulované zpracování plateb, skutečná právnická osoba za platformou a aktivní monitoring podvodů.' },
      { type: 'h', text: 'Bezpečnost obchodů' },
      { type: 'p', text: 'Každý nákup vstupuje do našeho 8denního escrow okna. Vaše peníze nikdy neleží u prodejce, dokud předmět neobdržíte a nepomine riziko vrácení obchodu Steamem. Když se něco pokazí — prodejce se neozve, špatný předmět, spor — dostanete plnou náhradu.' },
      { type: 'h', text: 'Bezpečnost plateb' },
      { type: 'p', text: 'Platby zpracovává PayU, licencovaná platební instituce regulovaná právem EU. Údaje o kartě se nikdy nedostanou na servery Skinify — putují přímo z vašeho prohlížeče do tokenizačního API PayU. Nikdy nevidíme vaše CVV, celé číslo karty ani bankovní údaje.' },
      { type: 'h', text: 'Bezpečnost účtu' },
      { type: 'p', text: 'Přihlašujete se přes Steam OpenID, což znamená, že Skinify nikdy nedostane vaše Steam heslo. Kdokoli chce vaše Steam heslo a vydává se za nás, se za Skinify pouze vydává — nahlaste a ignorujte. Trade URL jsou uloženy šifrovaně.' },
      { type: 'h', text: 'Právnická osoba' },
      { type: 'p', text: 'Skinify s.r.o. je česká společnost s ručením omezeným (IČO 29671311), se sídlem na Grafická 3365/1, Praha 5. Vystavujeme skutečné faktury s DPH a platíme českou daň z příjmu. Není to anonymní offshore web.' },
      { type: 'note', text: 'Žádné tržiště nemůže zaručit 100% ochranu proti podvodům se sociálním inženýrstvím (phishing, vydávání se za někoho). Nejdůležitější věc, kterou pro svou ochranu můžete udělat: nikdy nezadávejte Steam heslo na jiný web než steamcommunity.com a nikdy nepřijímejte Steam trade nabídky od lidí, které nepoznáváte.' },
    ],
  },
  'how-long-does-trade-take': {
    question: 'Jak dlouho trvá obchod?',
    answer:
      'Obvykle minuty. Prodejce je upozorněn okamžitě po zaplacení, pošle Steam trade nabídku, vy ji přijmete ve Steam klientovi. Skin dorazí do inventáře ještě téhož sezení.',
    body: [
      { type: 'p', text: 'Rychlost závisí na třech věcech: jak rychle prodejce zareaguje, zda máte nastavený Steam Mobile Authenticator a zda je některá strana na 15denním „trade hold" Steamu.' },
      { type: 'h', text: 'Typická časová osa (s Mobile Authenticatorem)' },
      { type: 'ul', items: [
        '0:00 — Kupující platí',
        '0:02 — Prodejce dostane upozornění + e-mail',
        '0:05 — Prodejce pošle Steam trade nabídku',
        '0:06 — Kupující přijme obchod ve Steam klientovi',
        '0:07 — Skin dorazí do inventáře kupujícího',
      ]},
      { type: 'p', text: 'Medián dokončení napříč všemi obchody na Skinify je pod 5 minut, když jsou obě strany online. P95 je asi 2 hodiny (prodejci, kteří nebyli online, když přišla objednávka).' },
      { type: 'h', text: 'Bez Mobile Authenticatoru' },
      { type: 'p', text: 'Samotný Steam uvaluje 15denní trade hold na účty bez Mobile Authenticatoru. To nemůžeme obejít — je to pravidlo na úrovni Steamu. Pokud obchodujete bez Mobile Auth, počítejte s 15denním čekáním, než předměty skutečně dorazí. Důrazně doporučujeme zapnout Mobile Auth před obchodováním.' },
      { type: 'h', text: 'Co obchody zpomaluje' },
      { type: 'ul', items: [
        'Prodejce offline nebo od klávesnice',
        'Nezapnutý Steam Mobile Authenticator (15denní hold)',
        'Prodejcův účet na 7denním trade holdu Steam Guardu',
        'Výpadek Steam API (vzácné — automaticky opakujeme)',
      ]},
    ],
  },
  'how-to-sell-cs2-skins': {
    question: 'Jak prodám své CS2 skiny?',
    answer:
      'Přihlaste se přes Steam, propojte trade URL, otevřete Inventář, vyberte předměty, nastavte ceny a klikněte na Vystavit. Desítky předmětů můžete vystavit jedním kliknutím přes hromadné vystavení.',
    body: [
      { type: 'p', text: 'Prodej na Skinify zabere od začátku do konce méně než minutu. Tady je celý postup.' },
      { type: 'h', text: 'Krok 1: Přihlaste se přes Steam' },
      { type: 'p', text: 'Klikněte kdekoli na webu na „Přihlásit přes Steam". Přesměrujeme vás na oficiální OpenID stránku Steamu, tam se přihlásíte a vrátíte zpět na Skinify. Vaše Steam heslo nikdy nevidíme — jen vaše veřejné Steam ID.' },
      { type: 'h', text: 'Krok 2: Přidejte trade URL' },
      { type: 'p', text: 'Otevřete stránku svých Steam Trade Offers (steamcommunity.com/my/tradeoffers/privacy), zkopírujte URL a vložte ji do onboarding obrazovky Skinify. Tak vám kupující posílají předměty, když prodáváte. Děláte to jen jednou.' },
      { type: 'h', text: 'Krok 3: Vystavte předměty z inventáře' },
      { type: 'p', text: 'Profil → Inventář zobrazí vaše obchodovatelné CS2 předměty. Klikněte na jakýkoli předmět pro vytvoření nabídky, nebo zaškrtněte více předmětů a klikněte na „Vystavit vybrané" pro hromadné vystavení. Hromadné okno umožňuje nastavit ceny za kus, přidat popisy a zvolit typ nabídky (pevná cena nebo aukce).' },
      { type: 'h', text: 'Krok 4: Počkejte na kupujícího' },
      { type: 'p', text: 'Nabídky se na tržišti objeví okamžitě. Když někdo koupí, dostanete upozornění + e-mail; máte 24 hodin na odeslání Steam trade nabídky, jinak se objednávka automaticky zruší (a kupujícímu se vrátí peníze).' },
      { type: 'h', text: 'Krok 5: Odešlete Steam trade nabídku' },
      { type: 'p', text: 'Z Profil → Nabídky nebo přímo přes e-mailové upozornění klikněte na „Odeslat obchod". Otevře se Steam s předvyplněným obchodem — stačí potvrdit a Steam ho doručí kupujícímu.' },
      { type: 'h', text: 'Krok 6: Počkejte na uvolnění prostředků' },
      { type: 'p', text: 'Poté, co kupující přijme obchod ve Steamu, začne 8denní escrow odpočet. Po 8 dnech se prostředky přesunou z Čekajících na váš vybíratelný zůstatek, odkud si můžete vyplatit peníze do banky.' },
    ],
    ctaLabel: 'Otevřít inventář',
  },
  'how-to-withdraw-money': {
    question: 'Jak vyberu peníze do banky?',
    answer:
      'Otevřete Profil → Zůstatek → Vybrat. Zvolte banku, zadejte částku, potvrďte. České bankovní převody dorazí okamžitě; mezinárodní SEPA trvá 1–2 pracovní dny.',
    body: [
      { type: 'p', text: 'Výběr ze Skinify je přímý — bez minim, měsíčních limitů či prostředníka PayPal. Prostředky putují přímo z vašeho zůstatku Skinify na bankovní účet.' },
      { type: 'h', text: 'Podporované metody výběru' },
      { type: 'ul', items: [
        'Český bankovní převod (okamžitý): ČSOB, KB, Česká spořitelna, Fio, mBank, Raiffeisenbank, UniCredit, Air Bank, Moneta',
        'SEPA mezinárodní (1–2 pracovní dny)',
        'Vrácení na kartu (jen u nevyužitých vkladů, vrací se na původní kartu)',
      ]},
      { type: 'h', text: 'Jak dlouho to trvá' },
      { type: 'ul', items: [
        'Okamžitá platba české banky: 1–30 sekund',
        'Standardní převod české banky: tentýž pracovní den, pokud před 14:00 SEČ',
        'SEPA: 1–2 pracovní dny',
      ]},
      { type: 'h', text: 'Poplatky za výběr' },
      { type: 'p', text: 'Výběry na české banky jsou zdarma. SEPA mezinárodní: zdarma pod 10 000 Kč, paušálně 50 Kč nad. Vrácení na kartu: dle poplatků PayU (obvykle 0 u vrácení na původní kartu).' },
      { type: 'h', text: 'Co když je můj zůstatek v Čekajících' },
      { type: 'p', text: 'Čekající zůstatek je v escrow z nedávných prodejů — nelze ho vybrat, dokud nepomine 8denní okno na vrácení obchodu Steamem. Záložka Zůstatek zobrazuje datum uvolnění pro každou čekající položku. Po uvolnění se prostředky automaticky přesunou na váš hlavní (vybíratelný) zůstatek.' },
      { type: 'h', text: 'Práh pro KYC' },
      { type: 'p', text: 'Výběry nad 500 € (~12 200 Kč) vyžadují ověření identity. Používáme KYC jako službu (nezávislý ověřovatel dokladů — řidičský průkaz / pas + selfie). Ověření trvá 5–10 minut a je nutné jen jednou. Pod prahem se KYC nevyžaduje.' },
    ],
  },
  'do-i-need-mobile-authenticator': {
    question: 'Potřebuji Steam Mobile Authenticator?',
    answer:
      'Ano, důrazně doporučeno. Bez něj Steam uvaluje 15denní hold na všechny vaše obchody — to nemůžeme obejít. S ním obchody proběhnou během minut.',
    body: [
      { type: 'p', text: 'Steam Mobile Authenticator (též Steam Guard Mobile nebo Mobile 2FA) je dvoufaktorové ověření Steamu založené na mobilní aplikaci. Je oddělený od e-mailové 2FA — jen mobilní aplikace vás dostane z 15denního trade holdu.' },
      { type: 'h', text: 'Proč Steam bez něj uvaluje 15denní hold' },
      { type: 'p', text: 'Když účet nemá Mobile Authenticator, Steam považuje za těžší ověřit, že je obchodník legitimní. Jako bezpečnostní opatření drží všechny obchody z takových účtů v úschově na straně Steamu po dobu 15 dnů. To nemůžeme obejít — je to politika Valve vynucená na úrovni Steam API.' },
      { type: 'h', text: 'Jak zapnout Mobile Authenticator' },
      { type: 'ul', items: [
        'Stáhněte si mobilní aplikaci Steam (iOS / Android)',
        'Přihlaste se svými Steam údaji',
        'Nastavení → Steam Guard → Přidat Authenticator',
        'Zadejte telefonní číslo, přijměte SMS kód, zapište si obnovovací kód',
        'Počkejte 7 dní na uplynutí cooldownu (jednorázový hold)',
      ]},
      { type: 'p', text: 'Po 7denním cooldownu všechny vaše budoucí obchody proběhnou okamžitě místo 15denního escrow.' },
      { type: 'h', text: 'A co jiné metody 2FA' },
      { type: 'p', text: 'E-mailová 2FA, hardwarové klíče a jiné metody vás z trade holdu neosvobodí. Dělá to jen Steam Mobile Authenticator, protože potvrzuje každý obchod přes aplikaci v okamžiku obchodu.' },
    ],
  },
  'what-if-trade-fails': {
    question: 'Co se stane, když obchod selže?',
    answer:
      'Dostanete plnou náhradu. Prostředky jsou drženy v escrow, dokud nepotvrdíte přijetí — pokud se obchod nikdy nedokončí, prodejce peníze nikdy neuvidí a vám se automaticky vrátí.',
    body: [
      { type: 'p', text: 'Selhání obchodu spadají do tří kategorií: prodejce se neozve, předměty neodpovídají nabídce, nebo Steam obchod po doručení vrátí. Každá se řeší jinak, ale kupujícímu se vždy vrátí plná částka.' },
      { type: 'h', text: 'Scénář 1: Prodejce obchod nikdy nepošle' },
      { type: 'p', text: 'Prodejci mají 24 hodin po nákupu na odeslání Steam trade nabídky. Pokud tak neučiní, objednávka se automaticky zruší a kupujícímu se okamžitě vrátí peníze. Prodejce dostane „fulfillment strike" na účet; tři striky spustí dočasný zákaz vystavování.' },
      { type: 'h', text: 'Scénář 2: Předmět neodpovídá nabídce' },
      { type: 'p', text: 'Pokud prodejce pošle Steam obchod s jiným předmětem, než byl vystaven (špatný skin, jiný float, chybějící samolepky atd.), můžete Steam trade nabídku odmítnout a otevřít spor na Skinify. Náš tým porovná snímek nabídky s trade nabídkou a vyřeší do 24 hodin. Pokud je spor uznán, dostanete náhradu a prodejcův účet je sankcionován.' },
      { type: 'h', text: 'Scénář 3: Steam obchod po doručení vrátí' },
      { type: 'p', text: 'To je riziko vrácení obchodu Steamem, kvůli kterému náš 8denní escrow existuje. Pokud Steam během 7denního okna obnoví prodejcův účet a obchod vrátí, skin se vrátí původnímu vlastníkovi. Protože escrow ještě nebyl uvolněn, kupujícímu vrátíme plnou částku — prodejce přijde jak o skin (Steam ho vzal zpět), tak o peníze (kupujícímu vracíme).' },
      { type: 'h', text: 'Jak otevřít spor' },
      { type: 'p', text: 'Na stránce detailu objednávky klikněte na „Otevřít spor". Uveďte krátký popis a jakékoli důkazy (screenshoty, chatové logy, Steam trade ID). Escrow časovač se okamžitě pozastaví. Podpora odpoví do 24 hodin, obvykle během několika.' },
    ],
  },
  'skinify-vs-steam-market': {
    question: 'Jak se Skinify srovnává se Steam Marketem?',
    answer:
      'Skinify účtuje 0 % kupujícím a 2 % prodejcům, vyplácí v reálných penězích. Steam Market účtuje 15 % a zamyká výplaty do Steam Peněženky, kterou nelze vyplatit.',
    body: [
      { type: 'p', text: 'Steam Market je oficiální tržiště provozované Valve. Je to nejjednodušší místo pro prodej skinů — jedním kliknutím — ale také nejdražší a nejvíce omezující.' },
      { type: 'h', text: 'Srovnání poplatků' },
      { type: 'p', text: 'Steam Market bere 15 % z každé transakce (10 % Valve, 5 % vydavateli — u CS2 také Valve). Skinify bere 2 % od prodejce a nic od kupujícího.' },
      { type: 'p', text: 'U skinu za 1000 Kč: prodejce na Steam Marketu obdrží 850 Kč. Prodejce na Skinify obdrží 980 Kč. To je o 130 Kč víc za prodej, zhruba 15 % navíc ve vaší kapse.' },
      { type: 'h', text: 'Srovnání výplat' },
      { type: 'p', text: 'Steam Market platí do Steam Peněženky — zůstatku, který můžete použít na nákup dalšího Steam obsahu (hry, DLC, další skiny), ale nelze ho vybrat do banky. Nemůžete ho utratit mimo Steam, dát někomu jinému ani vyplatit.' },
      { type: 'p', text: 'Skinify platí v reálné měně přímo do banky. Okamžitá platba české banky, SEPA nebo vrácení na kartu. Můžete je utratit za nájem, potraviny nebo cokoli jiného.' },
      { type: 'h', text: 'Srovnání rychlosti' },
      { type: 'p', text: 'Prodeje na Steam Marketu jsou u populárních skinů okamžité — automaticky se naplní z nejnižší prodejní nabídky. Prodeje na Skinify závisí na tom, zda prodejce zareaguje na objednávku; obvykle 5–30 minut, občas pár hodin u vzácných předmětů.' },
      { type: 'h', text: 'Kdy použít co' },
      { type: 'ul', items: [
        'Steam Market: nevadí vám 15% poplatek + chcete jen kupovat další věci na Steamu',
        'Skinify: chcete reálné peníze na bankovním účtu',
      ]},
    ],
    ctaLabel: 'Přečíst celé srovnání',
  },
  'does-skinify-ask-steam-password': {
    question: 'Ptá se Skinify někdy na moje Steam heslo?',
    answer:
      'Nikdy. Používáme výhradně Steam OpenID. Přihlašovací tok vás přenese na oficiální web Steamu k ověření. Kdokoli tvrdí, že je Skinify, a ptá se na vaše Steam heslo, je podvodník.',
    body: [
      { type: 'p', text: 'Skinify nikdy nevidí vaše Steam heslo. Používáme Steam OpenID — standardní systém ověřování třetích stran od Valve — který ponechává zadání hesla výhradně na serverech Steamu.' },
      { type: 'h', text: 'Jak přihlašovací tok skutečně funguje' },
      { type: 'ul', items: [
        'Kliknete na „Přihlásit přes Steam" na Skinify',
        'Váš prohlížeč je přesměrován na steamcommunity.com/openid/login',
        'Zadáte Steam heslo a 2FA kód na stránce Steamu',
        'Steam ověří a vrátí vás na Skinify s podepsaným tokenem obsahujícím vaše veřejné Steam ID',
        'Skinify přečte token, vytvoří/aktualizuje váš účet a přihlásí vás',
      ]},
      { type: 'p', text: 'Vaše heslo se v žádném okamžiku nedostane ke Skinify. Nemůžeme ho vidět, logovat ani uložit. Kdyby naše databáze zítra unikla, vaše Steam údaje by v ní nebyly.' },
      { type: 'h', text: 'Časté podvodné vzorce, na které si dát pozor' },
      { type: 'ul', items: [
        'Falešná Steam žádost o přátelství „Skinify admin", která chce vaše heslo k „ověření účtu"',
        'Napodobené domény (skinifyy.gg, skinify.online atd.) s phishingovými přihlašovacími formuláři',
        'E-mail „od Skinify", který vás žádá o potvrzení údajů přes odkaz',
        '„Zákaznická podpora" ve vašich DM, která chce sdílet obrazovku / poslat obnovovací kód',
      ]},
      { type: 'note', text: 'Skutečná podpora Skinify nikdy nepíše první, nikdy nežádá o přihlašovací údaje a komunikuje pouze přes e-mailové adresy @skinify.gg nebo přes chat podpory v aplikaci.' },
    ],
  },
  'how-to-contact-support': {
    question: 'Jak mohu kontaktovat podporu Skinify?',
    answer:
      'Live chat 24/7 ze stránky Podpora nebo e-mail support@skinify.gg. Obchodní spory jdou do vyhrazeného týmu s SLA 30 minut.',
    body: [
      { type: 'p', text: 'Podporu Skinify lze kontaktovat třemi způsoby, každý s jiným cílem doby odezvy.' },
      { type: 'h', text: 'Live chat (nejrychlejší)' },
      { type: 'p', text: 'Otevřete stránku Podpora a klikněte na „Spustit live chat". Agenty máme online 24/7. Medián první odpovědi je pod 5 minut ve špičce (SEČ 10:00–22:00) a pod 30 minut mimo špičku. Chat použijte pro časově citlivé problémy — probíhající obchod, zaseknutá platba, urgentní dotazy k výběru.' },
      { type: 'h', text: 'E-mail (nejlepší pro dokumentaci)' },
      { type: 'p', text: 'support@skinify.gg. Medián odpovědi pod 4 hodiny. E-mail použijte, když potřebujete přiložit screenshoty, účtenky nebo delší vysvětlení. Vždy uveďte své Steam ID a (je-li relevantní) ID objednávky — výrazně to urychlí řešení.' },
      { type: 'h', text: 'Obchodní spor (prioritní fronta)' },
      { type: 'p', text: 'Otevřete ze stránky detailu objednávky. Obchází obecnou podporu a směruje na tým pro spory. SLA 30 minut pro aktivní spory (v pracovní době) — jsou časově citlivé, protože jde o escrow.' },
      { type: 'h', text: 'Co uvést při kontaktu podpory' },
      { type: 'ul', items: [
        'Vaše Steam ID (76561198...) — najdete v Profilu',
        'ID objednávky, pokud se problém týká konkrétního obchodu',
        'Screenshoty problému',
        'Odkaz na historii Steam obchodů (je-li relevantní)',
        'Jasný jednořádkový popis toho, co se pokazilo',
      ]},
    ],
  },
};
