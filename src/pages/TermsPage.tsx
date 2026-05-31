import React from 'react';
import { Scale } from 'lucide-react';
import LegalShell, { LegalSection } from '../components/legal/LegalShell';

const sections: LegalSection[] = [
  {
    title: 'Acceptance of terms',
    body: (
      <>
        <p>
          These Terms of Service ("Terms") govern your use of the Skinify platform and services. By creating an
          account or using our services, you acknowledge that you have read, understood, and agree to be bound by
          these Terms.
        </p>
        <p>
          We reserve the right to modify these Terms at any time. Changes are effective immediately upon posting.
          Continued use of the service constitutes acceptance of the modified Terms.
        </p>
      </>
    ),
  },
  {
    title: 'Eligibility and account registration',
    body: (
      <>
        <p>
          You must be at least 13 years old to use Skinify. By using our services, you represent that you meet this
          requirement and have the legal capacity to enter into binding agreements.
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Provide accurate and complete information during registration</li>
          <li>Keep your account information current</li>
          <li>Do not share your account with others</li>
          <li>Use Steam Guard authentication as required</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Trading and marketplace rules',
    body: (
      <>
        <p>
          Skinify provides a platform for users to trade CS2 items safely. All trades must comply with our
          marketplace rules and Steam's Terms of Service.
        </p>
        <p className="font-semibold text-ink">Prohibited activities:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Trading items obtained through cheating, hacking, or fraud</li>
          <li>Manipulating prices through artificial means</li>
          <li>Creating multiple accounts to circumvent restrictions</li>
          <li>Engaging in money laundering or other illegal activities</li>
          <li>Harassment, abuse, or threatening behavior toward other users</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Fees and payments',
    body: (
      <>
        <p>Skinify charges fees for certain services. Current structure:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Trading fee: 2% of transaction value (volume discounts available)</li>
          <li>Withdrawal fee: 1.5% of withdrawal amount</li>
          <li>Currency conversion fees may apply for international transactions</li>
        </ul>
        <p>All fees are clearly displayed before transaction completion. Fee changes will be announced 30 days in advance.</p>
      </>
    ),
  },
  {
    title: 'Dispute resolution and refunds',
    body: (
      <>
        <p>
          We provide dispute resolution services for transactions on our platform. Our escrow system protects both
          buyers and sellers.
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Refunds available if seller fails to deliver items as described</li>
          <li>Buyer protection through escrow</li>
          <li>Disputes must be reported within 7 days of transaction</li>
          <li>Platform fees are non-refundable except in cases of platform error</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Intellectual property',
    body: (
      <>
        <p>
          Skinify and its original content, features, and functionality are protected by international copyright,
          trademark, and other intellectual property laws.
        </p>
        <p>Users retain ownership of their CS2 items. Skinify does not claim ownership of virtual items traded on the platform.</p>
      </>
    ),
  },
  {
    title: 'Limitation of liability',
    body: (
      <>
        <p>
          Skinify shall not be liable for any indirect, incidental, special, consequential, or punitive damages
          resulting from your use of the service.
        </p>
        <p>
          Total liability for any claim arising from these Terms or your use of the service shall not exceed the
          amount paid to Skinify in the 12 months preceding the claim.
        </p>
      </>
    ),
  },
  {
    title: 'Termination',
    body: (
      <>
        <p>
          We reserve the right to suspend or terminate your account at our discretion, including for violations of
          these Terms or suspicious activity.
        </p>
        <p>
          Upon termination, your right to use the service ends immediately. Provisions that should survive
          termination shall survive.
        </p>
      </>
    ),
  },
  {
    title: 'Contact',
    body: (
      <>
        <p>For questions about these Terms, reach us at:</p>
        <ul className="list-none space-y-1.5">
          <li><span className="text-ink-dim">Email:</span> <span className="text-ink font-semibold">legal@skinify.com</span></li>
          <li><span className="text-ink-dim">Address:</span> Bělehradská 858/23, 120 00 Praha, Česká republika</li>
          <li><span className="text-ink-dim">Response time:</span> Within 48 hours for legal inquiries</li>
        </ul>
      </>
    ),
  },
];

const TermsPage: React.FC = () => (
  <LegalShell
    Icon={Scale}
    eyebrow="Legal"
    title="Terms of service"
    intro="Please read these terms carefully before using Skinify. They govern your account, our marketplace, and the way we resolve disputes."
    lastUpdated="January 15, 2026"
    info={{
      label: 'Service provider',
      rows: [
        { k: 'Company', v: 'LosSelloutos s.r.o.' },
        { k: 'Legal form', v: 'Limited Liability Company' },
        { k: 'Business ID', v: '06448771' },
        { k: 'Tax ID', v: '06448771' },
        { k: 'Address', v: 'Bělehradská 858/23, Praha' },
        { k: 'Registered', v: '17.10.2025' },
      ],
    }}
    sections={sections}
  />
);

export default TermsPage;
