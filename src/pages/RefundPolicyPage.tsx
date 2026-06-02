import React from 'react';
import { RefreshCcw } from 'lucide-react';
import LegalShell, { LegalSection } from '../components/legal/LegalShell';
import useDocumentMeta from '../hooks/useDocumentMeta';

const sections: LegalSection[] = [
  {
    title: 'Eligible for refund',
    body: (
      <>
        <p>You may be eligible for a refund if:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>The seller failed to deliver the item within the agreed timeframe</li>
          <li>The item delivered is significantly different from the listing</li>
          <li>The item has hidden defects not disclosed by the seller</li>
          <li>Technical issues on our platform prevented the transaction from completing</li>
          <li>Fraudulent activity is confirmed by our security team</li>
          <li>The seller's Steam account is restricted or banned before delivery</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Not eligible for refund',
    body: (
      <>
        <p>Refunds will <span className="text-rose-600 dark:text-rose-300 font-semibold">not</span> be granted for:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Change of mind after successful delivery</li>
          <li>Market price fluctuations after purchase</li>
          <li>Items damaged or modified by the buyer after delivery</li>
          <li>Disputes related to subjective item quality (float values, patterns)</li>
          <li>Failure to follow trade instructions or Steam Guard requirements</li>
          <li>Requests made more than 7 days after the transaction</li>
          <li>Items obtained through promotions, bonuses, or rewards</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Refund process & timeline',
    body: (
      <>
        <p className="font-semibold text-ink">How to request a refund</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Submit a request through your account dashboard within 7 days of the transaction</li>
          <li>Provide a clear reason and any supporting evidence (screenshots, trade logs)</li>
          <li>Include the transaction ID and relevant order details</li>
          <li>Cooperate with our investigation team during the review</li>
        </ul>
        <p className="font-semibold text-ink pt-2">Processing time</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Initial review: 24-48 hours</li>
          <li>Investigation period: 3-7 business days</li>
          <li>Refund processing: 5-10 business days after approval</li>
          <li>Bank transfer completion: 1-3 additional business days</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Dispute resolution',
    body: (
      <>
        <p>Our escrow system minimizes disputes by holding funds until both parties confirm trade completion.</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Buyer protection is automatically active for all eligible transactions</li>
          <li>Sellers can appeal refund decisions within 14 days</li>
          <li>Complex disputes may be escalated to senior moderators</li>
          <li>Final decisions are made based on the evidence and our terms of service</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Partial refunds',
    body: (
      <>
        <p>In some cases, partial refunds may be issued:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>When the item received differs slightly from the description</li>
          <li>For verified service interruptions affecting the transaction</li>
          <li>When mutual agreement is reached between buyer and seller</li>
          <li>As compensation for confirmed platform errors</li>
        </ul>
        <p>Partial refund amounts are determined by our support team based on the specific circumstances.</p>
      </>
    ),
  },
  {
    title: 'Contact support',
    body: (
      <>
        <p>For refund requests or questions about this policy:</p>
        <ul className="list-none space-y-1.5">
          <li><span className="text-ink-dim">Refunds:</span> <span className="text-ink font-semibold">refunds@skinify.com</span></li>
          <li><span className="text-ink-dim">Support center:</span> available 24/7 in-app</li>
          <li><span className="text-ink-dim">Average response:</span> under 4 hours</li>
        </ul>
      </>
    ),
  },
];

const RefundPolicyPage: React.FC = () => {
  useDocumentMeta({
    title: 'Refund Policy · Skinify',
    description:
      'Refund eligibility, escrow timelines, and chargeback handling for CS2 marketplace trades on Skinify. What to do if a trade goes wrong.',
    canonical: 'https://skinify.gg/refund-policy',
  });
  return (
  <LegalShell
    Icon={RefreshCcw}
    eyebrow="Legal"
    title="Refund policy"
    intro="What's eligible for a refund, how to request one, and how long the process takes."
    lastUpdated="January 15, 2026"
    sections={sections}
  />
  );
};

export default RefundPolicyPage;
