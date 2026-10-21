import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Plus, UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/misc";
import { DocumentFilters } from "@/components/documents/document-filters";
import { DocumentStatusBadge } from "@/components/dashboard/indicators";
import { getDashboardContext } from "@/server/dashboard/context";
import { getStore } from "@/server/db";
import { formatBytes, formatDateTime } from "@/lib/format";
import type { DocumentCategory, DocumentStatus } from "@/types/domain";

export const metadata: Metadata = {
  title: "Documents",
  robots: { index: false, follow: false },
};

const VALID_CATEGORIES: DocumentCategory[] = [
  "lab_report",
  "prescription",
  "discharge_summary",
  "imaging_report",
  "vaccination",
  "invoice",
  "insurance",
  "other",
];
const VALID_STATUSES: DocumentStatus[] = ["processing", "ready", "needs_review", "failed"];

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; status?: string; sort?: string }>;
}) {
  const { user, activeProfile, t, locale } = await getDashboardContext();
  const params = await searchParams;
  const store = await getStore();

  const category = VALID_CATEGORIES.includes(params.category as DocumentCategory)
    ? (params.category as DocumentCategory)
    : undefined;
  const status = VALID_STATUSES.includes(params.status as DocumentStatus)
    ? (params.status as DocumentStatus)
    : undefined;

  const { items, total } = await store.listDocuments({
    userId: user.id,
    profileId: activeProfile.id,
    search: params.q?.slice(0, 120),
    category,
    status,
    limit: 100,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={activeProfile.name}
        title={t("docs.title")}
        description={t("docs.subtitle")}
        actions={
          <ButtonLink href="/dashboard/documents/upload" icon={<UploadCloud className="size-4" />}>
            {t("nav.upload")}
          </ButtonLink>
        }
      />

      <DocumentFilters />

      <div className="flex items-center justify-between text-xs text-faint">
        <span>
          {total} document{total === 1 ? "" : "s"} for this profile
        </span>
        <span className="hidden sm:inline">Sorted by newest first</span>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-5" aria-hidden />}
          title={params.q || category || status ? "No documents match these filters" : t("docs.title")}
          description={
            params.q || category || status
              ? "Try clearing the search or filters, or upload a new report."
              : "Upload a lab report, prescription, or scan to start building your record library."
          }
          action={
            <ButtonLink href="/dashboard/documents/upload" icon={<Plus className="size-4" />}>
              {t("docs.upload.title")}
            </ButtonLink>
          }
        />
      ) : (
        <div className="panel overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line bg-panel-raised/60 text-[10px] uppercase tracking-wider text-faint">
                <tr>
                  <th className="px-4 py-3 font-medium">Document</th>
                  <th className="px-4 py-3 font-medium">{t("common.category")}</th>
                  <th className="px-4 py-3 font-medium">{t("common.status")}</th>
                  <th className="px-4 py-3 font-medium">Results</th>
                  <th className="px-4 py-3 font-medium">Uploaded</th>
                  <th className="px-4 py-3 font-medium text-right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {items.map((document) => (
                  <tr key={document.id} className="bg-panel/20 transition-colors hover:bg-panel/60">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/documents/${document.id}`} className="group block">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-medium text-ink group-hover:text-accent">
                            {document.title}
                          </span>
                          {/^sample\b/i.test(document.title) && <Badge tone="warning">{t("common.demoBadge")}</Badge>}
                        </span>
                        <span className="mt-0.5 block truncate font-mono text-[10px] text-faint">
                          {document.originalFilename} · {formatBytes(document.sizeBytes)}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {t(`docs.category.${document.category}` as "docs.category.other")}
                    </td>
                    <td className="px-4 py-3">
                      <DocumentStatusBadge status={document.status} t={t} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {document.status === "processing" ? "—" : document.summary ? "✓" : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-faint">
                      {formatDateTime(document.createdAt, locale)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/documents/${document.id}`}
                        className="text-xs text-accent hover:underline"
                      >
                        {t("common.view")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
