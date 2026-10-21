import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "azure";

const TONES: Record<BadgeTone, string> = {
  neutral: "border-line bg-panel-raised text-muted",
  accent: "border-accent/30 bg-accent-dim text-accent",
  success: "border-success/30 bg-success-dim text-success",
  warning: "border-warning/30 bg-warning-dim text-warning",
  danger: "border-danger/30 bg-danger-dim text-danger",
  azure: "border-azure/30 bg-azure-dim text-azure",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  dot,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}
