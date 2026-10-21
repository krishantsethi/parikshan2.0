import Link from "next/link";
import { FileText, ChevronRight } from "lucide-react";
import { DocumentStatusBadge } from "@/components/dashboard/indicators";
import type { MedicalDocument } from "@/types/domain";
import type { Translate } from "@/i18n";
import { formatRelative } from "@/lib/format";
import type { Locale } from "@/types/domain";
import { Badge } from "@/components/ui/badge";

export function DocumentRow({
  document,
  t,
  locale,
}: {
  document: MedicalDocument;
  t: Translate;
  locale: Locale;
}) {
  return (
    <Link
      href={`/dashboard/documents/${document.id}`}
      className="group flex items-center gap-3 rounded-xl border border-transparent px-2 py-2.5 transition-colors hover:border-line hover:bg-panel/60"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-panel-raised">
        <FileText className="size-4 text-muted" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium text-ink">{document.title}</span>
          {/^sample\b/i.test(document.title) && (
            <Badge tone="warning" className="shrink-0">
              {t("common.demoBadge")}
            </Badge>
          )}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-faint">
          {t(`docs.category.${document.category}` as "docs.category.other")} ·{" "}
          {formatRelative(document.createdAt, locale)}
        </span>
      </span>
      <DocumentStatusBadge status={document.status} t={t} />
      <ChevronRight className="size-3.5 shrink-0 text-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
