"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Check, Pencil, Pill, Plus, ShieldPlus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { useT } from "@/components/providers/locale-provider";
import { useToast } from "@/components/providers/toast-provider";
import { formatDate } from "@/lib/format";
import type { Locale } from "@/types/domain";

export interface MedicationRow {
  id: string;
  name: string;
  dosageText: string | null;
  scheduleText: string | null;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  prescriber: string | null;
  notes: string | null;
}

interface FormState {
  name: string;
  dosageText: string;
  scheduleText: string;
  startDate: string;
  endDate: string;
  active: boolean;
  prescriber: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  dosageText: "",
  scheduleText: "",
  startDate: "",
  endDate: "",
  active: true,
  prescriber: "",
  notes: "",
};

export function MedicationManager({
  medications,
  profileId,
  locale,
}: {
  medications: MedicationRow[];
  profileId: string;
  locale: Locale;
}) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MedicationRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const active = medications.filter((medication) => medication.active);
  const inactive = medications.filter((medication) => !medication.active);

  function startAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setOpen(true);
  }

  function startEdit(medication: MedicationRow) {
    setEditing(medication);
    setForm({
      name: medication.name,
      dosageText: medication.dosageText ?? "",
      scheduleText: medication.scheduleText ?? "",
      startDate: medication.startDate ?? "",
      endDate: medication.endDate ?? "",
      active: medication.active,
      prescriber: medication.prescriber ?? "",
      notes: medication.notes ?? "",
    });
    setError(null);
    setOpen(true);
  }

  async function save() {
    setError(null);
    if (!form.name.trim()) {
      setError("Medication name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        profileId,
        name: form.name.trim(),
        dosageText: form.dosageText.trim() || null,
        scheduleText: form.scheduleText.trim() || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        active: form.active,
        prescriber: form.prescriber.trim() || null,
        notes: form.notes.trim() || null,
      };
      const response = await fetch(editing ? `/api/medications/${editing.id}` : "/api/medications", {
        method: editing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("state.error.title"));
      toast({ title: editing ? "Medication updated" : "Medication added", variant: "success" });
      setOpen(false);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("state.error.title"));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(medication: MedicationRow) {
    const response = await fetch(`/api/medications/${medication.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: !medication.active }),
    });
    if (response.ok) {
      router.refresh();
    } else {
      toast({ title: "Could not update the medication", variant: "error" });
    }
  }

  async function remove(medication: MedicationRow) {
    if (!window.confirm(`Delete ${medication.name} from this profile?`)) return;
    const response = await fetch(`/api/medications/${medication.id}`, { method: "DELETE" });
    if (response.ok) {
      toast({ title: "Medication removed", variant: "success" });
      router.refresh();
    } else {
      toast({ title: "Could not remove the medication", variant: "error" });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted">
          <Pill className="size-3.5 text-accent" aria-hidden />
          {active.length} active · {inactive.length} completed
        </div>
        <div className="flex gap-2">
          <ButtonLink
            href="/dashboard/interactions"
            variant="secondary"
            size="sm"
            icon={<ShieldPlus className="size-3.5" />}
          >
            {t("interactions.run")}
          </ButtonLink>
          <Button size="sm" onClick={startAdd} icon={<Plus className="size-3.5" />}>
            {t("meds.add")}
          </Button>
        </div>
      </div>

      {medications.length === 0 ? (
        <EmptyState
          icon={<Pill className="size-5" aria-hidden />}
          title={t("meds.empty")}
          description={t("meds.emptyBody")}
          action={<Button onClick={startAdd} icon={<Plus className="size-4" />}>{t("meds.add")}</Button>}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {[...active, ...inactive].map((medication) => (
            <div
              key={medication.id}
              className={`panel p-4 ${medication.active ? "" : "opacity-70"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-ink">{medication.name}</h3>
                    {medication.dosageText && <Badge tone="accent">{medication.dosageText}</Badge>}
                    {!medication.active && <Badge tone="neutral">{t("meds.completed")}</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {medication.scheduleText ?? "Schedule not recorded"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(medication)}
                    className="rounded-md p-1.5 text-faint hover:bg-panel hover:text-ink"
                    aria-label={`Edit ${medication.name}`}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(medication)}
                    className="rounded-md p-1.5 text-faint hover:bg-danger-dim hover:text-danger"
                    aria-label={`Delete ${medication.name}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3 text-[11px]">
                <div>
                  <dt className="text-faint">Started</dt>
                  <dd className="text-muted">
                    {medication.startDate ? formatDate(medication.startDate, locale) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-faint">Prescriber</dt>
                  <dd className="truncate text-muted">{medication.prescriber ?? "—"}</dd>
                </div>
              </dl>
              {medication.notes && <p className="mt-2 text-[11px] text-faint">{medication.notes}</p>}
              <button
                type="button"
                onClick={() => toggleActive(medication)}
                className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-accent hover:underline"
              >
                <Check className="size-3" aria-hidden />
                {medication.active ? "Mark as completed" : "Mark as active"}
              </button>
            </div>
          ))}
        </div>
      )}

      <Alert tone="warning" title="Medication safety">
        {t("meds.neverChangeAdvice")} {t("meds.reminderNote")}
      </Alert>
      <p className="flex items-start gap-2 text-[11px] leading-relaxed text-faint">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Records are exactly as you enter or confirm them. PARIKSHAN does not verify prescriptions or
        infer doses.
      </p>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? t("meds.add") : t("meds.add")}
        description="Record the medication exactly as prescribed — including the original dosage text."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
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
          <Input
            label={t("meds.name")}
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="e.g. Metformin"
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t("meds.dosage")}
              value={form.dosageText}
              onChange={(event) => setForm((prev) => ({ ...prev, dosageText: event.target.value }))}
              placeholder="500 mg"
            />
            <Input
              label={t("meds.schedule")}
              value={form.scheduleText}
              onChange={(event) => setForm((prev) => ({ ...prev, scheduleText: event.target.value }))}
              placeholder="1-0-1 after meals"
            />
            <Input
              label={t("meds.startDate")}
              type="date"
              value={form.startDate}
              onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
            />
            <Input
              label={t("meds.endDate")}
              type="date"
              value={form.endDate}
              onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
            />
          </div>
          <Input
            label={t("meds.prescriber")}
            value={form.prescriber}
            onChange={(event) => setForm((prev) => ({ ...prev, prescriber: event.target.value }))}
          />
          <Select
            label={t("common.status")}
            value={form.active ? "active" : "completed"}
            onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.value === "active" }))}
            options={[
              { value: "active", label: t("meds.active") },
              { value: "completed", label: t("meds.completed") },
            ]}
          />
          <Textarea
            label={`${t("common.notes")} (${t("common.optional")})`}
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            rows={2}
            maxLength={2000}
          />
        </div>
      </Dialog>

      <p className="text-center text-[11px] text-faint">
        Extract medications automatically?{" "}
        <Link href="/dashboard/documents/upload" className="text-accent hover:underline">
          Upload a prescription
        </Link>
      </p>
    </div>
  );
}
