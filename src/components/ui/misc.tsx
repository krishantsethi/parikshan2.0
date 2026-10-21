import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils";

/* ---------------------------------------------------------------- progress */

export function Progress({
  value,
  label,
  className,
  indeterminate,
}: {
  value?: number;
  label?: string;
  className?: string;
  indeterminate?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-panel-raised", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : clamped}
      aria-label={label ?? "Progress"}
    >
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r from-accent to-azure transition-[width] duration-500 ease-out",
          indeterminate && "skeleton w-1/3",
        )}
        style={indeterminate ? undefined : { width: `${clamped}%` }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ avatar */

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-14 text-lg" };
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-accent/25 bg-gradient-to-br from-azure-dim to-accent-dim font-semibold text-accent",
        sizes[size],
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/* -------------------------------------------------------------- page header */

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[1.7rem]">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ divider */

export function LabelValue({
  label,
  value,
  mono,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-faint">{label}</dt>
      <dd className={cn("mt-1 truncate text-sm text-ink", mono && "font-mono text-[13px]")}>{value}</dd>
    </div>
  );
}
