import React from 'react';
import { RefreshCcw } from 'lucide-react';
import LegalShell, { LegalSection } from '../components/legal/LegalShell';
import useDocumentMeta from '../hooks/useDocumentMeta';

/* Zásady vracení peněz — v ČEŠTINĚ (PayU: jazyk webu musí odpovídat měně).
   Obsahuje postup vrácení, lhůty v pracovních dnech, adresu pro vrácení a
   informaci, že refundace jdou přes PayU na původní platební metodu. */

const sections: LegalSection[] = [
  {
    title: 'Kdy máte nárok na vrácení peněz',
    body: (
      <>
        <p>Na vrácení peněz máte nárok zejména v těchto případech:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Prodejce nedodal předmět v dohodnutém doručovacím okně</li>
          <li>Dodaný předmět se podstatně liší od popisu v nabídce</li>
          <li>Předmět má skryté vady, které prodejce nezveřejnil</li>
          <li>Transakci znemožnila technická chyba na naší platformě</li>
          <li>Náš bezpečnostní tým potvrdil podvodné jednání</li>
          <li>Steam účet prodejce byl před doručením omezen nebo zablokován</li>
        </ul>
        <p>
          Při nedodání předmětu probíhá vrácení <span className="font-semibold text-ink">automaticky
          a v plné výši</span> — nemusíte o nic žádat.
        </p>
      </>
    ),
  },
  {
    title: 'Kdy nárok na vrácení nevzniká',
    body: (
      <>
        <p>Peníze <span className="text-rose-600 dark:text-rose-300 font-semibold">nevracíme</span> v těchto případech:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Změna názoru po úspěšném doručení digitálního obsahu</li>
          <li>Pohyb tržní ceny předmětu po nákupu</li>
          <li>Spory o subjektivní kvalitu předmětu (float, pattern), pokud odpovídá popisu</li>
          <li>Nedodržení pokynů k obchodu nebo požadavků Steam Guard na straně kupujícího</li>
          <li>Žádosti podané později než 7 dní po transakci</li>
          <li>Předměty získané z promo akcí, bonusů či odměn</li>
        </ul>
        <p>
          U digitálního obsahu dodaného okamžitě zaniká zákonné právo na odstoupení od smlouvy
          zahájením dodání (§ 1837 písm. l) občanského zákoníku) — viz Obchodní podmínky.
        </p>
      </>
    ),
  },
  {
    title: 'Postup a lhůty vrácení',
    body: (
      <>
        <p className="font-semibold text-ink">Jak požádat o vrácení peněz</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Podejte žádost do 7 dnů od transakce přes podporu v aplikaci, nebo e-mailem na <span className="font-semibold text-ink">support@skinify.gg</span></li>
          <li>Uveďte ID transakce, důvod a případné důkazy (screenshoty, záznam obchodu)</li>
          <li>Písemné žádosti přijímáme na adrese: Skinify s.r.o., Grafická 3365/1, 150 00 Praha 5</li>
        </ul>
        <p className="font-semibold text-ink pt-2">Lhůty zpracování</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>První posouzení: do 2 pracovních dnů</li>
          <li>Prošetření: 3–7 pracovních dnů</li>
          <li>Odeslání refundace po schválení: do 5 pracovních dnů</li>
          <li>Připsání bankou: 1–3 další pracovní dny</li>
        </ul>
        <p>
          Schválené refundace vracíme přes platebního poskytovatele{' '}
          <span className="font-semibold text-ink">PayU</span> na původní platební metodu (karta,
          bankovní účet, Apple Pay / Google Pay). Stejně vyplácíme i nevyčerpaný zůstatek účtu.
        </p>
      </>
    ),
  },
  {
    title: 'Řešení sporů',
    body: (
      <>
        <p>
          Náš escrow systém spory minimalizuje — peníze držíme, dokud obě strany nepotvrdí dokončení
          obchodu.
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Ochrana kupujícího je aktivní automaticky u všech způsobilých transakcí</li>
          <li>Prodejci se mohou proti rozhodnutí odvolat do 14 dnů</li>
          <li>Složitější spory řeší senior moderátoři</li>
          <li>Rozhodujeme na základě důkazů a Obchodních podmínek</li>
        </ul>
        <p>
          Spotřebitelé se mohou obrátit i na Českou obchodní inspekci (www.coi.cz) nebo platformu ODR
          (ec.europa.eu/consumers/odr).
        </p>
      </>
    ),
  },
  {
    title: 'Částečné refundace',
    body: (
      <>
        <p>V některých případech můžeme vrátit část ceny:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Předmět se mírně liší od popisu</li>
          <li>Potvrzený výpadek služby ovlivnil transakci</li>
          <li>Kupující a prodejce se na částečném vrácení dohodli</li>
          <li>Jako kompenzace za potvrzenou chybu platformy</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Kontakt na podporu',
    body: (
      <>
        <p>Pro žádosti o vrácení peněz a dotazy k těmto zásadám:</p>
        <ul className="list-none space-y-1.5">
          <li><span className="text-ink-dim">E-mail:</span> <span className="text-ink font-semibold">support@skinify.gg</span></li>
          <li><span className="text-ink-dim">Adresa:</span> Skinify s.r.o., Grafická 3365/1, 150 00 Praha 5, Česká republika</li>
          <li><span className="text-ink-dim">Podpora v aplikaci:</span> nepřetržitě (24/7)</li>
          <li><span className="text-ink-dim">Průměrná odezva:</span> do 4 hodin</li>
        </ul>
      </>
    ),
  },
];

const RefundPolicyPage: React.FC = () => {
  useDocumentMeta({
    title: 'Zásady vracení peněz · Skinify',
    description:
      'Kdy máte nárok na vrácení peněz, jak o něj požádat a jak dlouho zpracování trvá. Refundace vracíme přes PayU na původní platební metodu.',
    canonical: 'https://skinify.gg/refund-policy',
  });
  return (
    <LegalShell
      Icon={RefreshCcw}
      eyebrow="Právní dokumenty"
      title="Zásady vracení peněz"
      intro="Kdy vzniká nárok na vrácení peněz, jak o něj požádat a v jakých lhůtách probíhá zpracování."
      lastUpdated="14. 7. 2026"
      sections={sections}
    />
  );
};

export default RefundPolicyPage;
