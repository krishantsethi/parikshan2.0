"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useT } from "@/components/providers/locale-provider";
import { useToast } from "@/components/providers/toast-provider";
import { computeFlag } from "@/server/documents/extract-lab";
import { cn } from "@/lib/utils";

export interface ReviewRow {
  id: string;
  testName: string;
  valueText: string;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
  refText: string | null;
  collectedAt: string | null;
  verified: boolean;
  notes: string | null;
  flag: "low" | "normal" | "high" | "unknown";
}

interface EditableRow extends ReviewRow {
  keep: boolean;
  dirty: boolean;
}

/**
 * Human-in-the-loop extraction review.
 * Flags are recomputed live (and again server-side) from the reference range
 * the user submits — the client can never assert an arbitrary flag.
 */
export function ExtractionReview({
  documentId,
  observations,
  reportDate,
}: {
  documentId: string;
  observations: ReviewRow[];
  reportDate: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [rows, setRows] = useState<EditableRow[]>(
    observations.map((observation) => ({ ...observation, keep: true, dirty: false })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unverifiedCount = rows.filter((row) => row.keep && !row.verified).length;
  const keptCount = rows.filter((row) => row.keep).length;

  const anyDirty = useMemo(() => rows.some((row) => row.dirty || !row.verified), [rows]);

  function update(id: string, patch: Partial<EditableRow>) {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch, dirty: true } : row)),
    );
  }

  async function confirmAll() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/${documentId}/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          observations: rows
            .filter((row) => row.keep)
            .map((row) => ({
              id: row.id,
              testName: row.testName.trim(),
              valueText: row.valueText.trim(),
              unit: row.unit?.trim() || null,
              refLow: row.refLow,
              refHigh: row.refHigh,
              refText: row.refText?.trim() || null,
              collectedAt: row.collectedAt || reportDate,
              keep: true,
            })),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("state.error.title"));
      toast({
        title: t("docs.detail.confirmed"),
        description: `${keptCount} value(s) are now verified.`,
        variant: "success",
      });
      router.refresh();
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : t("state.error.title"));
    } finally {
      setSaving(false);
    }
  }

  if (observations.length === 0) {
    return (
      <EmptyState
        title="No structured values extracted"
        description="The parser did not find laboratory values in this document. You can add measurements manually from Health trends."
      />
    );
  }

  return (
    <div className="space-y-4">
      {unverifiedCount > 0 && (
        <Alert tone="warning" title={t("docs.detail.review")}>
          {t("docs.detail.reviewHint")}
        </Alert>
      )}
      {error && (
        <Alert tone="danger" title="Could not save">
          {error}
        </Alert>
      )}

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[840px] text-left text-sm">
          <thead className="bg-panel-raised/70 text-[10px] uppercase tracking-wider text-faint">
            <tr>
              <th className="px-3 py-2.5 font-medium">Test</th>
              <th className="px-3 py-2.5 font-medium">Value</th>
              <th className="px-3 py-2.5 font-medium">{t("common.unit")}</th>
              <th className="px-3 py-2.5 font-medium">Range (low / high)</th>
              <th className="px-3 py-2.5 font-medium">{t("common.date")}</th>
              <th className="px-3 py-2.5 font-medium">Flag</th>
              <th className="px-3 py-2.5 font-medium text-right">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {rows.map((row) => {
              const numeric = Number.parseFloat(row.valueText.replace(/,/g, ""));
              const liveFlag = computeFlag(Number.isFinite(numeric) ? numeric : null, row.refLow, row.refHigh);
              return (
                <tr
                  key={row.id}
                  className={cn("bg-panel/20 align-top", !row.keep && "opacity-40")}
                >
                  <td className="px-3 py-2">
                    <input
                      value={row.testName}
                      onChange={(event) => update(row.id, { testName: event.target.value })}
                      aria-label="Test name"
                      className="w-40 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-[13px] text-ink hover:border-line focus:border-accent focus:outline-none"
                    />
                    {row.notes && /as printed/i.test(row.notes) && (
                      <p className="mt-0.5 max-w-44 truncate px-1.5 text-[10px] text-faint" title={row.notes}>
                        {row.notes.split(". Review")[0]}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={row.valueText}
                      onChange={(event) => update(row.id, { valueText: event.target.value })}
                      aria-label="Value"
                      className="w-20 rounded-md border border-transparent bg-transparent px-1.5 py-1 font-mono text-[13px] text-ink hover:border-line focus:border-accent focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={row.unit ?? ""}
                      onChange={(event) => update(row.id, { unit: event.target.value })}
                      aria-label="Unit"
                      className="w-20 rounded-md border border-transparent bg-transparent px-1.5 py-1 font-mono text-xs text-muted hover:border-line focus:border-accent focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <input
                        value={row.refLow ?? ""}
                        onChange={(event) =>
                          update(row.id, {
                            refLow: event.target.value === "" ? null : Number.parseFloat(event.target.value),
                          })
                        }
                        aria-label="Reference low"
                        placeholder="—"
                        className="w-14 rounded-md border border-transparent bg-transparent px-1.5 py-1 font-mono text-xs text-muted hover:border-line focus:border-accent focus:outline-none"
                      />
                      <span className="text-faint">–</span>
                      <input
                        value={row.refHigh ?? ""}
                        onChange={(event) =>
                          update(row.id, {
                            refHigh: event.target.value === "" ? null : Number.parseFloat(event.target.value),
                          })
                        }
                        aria-label="Reference high"
                        placeholder="—"
                        className="w-14 rounded-md border border-transparent bg-transparent px-1.5 py-1 font-mono text-xs text-muted hover:border-line focus:border-accent focus:outline-none"
                      />
                    </div>
                    {row.refText && <p className="mt-0.5 px-1.5 text-[10px] text-faint">{row.refText}</p>}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={row.collectedAt ?? ""}
                      onChange={(event) => update(row.id, { collectedAt: event.target.value || null })}
                      aria-label="Collection date"
                      className="rounded-md border border-transparent bg-transparent px-1.5 py-1 text-[11px] text-muted hover:border-line focus:border-accent focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      tone={
                        liveFlag === "high"
                          ? "warning"
                          : liveFlag === "low"
                            ? "azure"
                            : liveFlag === "normal"
                              ? "success"
                              : "neutral"
                      }
                    >
                      {liveFlag}
                    </Badge>
                    {row.verified && (
                      <p className="mt-1 text-[10px] text-success">verified</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      {row.keep ? (
                        <button
                          type="button"
                          onClick={() => update(row.id, { keep: false })}
                          className="rounded-md p-1.5 text-faint hover:bg-danger-dim hover:text-danger"
                          aria-label={`Remove ${row.testName}`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => update(row.id, { keep: true })}
                          className="rounded-md p-1.5 text-faint hover:bg-panel hover:text-ink"
                          aria-label={`Restore ${row.testName}`}
                        >
                          <RotateCcw className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-faint">
          {keptCount} of {rows.length} row(s) kept · {unverifiedCount} awaiting confirmation
        </p>
        <Button
          onClick={confirmAll}
          loading={saving}
          disabled={!anyDirty || keptCount === 0}
          icon={<CheckCheck className="size-4" />}
        >
          {t("docs.detail.confirmAll")}
        </Button>
      </div>
      <p className="text-[11px] leading-relaxed text-faint">{t("docs.detail.confirmed")}</p>
    </div>
  );
}
