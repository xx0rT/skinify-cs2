import React from 'react';
import { Shield } from 'lucide-react';
import LegalShell, { LegalSection } from '../components/legal/LegalShell';
import useDocumentMeta from '../hooks/useDocumentMeta';

/* Zásady ochrany osobních údajů — v ČEŠTINĚ, se všemi náležitostmi, které
   vyžaduje PayU: identifikace správce (název, IČO, adresa), právní předpis
   a účely zpracování, zabezpečení, práva subjektů (přístup / oprava /
   výmaz) a výčet příjemců, se kterými jsou údaje sdíleny. */

const sections: LegalSection[] = [
  {
    title: 'Správce osobních údajů',
    body: (
      <>
        <p>Správcem osobních údajů je:</p>
        <ul className="list-none space-y-1.5">
          <li><span className="text-ink-dim">Společnost:</span> <span className="text-ink font-semibold">Skinify s.r.o.</span></li>
          <li><span className="text-ink-dim">IČO:</span> <span className="text-ink font-semibold">29671311</span></li>
          <li><span className="text-ink-dim">DIČ:</span> <span className="text-ink font-semibold">CZ29671311</span></li>
          <li><span className="text-ink-dim">Sídlo:</span> <span className="text-ink font-semibold">Grafická 3365/1, 150 00 Praha 5, Česká republika</span></li>
          <li><span className="text-ink-dim">E-mail:</span> <span className="text-ink font-semibold">privacy@skinify.gg</span></li>
        </ul>
      </>
    ),
  },
  {
    title: 'Právní základ a účely zpracování',
    body: (
      <>
        <p>
          Osobní údaje kupujících zpracováváme v souladu s{' '}
          <span className="font-semibold text-ink">Nařízením Evropského parlamentu a Rady (EU) 2016/679 (GDPR)</span>{' '}
          a zákonem č. 110/2019 Sb., o zpracování osobních údajů.
        </p>
        <p className="font-semibold text-ink">Účely a právní tituly zpracování:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><span className="font-semibold text-ink">Plnění smlouvy</span> (čl. 6 odst. 1 písm. b) GDPR) — vedení účtu, zpracování objednávek a plateb, doručení předmětů, výplaty</li>
          <li><span className="font-semibold text-ink">Právní povinnosti</span> (čl. 6 odst. 1 písm. c) GDPR) — účetnictví, daňové předpisy, opatření proti praní špinavých peněz (AML), ověření totožnosti (KYC)</li>
          <li><span className="font-semibold text-ink">Oprávněný zájem</span> (čl. 6 odst. 1 písm. f) GDPR) — zabezpečení platformy, prevence podvodů, řešení sporů</li>
          <li><span className="font-semibold text-ink">Souhlas</span> (čl. 6 odst. 1 písm. a) GDPR) — marketingová sdělení; souhlas lze kdykoli odvolat</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Jaké údaje shromažďujeme',
    body: (
      <>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Identifikační a kontaktní údaje: jméno/přezdívka, e-mail, Steam ID a veřejný Steam profil</li>
          <li>Transakční údaje: historie objednávek, dobití, výběrů a obchodů</li>
          <li>Platební údaje: identifikátory plateb od poskytovatele Stripe (čísla karet neukládáme)</li>
          <li>Údaje pro ověření totožnosti (KYC) u vyšších objemů: doklad totožnosti zpracovaný ověřovacím partnerem</li>
          <li>Technické údaje: IP adresa, typ zařízení a prohlížeče, protokoly o přihlášení a aktivitě</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Zabezpečení osobních údajů',
    body: (
      <>
        <p>Údaje chráníme technickými a organizačními opatřeními, zejména:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Šifrování přenosu dat (TLS/HTTPS) i uložených dat</li>
          <li>Řízení přístupů — k údajům přistupují pouze oprávněné osoby v nezbytném rozsahu</li>
          <li>Zabezpečená databázová infrastruktura s pravidelnými zálohami</li>
          <li>Dvoufázové ověření účtů a monitoring podezřelé aktivity</li>
          <li>Platební údaje zpracovává výhradně licencovaný poskytovatel v režimu PCI-DSS</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Vaše práva — přístup, oprava a výmaz údajů',
    body: (
      <>
        <p>Podle GDPR máte právo:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><span className="font-semibold text-ink">na přístup</span> — vyžádat si kopii údajů, které o vás zpracováváme</li>
          <li><span className="font-semibold text-ink">na opravu</span> — nepřesné údaje můžete upravit přímo v nastavení účtu, nebo o opravu požádat</li>
          <li><span className="font-semibold text-ink">na výmaz</span> („právo být zapomenut") — o smazání účtu a údajů lze požádat v Nastavení → Soukromí, nebo e-mailem</li>
          <li><span className="font-semibold text-ink">na omezení zpracování a námitku</span> proti zpracování z titulu oprávněného zájmu</li>
          <li><span className="font-semibold text-ink">na přenositelnost</span> — export údajů ve strojově čitelném formátu</li>
          <li><span className="font-semibold text-ink">odvolat souhlas</span> s marketingem kdykoli, bez vlivu na zákonnost dřívějšího zpracování</li>
        </ul>
        <p>
          Žádosti vyřizujeme do 30 dnů na adrese{' '}
          <span className="font-semibold text-ink">privacy@skinify.gg</span>. Máte rovněž právo podat
          stížnost u Úřadu pro ochranu osobních údajů (www.uoou.cz), Pplk. Sochora 27, 170 00 Praha 7.
        </p>
      </>
    ),
  },
  {
    title: 'Příjemci údajů — s kým údaje sdílíme',
    body: (
      <>
        <p>Osobní údaje sdílíme pouze v nezbytném rozsahu s těmito kategoriemi příjemců:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><span className="font-semibold text-ink">Stripe Payments Europe, Ltd.</span> — zpracování online plateb a vracení peněz</li>
          <li><span className="font-semibold text-ink">Supabase Inc.</span> — hosting databáze a aplikační infrastruktury</li>
          <li><span className="font-semibold text-ink">Brevo (Sendinblue SAS)</span> — odesílání transakčních e-mailů</li>
          <li><span className="font-semibold text-ink">Sumsub</span> — ověření totožnosti (KYC) tam, kde je vyžadováno zákonem</li>
          <li><span className="font-semibold text-ink">Valve Corporation (Steam)</span> — doručování předmětů přes Steam trade</li>
          <li>Orgány veřejné moci, pokud to vyžaduje právní předpis</li>
        </ul>
        <p>
          Osobní údaje neprodáváme. Se všemi zpracovateli máme uzavřené smlouvy o zpracování osobních
          údajů; při předání mimo EU/EHP používáme standardní smluvní doložky.
        </p>
      </>
    ),
  },
  {
    title: 'Doba uchování údajů',
    body: (
      <>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Údaje účtu — po dobu existence účtu a 30 dní po jeho smazání</li>
          <li>Transakční a účetní záznamy — 10 let (zákonná povinnost)</li>
          <li>Záznamy KYC/AML — 10 let od ukončení obchodního vztahu (zákonná povinnost)</li>
          <li>Technické protokoly — max. 12 měsíců</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Cookies',
    body: (
      <>
        <p>
          Používáme nezbytné cookies pro přihlášení a fungování košíku a — pouze s vaším souhlasem —
          analytické cookies pro zlepšování služby. Preference můžete kdykoli změnit v nastavení
          prohlížeče.
        </p>
      </>
    ),
  },
  {
    title: 'Kontakt',
    body: (
      <>
        <p>S dotazy k ochraně osobních údajů se na nás obraťte:</p>
        <ul className="list-none space-y-1.5">
          <li><span className="text-ink-dim">E-mail:</span> <span className="text-ink font-semibold">privacy@skinify.gg</span></li>
          <li><span className="text-ink-dim">Adresa:</span> Skinify s.r.o., Grafická 3365/1, 150 00 Praha 5, Česká republika</li>
          <li><span className="text-ink-dim">Doba odezvy:</span> do 48 hodin</li>
        </ul>
      </>
    ),
  },
];

const PrivacyPage: React.FC = () => {
  useDocumentMeta({
    title: 'Zásady ochrany osobních údajů · Skinify',
    description:
      'Jak Skinify zpracovává osobní údaje podle GDPR — správce, účely a právní tituly, zabezpečení, práva subjektů údajů a příjemci údajů.',
    canonical: 'https://skinify.gg/privacy',
  });
  return (
    <LegalShell
      Icon={Shield}
      eyebrow="Právní dokumenty"
      title="Zásady ochrany osobních údajů"
      intro="Jak shromažďujeme, používáme a chráníme vaše osobní údaje podle GDPR — a jak můžete svá práva uplatnit."
      lastUpdated="14. 7. 2026"
      info={{
        label: 'Správce osobních údajů',
        rows: [
          { k: 'Společnost', v: 'Skinify s.r.o.' },
          { k: 'IČO', v: '29671311' },
          { k: 'Sídlo', v: 'Grafická 3365/1, 150 00 Praha 5, Česká republika' },
          { k: 'E-mail', v: 'privacy@skinify.gg' },
        ],
      }}
      sections={sections}
    />
  );
};

export default PrivacyPage;
