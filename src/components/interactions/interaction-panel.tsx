"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink, FlaskConical, ShieldPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { useT } from "@/components/providers/locale-provider";
import { useToast } from "@/components/providers/toast-provider";
import { formatDateTime } from "@/lib/format";
import type { InteractionCheck, Locale } from "@/types/domain";
import { cn } from "@/lib/utils";

export interface MedicationOption {
  id: string;
  name: string;
  dosageText: string | null;
  active: boolean;
}

export function InteractionPanel({
  medications,
  initialChecks,
  profileId,
  locale,
  openfdaEnabled,
}: {
  medications: MedicationOption[];
  initialChecks: InteractionCheck[];
  profileId: string;
  locale: Locale;
  openfdaEnabled: boolean;
}) {
  const t = useT();
  const { toast } = useToast();
  const activeMedications = medications.filter((medication) => medication.active);
  const [selected, setSelected] = useState<string[]>(activeMedications.map((med) => med.id));
  const [checks, setChecks] = useState<InteractionCheck[]>(initialChecks);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [uncertain, setUncertain] = useState<string[]>([]);
  const latest = checks[0];

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]));
  }

  async function run() {
    setError(null);
    setWarnings([]);
    setUncertain([]);
    if (selected.length < 2) {
      setError(t("interactions.empty"));
      return;
    }
    setRunning(true);
    try {
      const response = await fetch("/api/interactions/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profileId, medicationIds: selected }),
      });
      const data = (await response.json()) as {
        check?: InteractionCheck;
        warnings?: string[];
        uncertainNames?: string[];
        error?: string;
      };
      if (!response.ok || !data.check) throw new Error(data.error ?? t("state.error.title"));
      setChecks((prev) => [data.check!, ...prev].slice(0, 10));
      setWarnings(data.warnings ?? []);
      setUncertain(data.uncertainNames ?? []);
      toast({ title: "Interaction review complete", variant: "success" });
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : t("state.error.title");
      setError(message);
      toast({ title: message, variant: "error" });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">{t("interactions.selectMeds")}</h2>
            <p className="mt-0.5 text-xs text-muted">
              Only active medications are preselected. You choose exactly what is reviewed.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={openfdaEnabled ? "success" : "neutral"}>
              OpenFDA {openfdaEnabled ? "enabled" : "disabled"}
            </Badge>
            <Badge tone="accent">{selected.length} selected</Badge>
          </div>
        </div>

        {activeMedications.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              compact
              icon={<ShieldPlus className="size-5" aria-hidden />}
              title={t("interactions.empty")}
              description="Add at least two active medications for this profile first."
              action={<ButtonLink href="/dashboard/medications" size="sm">{t("meds.add")}</ButtonLink>}
            />
          </div>
        ) : (
          <fieldset className="mt-4">
            <legend className="sr-only">Medications to review</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {activeMedications.map((medication) => {
                const checked = selected.includes(medication.id);
                return (
                  <label
                    key={medication.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                      checked
                        ? "border-accent/40 bg-accent-dim text-ink"
                        : "border-line text-muted hover:border-line-strong",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(medication.id)}
                      className="size-4 accent-[var(--color-accent)]"
                    />
                    <span className="min-w-0 flex-1 truncate">{medication.name}</span>
                    {medication.dosageText && (
                      <span className="shrink-0 font-mono text-[10px] text-faint">{medication.dosageText}</span>
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            onClick={run}
            loading={running}
            disabled={activeMedications.length < 2}
            icon={<FlaskConical className="size-4" />}
          >
            {t("interactions.run")}
          </Button>
          <span className="text-[11px] text-faint">
            Max 20 medications · curated dataset + {openfdaEnabled ? "OpenFDA" : "no live source"}
          </span>
        </div>
      </div>

      {error && <Alert tone="danger" title="Review failed">{error}</Alert>}

      {latest && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">
              Findings · {formatDateTime(latest.createdAt, locale)}
            </h2>
            <div className="flex items-center gap-2">
              <Badge tone={latest.status === "complete" ? "success" : latest.status === "partial" ? "warning" : "neutral"}>
                {latest.status === "complete" ? "Complete" : latest.status === "partial" ? "Partial" : "Unavailable"}
              </Badge>
              {latest.sourcesUsed.map((source) => (
                <Badge key={source} tone="azure">
                  {source}
                </Badge>
              ))}
            </div>
          </div>

          {uncertain.length > 0 && (
            <Alert tone="warning" title="Uncertain names">
              {t("interactions.uncertainNames")} ({uncertain.join(", ")})
            </Alert>
          )}
          {warnings.length > 0 && (
            <Alert tone="info" title="Review notes">
              <ul className="list-disc space-y-1 pl-4">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </Alert>
          )}

          {latest.findings.length === 0 ? (
            <Alert tone="warning" title={t("interactions.noneFound")}>
              {t("interactions.noneFoundWarning")}
            </Alert>
          ) : (
            <ul className="space-y-2">
              {latest.findings.map((finding, index) => (
                <li key={`${finding.drugA}-${finding.drugB}-${index}`} className="panel p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <AlertTriangle
                      className={cn(
                        "size-4",
                        finding.severity === "major"
                          ? "text-danger"
                          : finding.severity === "moderate"
                            ? "text-warning"
                            : "text-faint",
                      )}
                      aria-hidden
                    />
                    <span className="text-sm font-semibold text-ink">
                      {finding.drugA} + {finding.drugB}
                    </span>
                    <Badge
                      tone={
                        finding.severity === "major"
                          ? "danger"
                          : finding.severity === "moderate"
                            ? "warning"
                            : finding.severity === "minor"
                              ? "azure"
                              : "neutral"
                      }
                    >
                      {t(`interactions.severity.${finding.severity === "unknown" ? "minor" : finding.severity}` as "interactions.severity.major")}
                    </Badge>
                    <Badge tone="azure">{finding.source}</Badge>
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted">{finding.description}</p>
                  {finding.evidenceNote && (
                    <p className="mt-1.5 text-[11px] leading-relaxed text-faint">{finding.evidenceNote}</p>
                  )}
                </li>
              ))}
            </ul>
          )}

          <Alert tone="danger" title={t("interactions.disclaimer")}>
            {latest.disclaimer}
          </Alert>
        </div>
      )}

      {checks.length > 1 && (
        <details className="panel p-4">
          <summary className="cursor-pointer text-sm font-medium text-ink">
            {t("interactions.history")} ({checks.length - 1})
          </summary>
          <ul className="mt-3 divide-y divide-line">
            {checks.slice(1).map((check) => (
              <li key={check.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="text-xs text-muted">
                  {check.medicationNames.join(", ")}
                </span>
                <span className="flex items-center gap-2 text-[11px] text-faint">
                  {formatDateTime(check.createdAt, locale)}
                  <Badge tone={check.findings.length > 0 ? "warning" : "success"}>
                    {check.findings.length} finding(s)
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="rounded-xl border border-line bg-panel/40 p-4">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
          <CheckCircle2 className="size-3.5 text-accent" aria-hidden />
          Sources
        </h2>
        <ul className="mt-2 space-y-1 text-[11px] text-faint">
          <li>{t("interactions.source.curated")}</li>
          <li>
            {openfdaEnabled ? t("interactions.source.openfda") : "OpenFDA is disabled on this deployment (OPENFDA_ENABLED=false)."}{" "}
            {openfdaEnabled && (
              <a
                href="https://open.fda.gov/apis/drug/label/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-accent hover:underline"
              >
                API docs <ExternalLink className="size-2.5" aria-hidden />
              </a>
            )}
          </li>
          <li>
            <Link href="/dashboard/medications" className="text-accent hover:underline">
              Update your medication list
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
