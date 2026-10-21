"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, ExternalLink, Plus, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Switch } from "@/components/ui/switch";
import { FlagBadge } from "@/components/dashboard/indicators";
import { useTheme } from "@/components/providers/theme-provider";
import { useT } from "@/components/providers/locale-provider";
import { useToast } from "@/components/providers/toast-provider";
import { formatDate } from "@/lib/format";
import type { Locale } from "@/types/domain";

export interface TrendPoint {
  id: string;
  testName: string;
  valueText: string;
  valueNumeric: number | null;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
  refText: string | null;
  flag: "low" | "normal" | "high" | "unknown";
  collectedAt: string | null;
  verified: boolean;
  documentId: string | null;
  notes: string | null;
}

type RangeKey = "6m" | "1y" | "all";

const MONTHS: Record<RangeKey, number | null> = { "6m": 6, "1y": 12, all: null };

function AddObservationDialog({
  open,
  onClose,
  profileId,
  initialTest,
}: {
  open: boolean;
  onClose: () => void;
  profileId: string;
  initialTest?: string;
}) {
  const router = useRouter();
  const t = useT();
  const { toast } = useToast();
  const [form, setForm] = useState({
    testName: initialTest ?? "",
    valueText: "",
    unit: "",
    refLow: "",
    refHigh: "",
    refText: "",
    collectedAt: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setError(null);
    if (!form.testName.trim() || !form.valueText.trim()) {
      setError("Test name and value are required.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/observations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profileId,
          testName: form.testName.trim(),
          valueText: form.valueText.trim(),
          unit: form.unit.trim() || null,
          refLow: form.refLow ? Number.parseFloat(form.refLow) : null,
          refHigh: form.refHigh ? Number.parseFloat(form.refHigh) : null,
          refText: form.refText.trim() || null,
          collectedAt: form.collectedAt || null,
          notes: form.notes.trim() || null,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("state.error.title"));
      toast({ title: "Measurement saved", variant: "success" });
      onClose();
      setForm((prev) => ({ ...prev, valueText: "", notes: "" }));
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("state.error.title"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("trends.addManual")}
      description="Entered manually by you and marked as confirmed. Never inferred."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={save} loading={saving}>
            {t("common.save")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <Alert tone="danger" title="Could not save">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Test / measurement"
            value={form.testName}
            onChange={(event) => setForm((prev) => ({ ...prev, testName: event.target.value }))}
            placeholder="e.g. Haemoglobin"
            required
          />
          <Input
            label={t("common.value")}
            value={form.valueText}
            onChange={(event) => setForm((prev) => ({ ...prev, valueText: event.target.value }))}
            placeholder="e.g. 13.2"
            required
          />
          <Input
            label={`${t("common.unit")} (${t("common.optional")})`}
            value={form.unit}
            onChange={(event) => setForm((prev) => ({ ...prev, unit: event.target.value }))}
            placeholder="g/dL"
          />
          <Input
            label={t("common.date")}
            type="date"
            value={form.collectedAt}
            onChange={(event) => setForm((prev) => ({ ...prev, collectedAt: event.target.value }))}
          />
          <Input
            label={`Low (${t("common.optional")})`}
            value={form.refLow}
            onChange={(event) => setForm((prev) => ({ ...prev, refLow: event.target.value }))}
            placeholder="13.0"
          />
          <Input
            label={`High (${t("common.optional")})`}
            value={form.refHigh}
            onChange={(event) => setForm((prev) => ({ ...prev, refHigh: event.target.value }))}
            placeholder="17.0"
          />
        </div>
        <Input
          label={`Reference range text (${t("common.optional")})`}
          value={form.refText}
          onChange={(event) => setForm((prev) => ({ ...prev, refText: event.target.value }))}
          placeholder="13.0 - 17.0 g/dL"
        />
        <Textarea
          label={`${t("common.notes")} (${t("common.optional")})`}
          value={form.notes}
          onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
          rows={2}
          maxLength={2000}
        />
        <p className="text-[11px] leading-relaxed text-faint">
          {t("common.notMedicalAdvice")}
        </p>
      </div>
    </Dialog>
  );
}

export function TrendExplorer({
  points,
  profileId,
  locale,
}: {
  points: TrendPoint[];
  profileId: string;
  locale: Locale;
}) {
  const t = useT();
  const router = useRouter();
  const { theme } = useTheme();
  const [selectedTest, setSelectedTest] = useState(points[0]?.testName ?? "");
  const [range, setRange] = useState<RangeKey>("1y");
  const [includeUnverified, setIncludeUnverified] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const testNames = useMemo(
    () => [...new Set(points.map((point) => point.testName))].sort((a, b) => a.localeCompare(b)),
    [points],
  );

  const testPoints = useMemo(
    () => points.filter((point) => point.testName === selectedTest),
    [points, selectedTest],
  );

  const { chartData, unit, excludedForUnit, excludedForDate, refRange } = useMemo(() => {
    const months = MONTHS[range];
    const cutoff = months ? new Date(Date.now() - months * 30 * 86_400_000).toISOString().slice(0, 10) : null;

    const filtered = testPoints.filter((point) => (includeUnverified ? true : point.verified));
    // Dominant unit among numeric points; never mix units silently.
    const unitCounts = new Map<string, number>();
    for (const point of filtered) {
      if (point.valueNumeric === null) continue;
      const key = point.unit ?? "";
      unitCounts.set(key, (unitCounts.get(key) ?? 0) + 1);
    }
    const dominantUnit = [...unitCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

    const byDate = [...filtered].sort((a, b) =>
      (a.collectedAt ?? "").localeCompare(b.collectedAt ?? ""),
    );

    let excludedUnit = 0;
    let excludedDate = 0;
    const data: Array<{ date: string; value: number; label: string; id: string; flag: string }> = [];
    for (const point of byDate) {
      if (point.valueNumeric === null) continue;
      if ((point.unit ?? "") !== dominantUnit) {
        excludedUnit += 1;
        continue;
      }
      if (cutoff && point.collectedAt && point.collectedAt < cutoff) {
        excludedDate += 1;
        continue;
      }
      if (!point.collectedAt) {
        excludedDate += 1;
        continue;
      }
      data.push({
        date: point.collectedAt,
        value: point.valueNumeric,
        label: formatDate(point.collectedAt, locale),
        id: point.id,
        flag: point.flag,
      });
    }

    const withRange = byDate.find((point) => point.refLow !== null || point.refHigh !== null);
    return {
      chartData: data,
      unit: dominantUnit,
      excludedForUnit: excludedUnit,
      excludedForDate: excludedDate,
      refRange: withRange ? { low: withRange.refLow, high: withRange.refHigh } : { low: null, high: null },
    };
  }, [testPoints, range, includeUnverified, locale]);

  const stroke = theme === "light" ? "#0e9bb4" : "#42e8f5";
  const grid = theme === "light" ? "rgba(12,35,64,0.10)" : "rgba(154,173,196,0.12)";
  const muted = theme === "light" ? "#4c617e" : "#9aadc4";
  const bandFill = theme === "light" ? "rgba(21,154,94,0.10)" : "rgba(61,220,151,0.10)";

  const latest = chartData[chartData.length - 1];
  const first = chartData[0];
  const change =
    latest && first && chartData.length > 1 ? latest.value - first.value : null;
  const changePct =
    change !== null && first && first.value !== 0 ? (change / first.value) * 100 : null;

  function removePoint(pointId: string) {
    if (!window.confirm("Delete this measurement? This cannot be undone.")) return;
    void fetch(`/api/observations/${pointId}`, { method: "DELETE" }).then((response) => {
      if (response.ok) router.refresh();
    });
  }

  if (points.length === 0) {
    return (
      <div>
        <EmptyState
          icon={<Activity className="size-5" aria-hidden />}
          title={t("trends.noData")}
          description={t("trends.noDataBody")}
          action={
            <Button onClick={() => setAddOpen(true)} icon={<Plus className="size-4" />}>
              {t("trends.addManual")}
            </Button>
          }
        />
        <AddObservationDialog open={addOpen} onClose={() => setAddOpen(false)} profileId={profileId} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <Select
          label={t("trends.selectTest")}
          value={selectedTest}
          onChange={(event) => setSelectedTest(event.target.value)}
          options={testNames.map((name) => ({ value: name, label: name }))}
          fieldClassName="min-w-56 flex-1 sm:flex-none"
        />
        <div className="flex rounded-lg border border-line bg-panel p-0.5" role="group" aria-label={t("common.filter")}>
          {(["6m", "1y", "all"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRange(option)}
              aria-pressed={range === option}
              className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                range === option ? "bg-panel-raised text-ink" : "text-faint hover:text-muted"
              }`}
            >
              {option === "all" ? t("common.all") : option}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pb-1.5">
          <Switch
            checked={includeUnverified}
            onChange={setIncludeUnverified}
            label="Include unconfirmed"
          />
        </div>
        <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)} icon={<Plus className="size-3.5" />}>
          {t("trends.addManual")}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="panel p-4">
          <p className="text-[10px] uppercase tracking-wider text-faint">Latest</p>
          <p className="mt-1 font-mono text-xl text-ink">
            {latest ? `${latest.value}` : "—"}
            {unit && <span className="ml-1 text-xs text-muted">{unit}</span>}
          </p>
          <p className="mt-0.5 text-[11px] text-faint">{latest?.label ?? "—"}</p>
        </div>
        <div className="panel p-4">
          <p className="text-[10px] uppercase tracking-wider text-faint">Change over window</p>
          <p className="mt-1 flex items-center gap-1.5 font-mono text-xl text-ink">
            {change !== null ? (
              <>
                <TrendingUp className="size-4 text-accent" aria-hidden />
                {change >= 0 ? "+" : ""}
                {change.toFixed(2)}
              </>
            ) : (
              "—"
            )}
          </p>
          <p className="mt-0.5 text-[11px] text-faint">
            {changePct !== null ? `${changePct.toFixed(1)}% vs earliest in window` : t("trends.noChange")}
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-[10px] uppercase tracking-wider text-faint">Points in chart</p>
          <p className="mt-1 font-mono text-xl text-ink">{chartData.length}</p>
          <p className="mt-0.5 text-[11px] text-faint">
            {excludedForUnit > 0
              ? `${excludedForUnit} excluded: different unit`
              : `${excludedForDate} outside window`}
          </p>
        </div>
      </div>

      {chartData.length === 0 ? (
        <Alert tone="warning" title="No comparable points">
          There are measurements for {selectedTest}, but none are confirmed with a date in this window
          — or all use a different unit.
        </Alert>
      ) : (
        <div className="panel p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-5 rounded bg-accent" aria-hidden /> {selectedTest}
                {unit ? ` (${unit})` : ""}
              </span>
              {(refRange.low !== null || refRange.high !== null) && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-4 rounded-sm border border-success/40 bg-success-dim" aria-hidden />
                  {t("trends.range")}
                </span>
              )}
            </div>
            <span className="text-[10px] text-faint">
              {formatDate(chartData[0]!.date, locale)} — {formatDate(chartData[chartData.length - 1]!.date, locale)}
            </span>
          </div>
          <div className="h-64 w-full" role="img" aria-label={`Trend for ${selectedTest}`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 12, right: 12, bottom: 4, left: -12 }}>
                <CartesianGrid stroke={grid} strokeDasharray="3 6" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: muted, fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: grid }}
                  minTickGap={28}
                />
                <YAxis
                  tick={{ fill: muted, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={46}
                  domain={["auto", "auto"]}
                />
                <ChartTooltip
                  cursor={{ stroke: grid }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const datum = payload[0]!.payload as { label: string; value: number; flag: string; id: string };
                    return (
                      <div className="rounded-lg border border-line-strong bg-panel-raised px-3 py-2 text-xs shadow-lg">
                        <p className="text-faint">{datum.label}</p>
                        <p className="mt-0.5 font-mono text-sm text-ink">
                          {datum.value}
                          {unit ? ` ${unit}` : ""}
                        </p>
                        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-faint">flag: {datum.flag}</p>
                      </div>
                    );
                  }}
                />
                {refRange.low !== null && refRange.high !== null && (
                  <ReferenceArea
                    y1={refRange.low}
                    y2={refRange.high}
                    fill={bandFill}
                    stroke="none"
                    ifOverflow="extendDomain"
                  />
                )}
                {refRange.high !== null && (
                  <ReferenceLine
                    y={refRange.high}
                    stroke={theme === "light" ? "#b26f09" : "#f5b94d"}
                    strokeDasharray="4 4"
                    strokeOpacity={0.55}
                  />
                )}
                {refRange.low !== null && (
                  <ReferenceLine
                    y={refRange.low}
                    stroke={theme === "light" ? "#3467e8" : "#5b8cff"}
                    strokeDasharray="4 4"
                    strokeOpacity={0.55}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={stroke}
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 0, fill: stroke }}
                  activeDot={{ r: 5 }}
                  animationDuration={600}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[10px] text-faint">{t("trends.onlyVerified")} {t("trends.unitMismatch")}</p>
        </div>
      )}

      <div className="panel overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-line bg-panel-raised/60 text-[10px] uppercase tracking-wider text-faint">
              <tr>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Value</th>
                <th className="px-4 py-2.5 font-medium">Range (stated)</th>
                <th className="px-4 py-2.5 font-medium">Flag</th>
                <th className="px-4 py-2.5 font-medium">{t("common.source")}</th>
                <th className="px-4 py-2.5 font-medium text-right">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {[...testPoints]
                .sort((a, b) => (b.collectedAt ?? "").localeCompare(a.collectedAt ?? ""))
                .map((point) => (
                  <tr key={point.id} className="bg-panel/20">
                    <td className="px-4 py-2.5 text-xs text-muted">
                      {point.collectedAt ? formatDate(point.collectedAt, locale) : "—"}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink">
                      {point.valueText}
                      {point.unit ? ` ${point.unit}` : ""}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-faint">{point.refText ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <FlagBadge flag={point.flag} t={t} compact />
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {point.documentId ? (
                        <Link
                          href={`/dashboard/documents/${point.documentId}`}
                          className="inline-flex items-center gap-1 text-accent hover:underline"
                        >
                          {t("trends.fromReport")} <ExternalLink className="size-3" aria-hidden />
                        </Link>
                      ) : (
                        <span className="text-faint">manual</span>
                      )}
                      {!point.verified && <Badge tone="warning" className="ml-2">unconfirmed</Badge>}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => removePoint(point.id)}
                        className="text-[11px] text-faint hover:text-danger"
                      >
                        {t("common.delete")}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <AddObservationDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        profileId={profileId}
        initialTest={selectedTest}
      />
    </div>
  );
}
