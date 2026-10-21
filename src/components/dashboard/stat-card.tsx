import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon,
  href,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: ReactNode;
  href?: string;
  accent?: "accent" | "azure" | "success" | "warning";
}) {
  const accentClass =
    accent === "azure"
      ? "text-azure bg-azure-dim border-azure/25"
      : accent === "success"
        ? "text-success bg-success-dim border-success/25"
        : accent === "warning"
          ? "text-warning bg-warning-dim border-warning/25"
          : "text-accent bg-accent-dim border-accent/25";

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className={cn("flex size-9 items-center justify-center rounded-lg border", accentClass)}>
          {icon}
        </div>
        {href && <ArrowUpRight className="size-3.5 text-faint opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
      {hint && <p className="mt-1 text-[11px] text-faint">{hint}</p>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="group panel block p-4 transition-colors hover:border-line-strong">
        {content}
      </Link>
    );
  }
  return <div className="panel p-4">{content}</div>;
}
