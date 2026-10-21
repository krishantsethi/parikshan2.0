import type { Metadata } from "next";
import { LegalDocument } from "@/components/marketing/prose";

export const metadata: Metadata = {
  title: "Privacy policy (draft)",
  description:
    "Draft privacy policy for PARIKSHAN describing data collection, AI processing, retention, and your controls.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalDocument title="Privacy policy" updated="21 October 2026">
      <h2>1. Scope</h2>
      <p>
        This policy describes how the PARIKSHAN deployment you are using ("PARIKSHAN", "we") handles
        personal and health information. It applies to the web application and its API endpoints. The
        operator of this deployment — not any third-party affiliate — is the data controller for
        records you create here.
      </p>

      <h2>2. Information we collect</h2>
      <ul>
        <li>
          <strong>Account information:</strong> name, email address, a scrypt password hash, interface
          language, and theme preference.
        </li>
        <li>
          <strong>Health information you choose to provide:</strong> health profiles (including family
          members you are authorized to manage), uploaded documents, extracted text, confirmed
          measurements, medication records, interaction reviews, and assistant conversations.
        </li>
        <li>
          <strong>Operational records:</strong> session metadata (expiry, user agent), audit events for
          security-relevant actions (sign-in, upload, deletion, export), and rate-limit counters.
        </li>
        <li>
          <strong>Cookies:</strong> a session cookie (httpOnly), a theme cookie, and a language cookie.
          No advertising or third-party analytics cookies are set by this application.
        </li>
      </ul>

      <h2>3. How we use information</h2>
      <p>
        We use your information solely to provide the features you request: organizing documents,
        extracting structured values, generating explanations you initiate, displaying trends from
        confirmed measurements, maintaining medication records, running interaction reviews, and
        answering questions you ask. Audit events are used for security monitoring and to show you
        your own activity history.
      </p>

      <h2>4. AI processing</h2>
      <p>
        If the deployment operator has configured an AI provider, the excerpts needed to answer a
        specific request are sent to that provider's API for inference. Only retrieved excerpts — not
        your entire record library — are included. Provider API keys are stored server-side and never
        sent to the browser. This application does not use your records to train models and does not
        operate an analytics or profiling pipeline. When no AI provider is configured, AI features
        state that clearly and return deterministic, record-only output instead.
      </p>

      <h2>5. Other third-party processing</h2>
      <ul>
        <li>
          <strong>OCR:</strong> image text recognition runs locally via tesseract.js inside the
          application environment; images are not uploaded to a third-party OCR service by this build.
        </li>
        <li>
          <strong>OpenFDA (optional, disabled by default):</strong> if enabled by the operator,
          medication names — not health records — are sent to the U.S. FDA open-data API to retrieve
          label text.
        </li>
        <li>
          <strong>Hosting and database:</strong> the application may be hosted on Vercel and use a
          PostgreSQL provider such as Supabase or Neon, depending on configuration. Those providers
          process data on our behalf under their own terms.
        </li>
      </ul>

      <h2>6. Storage and security</h2>
      <p>
        Records are stored in the configured PostgreSQL database (or, in demo mode, in volatile server
        memory that resets with the instance). Passwords are hashed with scrypt. Sessions are opaque
        tokens stored as hashes with server-side expiry. Every document read is authenticated and
        ownership-checked. See the Security page for the full checklist, including known limitations
        such as the absence of multi-factor authentication.
      </p>

      <h2>7. Retention and deletion</h2>
      <p>
        Data is retained until you delete it. Deleting a document removes its file, extracted text,
        and any measurements derived from it. Deleting a profile cascades to that profile's documents,
        measurements, medications, reviews, and conversations. Deleting your account removes all of
        the above plus audit metadata. Backups, where a hosting provider maintains them, may persist
        for the provider's backup window.
      </p>

      <h2>8. Your rights</h2>
      <ul>
        <li>Access and export a complete JSON archive from Settings.</li>
        <li>Correct extracted values, dates, and medications at any time.</li>
        <li>Delete individual records, profiles, or your whole account.</li>
        <li>Choose your interface language and request responses in English or Hindi.</li>
      </ul>
      <p>
        Depending on your jurisdiction (including under India's Digital Personal Data Protection Act,
        2023), you may have additional rights such as grievance redressal or nomination. This draft
        does not yet implement a formal grievance officer process or a Data Processing Agreement
        workflow.
      </p>

      <h2>9. Children and family profiles</h2>
      <p>
        Accounts are intended for adults. Family profiles for minors must be created by a parent or
        legal guardian, who affirms they are authorized to manage that person's records. Creating a
        profile for another adult requires their permission; the platform records that affirmation.
      </p>

      <h2>10. International transfers</h2>
      <p>
        Depending on where this deployment is hosted and which AI provider is configured, data may be
        processed outside your country. Operators must disclose the location of processing to users in
        their own privacy notice before handling real patient data.
      </p>

      <h2>11. No certification claims</h2>
      <p>
        PARIKSHAN does not claim HIPAA, GDPR, ISO 27001, ABDM, or any other formal compliance or
        certification. This policy describes engineering practices; it is not a certification.
      </p>

      <h2>12. Changes and contact</h2>
      <p>
        Material changes will be reflected in this document with an updated date. For questions, use
        the contact form. This draft must be reviewed by qualified counsel and adapted to the
        jurisdiction and organizational role of the operator before production use.
      </p>
    </LegalDocument>
  );
}
