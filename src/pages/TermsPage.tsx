import React from 'react';
import { Scale } from 'lucide-react';
import LegalShell, { LegalSection } from '../components/legal/LegalShell';
import useDocumentMeta from '../hooks/useDocumentMeta';

/* Obchodní podmínky — v ČEŠTINĚ. PayU vyžaduje, aby jazyk webu odpovídal
   měně (CZK → čeština), a kontroluje konkrétní náležitosti: identifikaci
   provozovatele, dobu zpracování objednávky v pracovních dnech, postup a
   adresu pro vrácení zboží, zákonnou lhůtu a reklamační řád s kontakty. */

const sections: LegalSection[] = [
  {
    title: 'Úvodní ustanovení',
    body: (
      <>
        <p>
          Tyto obchodní podmínky („Podmínky") upravují používání platformy Skinify a jejích služeb.
          Vytvořením účtu nebo používáním našich služeb potvrzujete, že jste si Podmínky přečetli,
          porozuměli jim a souhlasíte s nimi.
        </p>
        <p>
          Vyhrazujeme si právo Podmínky kdykoli změnit. Změny jsou účinné okamžikem zveřejnění.
          Pokračováním v používání služby vyjadřujete souhlas s upraveným zněním.
        </p>
      </>
    ),
  },
  {
    title: 'Registrace a uživatelský účet',
    body: (
      <>
        <p>
          Pro používání Skinify musí být uživateli alespoň 13 let. Používáním služeb prohlašujete,
          že tuto podmínku splňujete a máte způsobilost uzavírat závazné smlouvy.
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Při registraci uvádějte přesné a úplné údaje</li>
          <li>Udržujte údaje ve svém účtu aktuální</li>
          <li>Účet nesdílejte s dalšími osobami</li>
          <li>Používejte ověření Steam Guard, je-li vyžadováno</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Pravidla tržiště',
    body: (
      <>
        <p>
          Skinify poskytuje platformu pro bezpečné obchodování s předměty ze hry CS2. Všechny obchody
          musí být v souladu s těmito Podmínkami a s podmínkami služby Steam.
        </p>
        <p className="font-semibold text-ink">Zakázané aktivity:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Obchodování s předměty získanými podvodem, cheatováním nebo hackingem</li>
          <li>Umělá manipulace s cenami</li>
          <li>Zakládání více účtů za účelem obcházení omezení</li>
          <li>Praní špinavých peněz a jiná protiprávní činnost</li>
          <li>Obtěžování, urážky nebo vyhrožování ostatním uživatelům</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Ceny a poplatky',
    body: (
      <>
        <p>
          Všechny ceny na platformě jsou uvedeny v korunách českých (Kč) včetně případných poplatků,
          a to vždy před dokončením objednávky. Skinify účtuje poplatky za tyto služby:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Poplatek z prodeje: 2 % z hodnoty transakce (množstevní slevy k dispozici)</li>
          <li>Poplatek za výběr: 1,5 % z vybírané částky</li>
          <li>U mezinárodních transakcí se mohou uplatnit poplatky za konverzi měn</li>
        </ul>
        <p>Změny poplatků oznamujeme 30 dní předem.</p>
      </>
    ),
  },
  {
    title: 'Platby a zpracování plateb',
    body: (
      <>
        <p>
          Online platby zpracovává společnost <span className="font-semibold text-ink">Stripe Payments Europe, Ltd.</span>,
          licencovaná platební instituce. Skinify neukládá údaje o vaší platební kartě — veškerá
          platební data zpracovává přímo poskytovatel plateb v prostředí odpovídajícím standardu
          PCI-DSS.
        </p>
        <p className="font-semibold text-ink">Přijímané platební metody:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Platební karty (Visa, Mastercard, Maestro)</li>
          <li>Okamžitý bankovní převod / SEPA</li>
          <li>Apple Pay a Google Pay</li>
        </ul>
        <p>
          Platba je z vašeho účtu stržena okamžikem potvrzení objednávky tlačítkem „Koupit"
          (objednávka zavazující k platbě).
        </p>
      </>
    ),
  },
  {
    title: 'Zpracování a doručení objednávky',
    body: (
      <>
        <p>
          Objednávky zpracováváme <span className="font-semibold text-ink">ihned po přijetí platby</span>.
          Zakoupené digitální předměty (CS2 skiny) jsou doručovány elektronicky prostřednictvím Steam
          trade nabídky — je-li prodejce online, obvykle do několika minut, nejpozději však do{' '}
          <span className="font-semibold text-ink">2 pracovních dnů</span> od přijetí platby.
        </p>
        <p>
          Pokud předmět podléhá dočasnému zámku obchodování na straně Steam (0–8 dní), je bezpečně
          uložen ve vašem Skinify inventáři a odeslán automaticky v okamžiku vypršení zámku. Nedodá-li
          prodejce předmět v doručovacím okně, je vám platba automaticky vrácena v plné výši.
        </p>
        <p>
          Dobití zůstatku se na účtu projeví okamžitě po potvrzení platby poskytovatelem,
          nejpozději do 1 pracovního dne.
        </p>
      </>
    ),
  },
  {
    title: 'Odstoupení od smlouvy a vrácení zboží',
    body: (
      <>
        <p>
          Spotřebitel má ze zákona právo odstoupit od smlouvy uzavřené distančním způsobem ve lhůtě{' '}
          <span className="font-semibold text-ink">14 dnů</span> bez udání důvodu (§ 1829 občanského
          zákoníku, směrnice 2011/83/EU).
        </p>
        <p>
          U digitálního obsahu dodávaného okamžitě (nákupy na tržišti a čerpané dobití zůstatku)
          udělujete výslovný souhlas se zahájením plnění před uplynutím lhůty pro odstoupení a berete
          na vědomí, že okamžikem zahájení dodání právo na odstoupení zaniká (§ 1837 písm. l)
          občanského zákoníku).
        </p>
        <p className="font-semibold text-ink">Postup při vrácení / odstoupení:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Odstoupení zašlete e-mailem na <span className="text-ink font-semibold">support@skinify.gg</span>, nebo písemně na adresu níže</li>
          <li>Uveďte číslo objednávky, datum nákupu a číslo účtu pro vrácení peněz</li>
          <li>Peníze vracíme do 14 dnů od odstoupení, stejnou platební metodou přes Stripe</li>
          <li>Nevyčerpaný zůstatek účtu si můžete kdykoli vybrat zpět dle Zásad vracení peněz</li>
        </ul>
        <p>
          <span className="text-ink-dim">Adresa pro vrácení a písemný styk:</span>{' '}
          <span className="font-semibold text-ink">Skinify s.r.o., Grafická 3365/1, 150 00 Praha 5, Česká republika</span>
        </p>
      </>
    ),
  },
  {
    title: 'Reklamace (reklamační řád)',
    body: (
      <>
        <p className="font-semibold text-ink">Pravidla reklamací:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Reklamovat lze nedodání předmětu, dodání jiného předmětu, než byl popsán v nabídce, nebo chybné stržení platby</li>
          <li>Reklamaci uplatněte do 7 dnů od transakce přes podporu v aplikaci nebo e-mailem</li>
          <li>Uveďte ID transakce, popis problému a případné důkazy (screenshoty, záznam obchodu)</li>
        </ul>
        <p className="font-semibold text-ink pt-2">Postup vyřízení:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Přijetí reklamace potvrdíme do 24–48 hodin</li>
          <li>Reklamaci vyřídíme bez zbytečného odkladu, nejpozději do <span className="font-semibold text-ink">30 dnů</span> od uplatnění</li>
          <li>V případě uznání vracíme peníze na zůstatek nebo původní platební metodou přes Stripe</li>
        </ul>
        <p className="font-semibold text-ink pt-2">Kontakt pro reklamace:</p>
        <ul className="list-none space-y-1.5">
          <li><span className="text-ink-dim">E-mail:</span> <span className="text-ink font-semibold">support@skinify.gg</span></li>
          <li><span className="text-ink-dim">Adresa:</span> Skinify s.r.o., Grafická 3365/1, 150 00 Praha 5, Česká republika</li>
          <li><span className="text-ink-dim">Podpora v aplikaci:</span> nepřetržitě (24/7)</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Mimosoudní řešení sporů',
    body: (
      <>
        <p>
          K mimosoudnímu řešení spotřebitelských sporů je příslušná Česká obchodní inspekce
          (www.coi.cz), Ústřední inspektorát – oddělení ADR, Štěpánská 44, 110 00 Praha 1.
          Spotřebitelé mohou využít rovněž platformu pro řešení sporů online (ODR) na adrese
          ec.europa.eu/consumers/odr.
        </p>
      </>
    ),
  },
  {
    title: 'Duševní vlastnictví a odpovědnost',
    body: (
      <>
        <p>
          Obsah, funkce a vzhled platformy Skinify jsou chráněny autorským právem a dalšími předpisy
          o duševním vlastnictví. Uživatelé zůstávají vlastníky svých CS2 předmětů — Skinify si na
          virtuální předměty obchodované na platformě nečiní nárok.
        </p>
        <p>
          Skinify neodpovídá za nepřímé či následné škody vzniklé používáním služby. Celková
          odpovědnost je omezena částkou, kterou jste Skinify uhradili za posledních 12 měsíců.
        </p>
      </>
    ),
  },
  {
    title: 'Ukončení účtu a závěrečná ustanovení',
    body: (
      <>
        <p>
          Vyhrazujeme si právo pozastavit nebo ukončit účet při porušení těchto Podmínek nebo při
          podezřelé aktivitě. Ukončením zaniká právo službu používat; ustanovení, která mají přetrvat,
          zůstávají v platnosti.
        </p>
        <p>
          Právní vztahy neupravené těmito Podmínkami se řídí právním řádem České republiky, zejména
          zákonem č. 89/2012 Sb., občanský zákoník, a zákonem č. 634/1992 Sb., o ochraně spotřebitele.
        </p>
        <p className="font-semibold text-ink pt-2">Kontakt:</p>
        <ul className="list-none space-y-1.5">
          <li><span className="text-ink-dim">E-mail:</span> <span className="text-ink font-semibold">support@skinify.gg</span></li>
          <li><span className="text-ink-dim">Adresa:</span> Grafická 3365/1, 150 00 Praha 5, Česká republika</li>
        </ul>
      </>
    ),
  },
];

const TermsPage: React.FC = () => {
  useDocumentMeta({
    title: 'Obchodní podmínky · Skinify',
    description:
      'Obchodní podmínky platformy Skinify — pravidla účtu a tržiště, platby přes Stripe, doba zpracování objednávky, odstoupení od smlouvy a reklamační řád.',
    canonical: 'https://skinify.gg/terms',
  });
  return (
    <LegalShell
      Icon={Scale}
      eyebrow="Právní dokumenty"
      title="Obchodní podmínky"
      intro="Před používáním Skinify si prosím tyto podmínky pečlivě přečtěte. Upravují váš účet, naše tržiště, platby, doručení objednávek i způsob řešení reklamací."
      lastUpdated="14. 7. 2026"
      info={{
        label: 'Provozovatel služby',
        rows: [
          { k: 'Společnost', v: 'Skinify s.r.o.' },
          { k: 'IČO', v: '29671311' },
          { k: 'DIČ', v: 'CZ29671311' },
          { k: 'Sídlo', v: 'Grafická 3365/1, 150 00 Praha 5, Česká republika' },
          { k: 'E-mail', v: 'support@skinify.gg' },
          { k: 'Zápis', v: 'Obchodní rejstřík vedený Městským soudem v Praze' },
        ],
      }}
      sections={sections}
    />
  );
};

export default TermsPage;
