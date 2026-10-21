import type { Metadata } from "next";
import { LegalDocument } from "@/components/marketing/prose";

export const metadata: Metadata = {
  title: "Terms of use (draft)",
  description: "Draft terms of use for the PARIKSHAN health-intelligence platform.",
};

export default function TermsPage() {
  return (
    <LegalDocument title="Terms of use" updated="21 October 2026">
      <h2>1. Acceptance</h2>
      <p>
        By creating an account or using PARIKSHAN, you agree to these terms. If you do not agree, do
        not use the service. This is a draft document and must be reviewed by qualified counsel before
        it governs a production service.
      </p>

      <h2>2. What the service is</h2>
      <p>
        PARIKSHAN is a personal health-information organizer. It stores documents you upload, extracts
        structured values for you to review, explains content in plain language, charts confirmed
        measurements, and answers questions grounded in your records. It is not a medical device, not
        a diagnostic service, and not a substitute for professional medical care.
      </p>

      <h2>3. Not medical advice</h2>
      <p>
        Nothing produced by PARIKSHAN — including AI-generated explanations, assistant answers,
        interaction reviews, or calculator outputs — constitutes medical advice, diagnosis, or
        treatment. Always consult a qualified healthcare professional before making health decisions.
        In an emergency, contact emergency services (112 in India) immediately.
      </p>

      <h2>4. Eligibility and accounts</h2>
      <ul>
        <li>You must be at least 18 years old to create an account.</li>
        <li>You are responsible for maintaining the confidentiality of your credentials.</li>
        <li>
          You may create profiles for family members only if you are authorized to manage their health
          information; for minors, you must be their parent or legal guardian.
        </li>
        <li>You must provide accurate information and not impersonate another person.</li>
      </ul>

      <h2>5. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Access another person's records, or attempt to bypass authorization controls.</li>
        <li>Upload malware, or attempt to exploit, probe, or overload the service.</li>
        <li>Use automated scraping against authenticated endpoints beyond normal product use.</li>
        <li>Use the service for unlawful purposes, including insurance or employment fraud.</li>
        <li>Present AI output as a clinical opinion, diagnosis, or professional advice.</li>
      </ul>

      <h2>6. Your content and licence</h2>
      <p>
        You retain ownership of the documents and information you upload. You grant the operator a
        limited licence to store, process, and display that content solely to provide the features you
        request. This licence ends when you delete the content or your account, subject to provider
        backup windows.
      </p>

      <h2>7. AI-generated content</h2>
      <p>
        AI output is probabilistic and can be incorrect even when grounded in your records. You are
        responsible for verifying any value against the original document. External AI providers are
        configured by the deployment operator and subject to their own terms and availability.
      </p>

      <h2>8. Availability and changes</h2>
      <p>
        This is an independent engineering deployment. Features may change, and the service is
        provided without uptime guarantees. Demo mode stores data in volatile memory and may reset;
        configure a database for persistence. We may suspend accounts that violate these terms or
        threaten the security of the service.
      </p>

      <h2>9. Disclaimers</h2>
      <p>
        The service is provided "as is" and "as available", without warranties of any kind, express or
        implied, including fitness for a particular purpose, accuracy, or non-infringement, to the
        maximum extent permitted by law. No warranty is made that OCR, extraction, AI output, or
        interaction data is complete or error-free.
      </p>

      <h2>10. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by applicable law, the operator shall not be liable for
        indirect, incidental, special, consequential, or punitive damages, or for any loss arising
        from reliance on the service for medical decisions. Nothing in these terms excludes liability
        that cannot lawfully be excluded.
      </p>

      <h2>11. Termination</h2>
      <p>
        You may delete your account at any time from Settings. On deletion, your records are removed
        as described in the privacy policy. We may terminate access for material breaches of these
        terms or where required by law.
      </p>

      <h2>12. Governing law</h2>
      <p>
        These terms are intended to be governed by the laws of India. The final choice of governing
        law, jurisdiction, arbitration, and dispute-resolution mechanism must be determined by counsel
        for the operating entity.
      </p>

      <h2>13. Contact</h2>
      <p>Questions about these terms can be sent through the contact form.</p>
    </LegalDocument>
  );
}
