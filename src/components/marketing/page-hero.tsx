import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  badge,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  badge?: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-line/60">
      <div className="absolute inset-0 grid-overlay opacity-50" aria-hidden />
      <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_50%_-20%,rgba(66,232,245,0.14),transparent_65%)]" aria-hidden />
      <div className="relative mx-auto max-w-4xl px-5 pb-16 pt-16 text-center lg:px-8 lg:pb-20 lg:pt-24">
        {badge && (
          <Badge tone="accent" className="mb-5">
            {badge}
          </Badge>
        )}
        {eyebrow && (
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            {eyebrow}
          </p>
        )}
        <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted">
            {description}
          </p>
        )}
        {actions && <div className="mt-8 flex flex-wrap justify-center gap-3">{actions}</div>}
      </div>
    </section>
  );
}

export function MarketingSection({
  children,
  className,
  muted,
  id,
}: {
  children: ReactNode;
  className?: string;
  muted?: boolean;
  id?: string;
}) {
  return (
    <section id={id} className={muted ? "border-y border-line/60 bg-base-deep/30" : undefined}>
      <div className={`mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-24 ${className ?? ""}`}>{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  centered,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "mx-auto max-w-2xl text-center" : "max-w-3xl"}>
      {eyebrow && (
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
          {eyebrow}
        </p>
      )}
      <h2 className="text-balance text-2xl font-semibold tracking-tight text-ink sm:text-[2rem] sm:leading-[1.2]">
        {title}
      </h2>
      {description && (
        <p className="mt-3 text-sm leading-relaxed text-muted sm:text-[15px]">{description}</p>
      )}
    </div>
  );
}
