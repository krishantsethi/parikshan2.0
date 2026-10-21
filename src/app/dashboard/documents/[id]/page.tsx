import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BrainCircuit,
  FileText,
  Info,
  Sparkles,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { LabelValue, PageHeader } from "@/components/ui/misc";
import { Tabs } from "@/components/ui/tabs";
import { DocumentActions } from "@/components/documents/document-actions";
import { ExtractionReview, type ReviewRow } from "@/components/documents/extraction-review";
import { DocumentStatusBadge } from "@/components/dashboard/indicators";
import { getDashboardContext } from "@/server/dashboard/context";
import { getStore } from "@/server/db";
import { formatDateTime } from "@/lib/format";
import { formatBytes } from "@/lib/format";

export const metadata: Metadata = {
  title: "Document",
  robots: { index: false, follow: false },
};

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, activeProfile, profiles, t, locale, aiConfigured } = await getDashboardContext();
  const store = await getStore();

  const document = await store.getDocument(id);
  if (!document || document.userId !== user.id) notFound();

  const [textRecord, observations] = await Promise.all([
    store.getDocumentText(id),
    store.listObservations({ userId: user.id, documentId: id, limit: 300 }),
  ]);
  const ownerProfile = profiles.find((profile) => profile.id === document.profileId);

  const reviewRows: ReviewRow[] = observations.map((observation) => ({
    id: observation.id,
    testName: observation.testName,
    valueText: observation.valueText,
    unit: observation.unit,
    refLow: observation.refLow,
    refHigh: observation.refHigh,
    refText: observation.refText,
    collectedAt: observation.collectedAt,
    verified: observation.verified,
    notes: observation.notes,
    flag: observation.flag,
  }));

  const engineLabel =
    document.ocrEngine === "ocr_tesseract"
      ? t("docs.ocr.engine.ocr_tesseract")
      : document.ocrEngine === "pdf_text"
        ? t("docs.ocr.engine.pdf_text")
        : t("common.unknown");

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/documents"
        className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {t("docs.title")}
      </Link>

      <PageHeader
        eyebrow={
          <span className="flex flex-wrap items-center gap-2">
            <span>{t(`docs.category.${document.category}` as "docs.category.other")}</span>
            <span aria-hidden>·</span>
            <span>{formatDateTime(document.createdAt, locale)}</span>
            {ownerProfile && ownerProfile.id !== activeProfile.id && (
              <>
                <span aria-hidden>·</span>
                <span>{ownerProfile.name}</span>
              </>
            )}
          </span>
        }
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            {document.title}
            {/^sample\b/i.test(document.title) && <Badge tone="warning">{t("common.demoBadge")}</Badge>}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2 text-xs">
            <DocumentStatusBadge status={document.status} t={t} />
            <span className="font-mono">
              {document.originalFilename} · {formatBytes(document.sizeBytes)}
            </span>
            {document.ocrEngine && <Badge tone="neutral">{engineLabel}</Badge>}
            {document.textConfidence !== null && (
              <Badge tone={document.textConfidence >= 0.8 ? "success" : "warning"}>
                {t("common.confidence")} {Math.round(document.textConfidence * 100)}%
              </Badge>
            )}
          </span>
        }
        actions={
          <DocumentActions
            documentId={document.id}
            title={document.title}
            category={document.category}
            status={document.status}
            aiConfigured={aiConfigured}
            summaryKind={document.summaryKind}
          />
        }
      />

      {document.status === "failed" && (
        <Alert
          tone="danger"
          title={t("docs.upload.failed")}
          role="alert"
        >
          {document.errorMessage ?? "Processing failed for an unknown reason."}
        </Alert>
      )}
      {document.status !== "failed" && document.errorMessage && (
        <Alert tone="warning" title="Processing notes" role="status">
          {document.errorMessage}
        </Alert>
      )}
      {document.status === "processing" && (
        <Alert tone="info" title={t("docs.upload.extracting")}>
          This document is still being processed. Refresh in a moment, or retry if it stalls.
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.55fr_0.45fr]">
        <Card>
          <CardHeader
            icon={
              document.summaryKind === "ai" ? (
                <Sparkles className="size-4" aria-hidden />
              ) : (
                <BrainCircuit className="size-4" aria-hidden />
              )
            }
            title={t("docs.detail.summary")}
            description={
              document.summaryKind === "ai"
                ? t("docs.detail.aiSummary")
                : document.summaryKind === "structured_digest"
                  ? t("docs.detail.digestSummary")
                  : undefined
            }
            action={
              document.summaryKind === "ai" ? (
                <Badge tone="accent">AI</Badge>
              ) : document.summaryKind === "structured_digest" ? (
                <Badge tone="neutral">Deterministic</Badge>
              ) : null
            }
          />
          {document.summary ? (
            <div className="pk-prose max-w-none text-[13px]">
              {document.summary.split("\n").map((line, index) =>
                line.trim() === "" ? null : (
                  <p key={index} className="whitespace-pre-wrap">
                    {line}
                  </p>
                ),
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">
              No explanation has been generated yet. Use “Generate explanation” above.
            </p>
          )}
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-line bg-panel/40 p-3 text-[11px] leading-relaxed text-faint">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              {document.summaryKind === "ai"
                ? t("common.aiGenerated")
                : "Generated deterministically from the document text without an AI model. "}
              {t("common.notMedicalAdvice")}
            </span>
          </div>
        </Card>

        <Card>
          <CardHeader title="Details" />
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <LabelValue label={t("common.category")} value={t(`docs.category.${document.category}` as "docs.category.other")} />
            <LabelValue label="Engine" value={engineLabel} />
            <LabelValue label="Pages" value={document.pages ?? "—"} mono />
            <LabelValue label="Extracted characters" value={document.textLength.toLocaleString("en-IN")} mono />
            <LabelValue label="Uploaded" value={formatDateTime(document.createdAt, locale)} />
            <LabelValue label="Last updated" value={formatDateTime(document.updatedAt, locale)} />
          </dl>
          <p className="mt-4 text-[10px] leading-relaxed text-faint">
            Document ID <span className="font-mono">{document.id}</span>
          </p>
        </Card>
      </div>

      <Tabs
        items={[
          {
            id: "review",
            label: t("docs.detail.extracted"),
            icon: <FileText className="size-3.5" aria-hidden />,
            content: (
              <ExtractionReview
                documentId={document.id}
                observations={reviewRows}
                reportDate={reviewRows[0]?.collectedAt ?? null}
              />
            ),
          },
          {
            id: "text",
            label: t("docs.detail.sourceText"),
            content: textRecord ? (
              <div>
                <div className="mb-2 flex items-center gap-2 text-[11px] text-faint">
                  <AlertTriangle className="size-3.5" aria-hidden />
                  Extracted text is unedited source content. Verify values against the original file.
                </div>
                <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-base-deep/40 p-4 font-mono text-[11px] leading-relaxed text-muted">
                  {textRecord.text.slice(0, 60000)}
                  {textRecord.text.length > 60000 ? "\n\n…truncated for display…" : ""}
                </pre>
              </div>
            ) : (
              <p className="text-sm text-muted">{t("docs.detail.noText")}</p>
            ),
          },
          {
            id: "help",
            label: "How this works",
            content: (
              <div className="pk-prose max-w-none text-[13px]">
                <h2 className="mt-0">Provenance</h2>
                <p>
                  Values are parsed deterministically from the extracted text. The “as printed” note
                  on each row records the exact source label, and abnormality flags are computed only
                  from the reference range printed on this document.
                </p>
                <h2>Confirmation</h2>
                <p>
                  Confirmed rows are marked verified and become available in Health trends. Editing a
                  value or range recomputes the flag on the server — the client cannot set a flag
                  directly.
                </p>
                <h2>Limits</h2>
                <p>
                  OCR and parsing can misread values, especially from low-quality scans. Always verify
                  against the original report. {t("common.notMedicalAdvice")}
                </p>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
