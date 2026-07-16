import React from 'react';
import { Scale } from 'lucide-react';
import LegalShell, { LegalSection } from '../components/legal/LegalShell';
import useDocumentMeta from '../hooks/useDocumentMeta';

/* Řešení sporů — přestavěno na LegalShell (stejné chrome jako Obchodní
   podmínky / Soukromí / Vracení peněz) a přeloženo do češtiny. Nahrazuje
   starou off-brand šablonu (tmavě šedý gradient + oranžová, anglicky). */

const Tile: React.FC<{ big: string; label: string }> = ({ big, label }) => (
  <div className="rounded-2xl bg-subtle ring-1 ring-line p-4 text-center">
    <div className="text-[24px] font-bold text-accent tabular-nums leading-none">{big}</div>
    <div className="text-[11.5px] font-semibold text-ink-muted mt-1.5">{label}</div>
  </div>
);

const Step: React.FC<{ n: number; title: string; body: string }> = ({ n, title, body }) => (
  <li className="flex items-start gap-3">
    <span className="w-7 h-7 rounded-full bg-accent-soft text-accent grid place-items-center text-[12px] font-bold shrink-0 tabular-nums">
      {n}
    </span>
    <div className="min-w-0">
      <div className="text-[13.5px] font-bold text-ink tracking-tight">{title}</div>
      <p className="text-[12.5px] text-ink-muted font-medium mt-0.5 leading-relaxed">{body}</p>
    </div>
  </li>
);

const sections: LegalSection[] = [
  {
    title: 'Kdy otevřít spor',
    body: (
      <>
        <p>Spor otevřete, pokud nastane některá z těchto situací:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Prodejce nedodal předmět do 48 hodin</li>
          <li>Doručený předmět neodpovídá popisu v nabídce</li>
          <li>Objevili jste nezveřejněné vady předmětu</li>
          <li>Prodejce požaduje platbu mimo platformu</li>
          <li>Máte podezření na podvodné jednání</li>
          <li>Komunikace s protistranou selhala</li>
          <li>Vaše žádost o vrácení peněz byla zamítnuta a s rozhodnutím nesouhlasíte</li>
        </ul>
        <p>
          Dobrá zpráva: většinu situací řeší escrow automaticky — když prodejce nedodá
          v doručovacím okně, peníze se vám vrací bez otevírání sporu.
        </p>
      </>
    ),
  },
  {
    title: 'Jak spor podat — krok za krokem',
    body: (
      <ol className="space-y-4">
        <Step
          n={1}
          title="Otevřete Profil → Obchody"
          body="Najděte problémovou transakci v historii svých obchodů."
        />
        <Step
          n={2}
          title="Klikněte na „Otevřít spor“"
          body="Tlačítko najdete v detailu objednávky."
        />
        <Step
          n={3}
          title="Popište problém"
          body="Stručně a věcně vysvětlete, co se stalo a jaký výsledek očekáváte."
        />
        <Step
          n={4}
          title="Přiložte důkazy"
          body="Screenshoty, záznam Steam trade nabídky, historii chatu — cokoli relevantního."
        />
        <Step
          n={5}
          title="Vyčkejte na posouzení"
          body="Náš tým se ozve do 24 hodin. Průběžně vás informujeme o každém kroku."
        />
      </ol>
    ),
  },
  {
    title: 'Lhůty řešení',
    body: (
      <>
        <div className="grid grid-cols-3 gap-2.5">
          <Tile big="24 h" label="První posouzení" />
          <Tile big="48 h" label="Prošetření" />
          <Tile big="72 h" label="Rozhodnutí" />
        </div>
        <p>
          Většinu sporů uzavíráme do 48–72 hodin. Složitější případy mohou trvat déle —
          o průběhu vás vždy informujeme v aplikaci a e-mailem.
        </p>
      </>
    ),
  },
  {
    title: 'Zásady mediace',
    body: (
      <>
        <p>Náš tým při rozhodování dodržuje čtyři zásady:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><span className="font-semibold text-ink">Nestrannost</span> — obě strany dostanou stejný prostor</li>
          <li><span className="font-semibold text-ink">Důkazy</span> — rozhodujeme podle faktů a dokumentace, ne dojmů</li>
          <li><span className="font-semibold text-ink">Transparentnost</span> — jasná komunikace v každém kroku</li>
          <li><span className="font-semibold text-ink">Férový výsledek</span> — řešení chránící zájmy obou stran</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Možné výsledky',
    body: (
      <>
        <p>Po posouzení všech důkazů může spor skončit takto:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><span className="font-semibold text-ink">Plné vrácení peněz</span> — prodejce prokazatelně porušil podmínky</li>
          <li><span className="font-semibold text-ink">Částečné vrácení</span> — odpovědnost nesou obě strany</li>
          <li><span className="font-semibold text-ink">Transakce platí</span> — prodejce splnil všechny povinnosti</li>
          <li><span className="font-semibold text-ink">Náhradní předmět</span> — je-li dostupný a obě strany souhlasí</li>
          <li><span className="font-semibold text-ink">Postih účtu</span> — varování nebo zablokování při porušení pravidel</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Tipy pro úspěšné vyřešení',
    body: (
      <ul className="list-disc pl-5 space-y-1.5">
        <li>Popište problém jasně a konkrétně</li>
        <li>Přiložte všechny relevantní screenshoty a důkazy hned na začátku</li>
        <li>Na doplňující dotazy odpovídejte co nejdříve</li>
        <li>Komunikujte věcně a slušně</li>
        <li>Buďte otevřeni kompromisu a rozumnému řešení</li>
      </ul>
    ),
  },
  {
    title: 'Eskalace',
    body: (
      <>
        <p>
          Pokud s výsledkem nesouhlasíte, můžete do <span className="font-semibold text-ink">7 dnů</span>{' '}
          požádat o eskalaci — případ znovu a důkladně posoudí senior moderátor.
        </p>
        <ul className="list-none space-y-1.5">
          <li><span className="text-ink-dim">E-mail:</span> <span className="text-ink font-semibold">support@skinify.gg</span></li>
          <li><span className="text-ink-dim">Předmět:</span> <span className="text-ink font-semibold">Eskalace sporu — [ID objednávky]</span></li>
        </ul>
        <p>
          Spotřebitelé se mohou obrátit také na Českou obchodní inspekci (www.coi.cz) nebo evropskou
          platformu pro řešení sporů online ODR (ec.europa.eu/consumers/odr).
        </p>
      </>
    ),
  },
  {
    title: 'Potřebujete pomoc?',
    body: (
      <>
        <p>Náš tým podpory vás celým procesem provede:</p>
        <ul className="list-none space-y-1.5">
          <li>
            <span className="text-ink-dim">Podpora v aplikaci:</span>{' '}
            <a href="/support" className="text-accent font-semibold hover:underline">nepřetržitě (24/7)</a>
          </li>
          <li><span className="text-ink-dim">E-mail:</span> <span className="text-ink font-semibold">support@skinify.gg</span></li>
          <li><span className="text-ink-dim">Průměrná odezva:</span> do 4 hodin</li>
        </ul>
      </>
    ),
  },
];

const DisputeResolutionPage: React.FC = () => {
  useDocumentMeta({
    title: 'Řešení sporů a escrow · Skinify',
    description:
      'Jak Skinify řeší sporné obchody s CS2 skiny — escrow ochrana, podání sporu krok za krokem, lhůty 24/48/72 hodin, možné výsledky a eskalace.',
    canonical: 'https://skinify.gg/dispute-resolution',
  });
  return (
    <LegalShell
      Icon={Scale}
      eyebrow="Právní dokumenty"
      title="Řešení sporů"
      intro="Férový a transparentní proces řešení sporných obchodů. Peníze drží escrow, obě strany dostanou prostor a většinu případů uzavíráme do 72 hodin."
      lastUpdated="16. 7. 2026"
      sections={sections}
    />
  );
};

export default DisputeResolutionPage;
