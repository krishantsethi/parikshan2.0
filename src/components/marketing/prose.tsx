import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";

/** Long-form legal/policy layout with an explicit draft warning. */
export function LegalDocument({
  title,
  updated,
  children,
  draftWarning = true,
}: {
  title: string;
  updated: string;
  children: ReactNode;
  draftWarning?: boolean;
}) {
  return (
    <article className="mx-auto max-w-3xl px-5 py-16 lg:px-8 lg:py-20">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Legal</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h1>
      <p className="mt-2 text-xs text-faint">
        Draft version · last updated {updated} · prepared for review by qualified counsel
      </p>
      {draftWarning && (
        <Alert tone="warning" className="mt-6" title="This is a draft, not legal advice">
          This document was prepared by the engineering team as a starting point. It has not been
          reviewed by a lawyer and may not satisfy the legal requirements of your jurisdiction.
          Do not treat it as a final privacy policy or terms of service.
        </Alert>
      )}
      <div className="pk-prose mt-10">{children}</div>
    </article>
  );
}
