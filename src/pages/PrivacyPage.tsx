import React from 'react';
import { Shield } from 'lucide-react';
import LegalShell, { LegalSection } from '../components/legal/LegalShell';
import useDocumentMeta from '../hooks/useDocumentMeta';

const sections: LegalSection[] = [
  {
    title: 'Information we collect',
    body: (
      <>
        <p className="font-semibold text-ink">Personal information</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Steam ID and profile data (display name, avatar)</li>
          <li>Email address for account verification and communications</li>
          <li>Payment information for transactions (processed by secure third parties)</li>
          <li>Trading history and preferences</li>
        </ul>
        <p className="font-semibold text-ink pt-2">Automatically collected</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>IP address and approximate location</li>
          <li>Browser type and device information</li>
          <li>Platform usage analytics and performance data</li>
          <li>Cookies and similar tracking technologies</li>
        </ul>
      </>
    ),
  },
  {
    title: 'How we use your information',
    body: (
      <>
        <p>We use your information solely to provide and improve our services:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Process trades and transactions securely</li>
          <li>Verify user identity and prevent fraud</li>
          <li>Provide customer support and resolve disputes</li>
          <li>Send important notifications about your account</li>
          <li>Improve platform features and user experience</li>
          <li>Comply with legal obligations and enforce our Terms</li>
        </ul>
        <p className="text-emerald-700 dark:text-emerald-300 font-semibold">
          We never sell your personal information to third parties.
        </p>
      </>
    ),
  },
  {
    title: 'Information sharing and disclosure',
    body: (
      <>
        <p>We share data only in limited circumstances:</p>
        <p className="font-semibold text-ink pt-2">Service providers</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Payment processors for transaction handling</li>
          <li>Cloud storage providers for data hosting</li>
          <li>Security services for fraud prevention</li>
          <li>Analytics providers for platform improvement</li>
        </ul>
        <p className="font-semibold text-ink pt-2">Legal requirements</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>When required by law or legal process</li>
          <li>To protect our rights and property</li>
          <li>To prevent fraud or illegal activities</li>
          <li>In connection with business transfers</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Data security and protection',
    body: (
      <>
        <p>We implement comprehensive security measures:</p>
        <p className="font-semibold text-ink pt-2">Technical safeguards</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>SSL/TLS encryption for all data transmission</li>
          <li>AES-256 encryption for stored data</li>
          <li>Regular security audits and penetration testing</li>
          <li>Multi-factor authentication requirements</li>
        </ul>
        <p className="font-semibold text-ink pt-2">Operational safeguards</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Need-to-know access controls for personal data</li>
          <li>Regular employee security training</li>
          <li>Incident response and breach notification procedures</li>
          <li>Secure data centers with physical security controls</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Your privacy rights',
    body: (
      <>
        <p>You have the following rights regarding your personal data:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Access, update, or correct your personal data</li>
          <li>Download your data in a portable format</li>
          <li>Request deletion of your account and data</li>
          <li>Restrict or object to processing of your information</li>
          <li>Withdraw consent for optional features</li>
        </ul>
        <p>To exercise these rights, contact <span className="text-ink font-semibold">privacy@skinify.com</span> or use your account settings.</p>
      </>
    ),
  },
  {
    title: 'Cookies and tracking',
    body: (
      <>
        <p>We use cookies and similar technologies to enhance your experience.</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><span className="text-ink font-semibold">Essential:</span> required for platform functionality</li>
          <li><span className="text-ink font-semibold">Performance:</span> help us improve site performance</li>
          <li><span className="text-ink font-semibold">Analytics:</span> understand how users interact with our site</li>
          <li><span className="text-ink font-semibold">Preference:</span> remember your settings</li>
        </ul>
        <p>Manage cookies through your browser settings or our cookie consent banner.</p>
      </>
    ),
  },
  {
    title: 'International data transfers',
    body: (
      <>
        <p>Skinify operates globally and may transfer your data across international borders. We ensure adequate protection through:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Standard Contractual Clauses with service providers</li>
          <li>Adequacy decisions for certain jurisdictions</li>
          <li>Appropriate safeguards for all international transfers</li>
          <li>Compliance with applicable data protection laws</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Contact our Data Protection Officer',
    body: (
      <>
        <p>For privacy questions or data subject requests:</p>
        <ul className="list-none space-y-1.5">
          <li><span className="text-ink-dim">DPO email:</span> <span className="text-ink font-semibold">dpo@skinify.com</span></li>
          <li><span className="text-ink-dim">General privacy:</span> <span className="text-ink font-semibold">privacy@skinify.com</span></li>
          <li><span className="text-ink-dim">Response time:</span> within 30 days of request</li>
        </ul>
      </>
    ),
  },
];

const PrivacyPage: React.FC = () => {
  useDocumentMeta({
    title: 'Privacy Policy · Skinify',
    description:
      'How Skinify collects, stores, and processes your data. GDPR-compliant practices for Steam OpenID, payment processing, and cookies.',
    canonical: 'https://skinify.gg/privacy',
  });
  return (
  <LegalShell
    Icon={Shield}
    eyebrow="Legal"
    title="Privacy policy"
    intro="How we collect, use, and safeguard your personal information when you use Skinify."
    lastUpdated="January 15, 2026"
    info={{
      label: 'Data controller',
      rows: [
        { k: 'Entity', v: 'Skinify s.r.o.' },
        { k: 'Address', v: 'Grafická 3365/1, 150 00 Praha 5, Česká republika' },
        { k: 'Business ID (IČO)', v: '29671311' },
        { k: 'DPO email', v: 'dpo@skinify.gg' },
      ],
    }}
    sections={sections}
  />
  );
};

export default PrivacyPage;
