"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Loader2,
  Pencil,
  RefreshCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { useT } from "@/components/providers/locale-provider";
import { useToast } from "@/components/providers/toast-provider";
import type { DocumentCategory } from "@/types/domain";

const CATEGORY_VALUES: DocumentCategory[] = [
  "lab_report",
  "prescription",
  "discharge_summary",
  "imaging_report",
  "vaccination",
  "invoice",
  "insurance",
  "other",
];

export function DocumentActions({
  documentId,
  title,
  category,
  status,
  aiConfigured,
  summaryKind,
}: {
  documentId: string;
  title: string;
  category: DocumentCategory;
  status: string;
  aiConfigured: boolean;
  summaryKind: "ai" | "structured_digest" | null;
}) {
  const router = useRouter();
  const t = useT();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState({ title, category });
  const [busy, setBusy] = useState<"edit" | "delete" | "retry" | "summary" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveDetails() {
    setBusy("edit");
    setError(null);
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: form.title.trim(), category: form.category }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("state.error.title"));
      toast({ title: t("settings.saved"), variant: "success" });
      setEditOpen(false);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("state.error.title"));
    } finally {
      setBusy(null);
    }
  }

  async function retry() {
    setBusy("retry");
    try {
      const response = await fetch(`/api/documents/${documentId}/retry`, { method: "POST" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("state.error.title"));
      toast({ title: "Reprocessing started", variant: "success" });
      router.refresh();
    } catch (retryError) {
      toast({
        title: retryError instanceof Error ? retryError.message : t("state.error.title"),
        variant: "error",
      });
    } finally {
      setBusy(null);
    }
  }

  async function generateSummary() {
    setBusy("summary");
    try {
      const response = await fetch(`/api/documents/${documentId}/summary`, { method: "POST" });
      const data = (await response.json()) as { configured?: boolean; error?: string };
      if (!response.ok) throw new Error(data.error ?? t("state.error.title"));
      if (data.configured === false) {
        toast({
          title: "AI provider not configured",
          description: "A structured digest is shown instead. Set OPENAI_API_KEY to enable AI explanations.",
          variant: "warning",
        });
      } else {
        toast({ title: "Explanation generated", variant: "success" });
        router.refresh();
      }
    } catch (summaryError) {
      toast({
        title: summaryError instanceof Error ? summaryError.message : t("state.error.title"),
        variant: "error",
      });
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("delete");
    try {
      const response = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("state.error.title"));
      toast({ title: t("common.deleted"), variant: "success" });
      router.push("/dashboard/documents");
      router.refresh();
    } catch (deleteError) {
      toast({
        title: deleteError instanceof Error ? deleteError.message : t("state.error.title"),
        variant: "error",
      });
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={`/api/documents/${documentId}/file?download=1`}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-xs text-ink transition-colors hover:border-line-strong"
      >
        <Download className="size-3.5" aria-hidden />
        {t("docs.detail.download")}
      </a>
      <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)} icon={<Pencil className="size-3.5" />}>
        {t("common.edit")}
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={generateSummary}
        loading={busy === "summary"}
        icon={<Sparkles className="size-3.5" />}
      >
        {summaryKind === "ai" ? t("docs.detail.regenerate") : t("docs.detail.aiSummary")}
      </Button>
      {(status === "failed" || status === "needs_review" || status === "ready") && (
        <Button
          variant="ghost"
          size="sm"
          onClick={retry}
          loading={busy === "retry"}
          icon={<RefreshCcw className="size-3.5" />}
        >
          {t("common.retry")}
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setDeleteOpen(true)}
        className="text-danger hover:bg-danger-dim hover:text-danger"
        icon={<Trash2 className="size-3.5" />}
      >
        {t("common.delete")}
      </Button>
      {!aiConfigured && (
        <span className="hidden items-center gap-1.5 text-[10px] text-faint md:inline-flex">
          <Loader2 className="size-3" aria-hidden /> AI disabled (deterministic digest active)
        </span>
      )}

      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit document details"
        description="Correcting the title or category does not change the stored file or extracted text."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={saveDetails} loading={busy === "edit"}>
              {t("common.save")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {error && <Alert tone="danger" title="Could not save">{error}</Alert>}
          <Input
            label="Title"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            maxLength={300}
          />
          <Select
            label={t("common.category")}
            value={form.category}
            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value as DocumentCategory }))}
            options={CATEGORY_VALUES.map((value) => ({
              value,
              label: t(`docs.category.${value}` as "docs.category.other"),
            }))}
          />
        </div>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={t("docs.detail.delete.title")}
        description={t("docs.detail.delete.body")}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" onClick={remove} loading={busy === "delete"} icon={<Trash2 className="size-4" />}>
              {t("common.delete")}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">
          This permanently removes <span className="text-ink">{title}</span> and any measurements
          extracted from it.
        </p>
      </Dialog>
    </div>
  );
}
