import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, CircleDashed, KeyRound, Lock, ServerCog, ShieldCheck, TriangleAlert } from "lucide-react";
import { MarketingSection, PageHero, SectionHeading } from "@/components/marketing/page-hero";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Security & privacy",
  description:
    "PARIKSHAN's security model: scrypt password hashing, signed httpOnly sessions, server-enforced ownership, validated uploads, rate limiting, and honest limitations.",
};

const implemented = [
  {
    icon: KeyRound,
    title: "Password storage",
    body: "Passwords are hashed with scrypt (N=16384, r=8, p=1) using a unique 16-byte salt per user and constant-time comparison. Plaintext passwords are never stored or logged.",
  },
  {
    icon: Lock,
    title: "Session handling",
    body: "Sessions use 256-bit opaque tokens stored only as SHA-256 hashes in the database. The cookie is httpOnly, SameSite=Lax, Secure in production, and expires server-side.",
  },
  {
    icon: ShieldCheck,
    title: "Authorization on every request",
    body: "Documents, profiles, observations, medications, conversations, and exports are scoped by user id inside the data layer. A missing record and someone else's record are indistinguishable (both 404).",
  },
  {
    icon: ServerCog,
    title: "Upload hardening",
    body: "Files are validated by magic bytes against an allowlist (PDF/PNG/JPEG/WebP), size-capped, filename-sanitized, and served with nosniff plus sandbox headers only after an ownership check.",
  },
  {
    icon: ShieldCheck,
    title: "Rate limiting",
    body: "Authentication, uploads, AI calls, feedback, and interaction checks are rate-limited per client IP with bounded request bodies and safe error messages.",
  },
  {
    icon: Lock,
    title: "Data minimization for AI",
    body: "Only the record excerpts needed to answer a question are sent to the configured AI provider. No documents are used to train models, and provider API keys never reach the browser.",
  },
];

const checklist: Array<{ label: string; state: "done" | "partial" | "todo"; note: string }> = [
  { label: "Server-side ownership checks", state: "done", note: "Enforced in the service layer and every SQL query." },
  { label: "Security headers (CSP, nosniff, frame-deny)", state: "done", note: "Set in next.config.ts, except the sandboxed file endpoint." },
  { label: "Row-level security policies", state: "partial", note: "Provided in migration 0002; enforced only for non-owner database roles." },
  { label: "Automated unit + integration tests", state: "done", note: "Vitest suites cover auth hashing, ownership, extraction, calculators, interactions, i18n parity, and more." },
  { label: "Shared rate-limit store (multi-instance)", state: "todo", note: "The in-memory limiter is per instance; use Redis/Upstash for global limits." },
  { label: "MFA / passkeys", state: "todo", note: "Not implemented. Single-factor password auth only." },
  { label: "Email delivery (password reset, alerts)", state: "todo", note: "No mail provider configured; development prints the reset link to the server console." },
  { label: "Independent penetration test", state: "todo", note: "Not performed. Required before handling real patient data at scale." },
  { label: "Formal certifications (HIPAA/GDPR/ISO)", state: "todo", note: "None claimed and none held." },
];

export default function SecurityPage() {
  return (
    <>
      <PageHero
        eyebrow="Privacy & security"
        title="Privacy is an engineering property here."
        description="Health data is sensitive. This page documents what is implemented, how it works, and — just as importantly — what is still missing before real-world clinical use."
        badge="No compliance claims"
      />

      <MarketingSection>
        <SectionHeading
          eyebrow="Implemented controls"
          title="What actually protects your records"
          description="Each control below is present in the codebase and covered by tests where it can be tested without external services."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {implemented.map((item) => (
            <article key={item.title} className="panel p-5">
              <item.icon className="size-5 text-accent" aria-hidden />
              <h3 className="mt-3 text-sm font-semibold text-ink">{item.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{item.body}</p>
            </article>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection muted>
        <SectionHeading
          eyebrow="Data lifecycle"
          title="Your data, your controls"
          description="There is no hidden retention engine. Records exist until you delete them, and deletion is immediate and cascading."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "What we store",
              items: [
                "Account name, email, hashed password",
                "Profiles and their authorization records",
                "Uploaded files, extracted text, confirmed measurements",
                "Medications, conversations, audit events",
              ],
            },
            {
              title: "What we do not do",
              items: [
                "Sell or share data with advertisers",
                "Use your records to train models",
                "Expose dashboard pages to search engines",
                "Log full medical documents or secrets",
              ],
            },
            {
              title: "Deletion",
              items: [
                "Delete a document → file, text, and linked values removed",
                "Delete a profile → all its records cascade",
                "Delete your account → everything, including audit metadata",
                "Export before deleting if you want a copy",
              ],
            },
          ].map((column) => (
            <div key={column.title} className="panel p-5">
              <h3 className="text-sm font-semibold text-ink">{column.title}</h3>
              <ul className="mt-3 space-y-2">
                {column.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[13px] text-muted">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent/70" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection>
        <SectionHeading
          eyebrow="Security checklist"
          title="Known gaps, stated plainly"
          description="A security review that lists only successes is not a security review. These are the open items."
        />
        <div className="mt-8 overflow-hidden rounded-[var(--radius-card)] border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-panel-raised text-[11px] uppercase tracking-wider text-faint">
              <tr>
                <th className="px-4 py-3 font-medium">Control</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {checklist.map((row) => (
                <tr key={row.label} className="bg-panel/40">
                  <td className="px-4 py-3 text-ink">{row.label}</td>
                  <td className="px-4 py-3">
                    {row.state === "done" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-success">
                        <CheckCircle2 className="size-3.5" aria-hidden /> Done
                      </span>
                    ) : row.state === "partial" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-warning">
                        <TriangleAlert className="size-3.5" aria-hidden /> Partial
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-faint">
                        <CircleDashed className="size-3.5" aria-hidden /> Open
                      </span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-muted md:table-cell">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Alert tone="warning" className="mt-6" title="Not a medical device; not certified">
          PARIKSHAN makes no HIPAA, GDPR, ISO 27001, ABDM, or FHIR-compliance claims. Operating this
          software for real patient data requires an independent security assessment, a data
          processing agreement, and jurisdiction-specific legal review.
        </Alert>
      </MarketingSection>

      <MarketingSection muted>
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
          <div>
            <SectionHeading eyebrow="Deployment" title="Secure configuration matters" />
            <ul className="mt-5 space-y-3 text-sm text-muted">
              <li className="flex gap-2.5">
                <Badge tone="accent">1</Badge>
                Set a strong <code className="font-mono text-xs">AUTH_SECRET</code> (32+ random bytes)
                before serving real users.
              </li>
              <li className="flex gap-2.5">
                <Badge tone="accent">2</Badge>
                Point <code className="font-mono text-xs">DATABASE_URL</code> at a restricted role,
                not the table owner, so RLS policies are enforced.
              </li>
              <li className="flex gap-2.5">
                <Badge tone="accent">3</Badge>
                Keep AI and OCR credentials server-side only; rotate them independently of clients.
              </li>
              <li className="flex gap-2.5">
                <Badge tone="accent">4</Badge>
                Use a shared rate-limit store and a managed WAF in front of the app for production
                traffic.
              </li>
            </ul>
          </div>
          <div className="panel p-6">
            <h3 className="text-sm font-semibold text-ink">Responsible disclosure</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              If you find a vulnerability, please open a private security advisory on the GitHub
              repository rather than a public issue. Include reproduction steps and the affected
              version. We will acknowledge and triage reports as quickly as possible.
            </p>
            <ButtonLink href="/contact" variant="secondary" className="mt-4" iconRight={<ArrowRight className="size-4" />}>
              Contact the team
            </ButtonLink>
          </div>
        </div>
      </MarketingSection>
    </>
  );
}
