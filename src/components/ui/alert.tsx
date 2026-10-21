import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertTone = "info" | "success" | "warning" | "danger";

const TONES: Record<AlertTone, { wrap: string; icon: ReactNode }> = {
  info: { wrap: "border-azure/25 bg-azure-dim text-ink", icon: <Info className="size-4 text-azure" /> },
  success: {
    wrap: "border-success/25 bg-success-dim text-ink",
    icon: <CheckCircle2 className="size-4 text-success" />,
  },
  warning: {
    wrap: "border-warning/30 bg-warning-dim text-ink",
    icon: <AlertTriangle className="size-4 text-warning" />,
  },
  danger: {
    wrap: "border-danger/30 bg-danger-dim text-ink",
    icon: <ShieldAlert className="size-4 text-danger" />,
  },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
  role,
}: {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  role?: string;
}) {
  const config = TONES[tone];
  return (
    <div
      className={cn("flex items-start gap-3 rounded-xl border px-4 py-3 text-sm", config.wrap, className)}
      role={role ?? (tone === "danger" || tone === "warning" ? "alert" : "status")}
    >
      <span className="mt-0.5 shrink-0">{config.icon}</span>
      <div className="min-w-0 space-y-1">
        {title && <p className="font-semibold leading-snug">{title}</p>}
        {children && <div className="text-sm leading-relaxed text-muted">{children}</div>}
      </div>
    </div>
  );
}
