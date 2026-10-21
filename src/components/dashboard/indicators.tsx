import { AlertTriangle, CheckCircle2, Clock3, FileWarning, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DocumentStatus, ObservationFlag } from "@/types/domain";
import type { Translate } from "@/i18n";
import { cn } from "@/lib/utils";

export function DocumentStatusBadge({ status, t }: { status: DocumentStatus; t: Translate }) {
  switch (status) {
    case "processing":
      return (
        <Badge tone="azure">
          <Loader2 className="size-3 animate-spin" aria-hidden />
          {t("docs.status.processing")}
        </Badge>
      );
    case "ready":
      return (
        <Badge tone="success">
          <CheckCircle2 className="size-3" aria-hidden />
          {t("docs.status.ready")}
        </Badge>
      );
    case "needs_review":
      return (
        <Badge tone="warning">
          <Clock3 className="size-3" aria-hidden />
          {t("docs.status.needs_review")}
        </Badge>
      );
    case "failed":
      return (
        <Badge tone="danger">
          <FileWarning className="size-3" aria-hidden />
          {t("docs.status.failed")}
        </Badge>
      );
  }
}

export function FlagBadge({ flag, t, compact }: { flag: ObservationFlag; t: Translate; compact?: boolean }) {
  const tone = flag === "high" ? "warning" : flag === "low" ? "azure" : flag === "normal" ? "success" : "neutral";
  const label =
    flag === "high"
      ? t("docs.flag.high")
      : flag === "low"
        ? t("docs.flag.low")
        : flag === "normal"
          ? t("docs.flag.normal")
          : t("docs.flag.unknown");
  return (
    <Badge tone={tone}>
      {flag === "unknown" ? <AlertTriangle className="size-3" aria-hidden /> : null}
      {compact ? (
        <span className="font-mono uppercase">{flag === "unknown" ? "?" : flag}</span>
      ) : (
        label
      )}
    </Badge>
  );
}

export function FlagDot({ flag }: { flag: ObservationFlag }) {
  return (
    <span
      className={cn(
        "inline-block size-2 rounded-full",
        flag === "high" && "bg-warning",
        flag === "low" && "bg-azure",
        flag === "normal" && "bg-success",
        flag === "unknown" && "bg-faint",
      )}
      aria-hidden
    />
  );
}
