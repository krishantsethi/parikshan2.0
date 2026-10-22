"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Baby,
  Check,
  Heart,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { useT } from "@/components/providers/locale-provider";
import { useToast } from "@/components/providers/toast-provider";
import { PREFERENCE_MAX_AGE_SECONDS, PROFILE_COOKIE, writeClientCookie } from "@/lib/cookies";
import { formatDate } from "@/lib/format";
import type { HealthProfile, Locale, ProfileRelation } from "@/types/domain";

export interface ProfileCardData {
  profile: HealthProfile;
  documentCount: number;
  medicationCount: number;
  observationCount: number;
}

const RELATION_ICONS: Record<ProfileRelation, typeof UserRound> = {
  self: UserRound,
  spouse: Heart,
  child: Baby,
  parent: Users,
  sibling: Users,
  grandparent: Users,
  other: Users,
};

const RELATIONS: ProfileRelation[] = ["self", "spouse", "child", "parent", "sibling", "grandparent", "other"];

interface FormState {
  name: string;
  relation: ProfileRelation;
  dob: string;
  sex: "" | "male" | "female" | "other";
  bloodGroup: string;
  notes: string;
  authorization: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  relation: "child",
  dob: "",
  sex: "",
  bloodGroup: "",
  notes: "",
  authorization: false,
};

export function ProfileManager({
  profiles,
  activeProfileId,
  locale,
}: {
  profiles: ProfileCardData[];
  activeProfileId: string;
  locale: Locale;
}) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HealthProfile | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<HealthProfile | null>(null);

  function startAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setFieldError(null);
    setOpen(true);
  }

  function startEdit(profile: HealthProfile) {
    setEditing(profile);
    setForm({
      name: profile.name,
      relation: profile.relation,
      dob: profile.dob ?? "",
      sex: (profile.sex ?? "") as FormState["sex"],
      bloodGroup: profile.bloodGroup ?? "",
      notes: profile.notes ?? "",
      authorization: Boolean(profile.authorizationAffirmedAt),
    });
    setError(null);
    setFieldError(null);
    setOpen(true);
  }

  async function save() {
    setError(null);
    setFieldError(null);
    if (!form.name.trim()) {
      setError("A profile name is required.");
      return;
    }
    if (!editing && form.relation !== "self" && !form.authorization) {
      setFieldError(t("family.authorizationNote"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        relation: form.relation,
        dob: form.dob || null,
        sex: form.sex || null,
        bloodGroup: form.bloodGroup || null,
        notes: form.notes.trim() || null,
        authorizationAffirmed: form.authorization,
      };
      const response = await fetch(editing ? `/api/profiles/${editing.id}` : "/api/profiles", {
        method: editing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("state.error.title"));
      toast({ title: editing ? t("family.edit") : t("family.add"), variant: "success" });
      setOpen(false);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("state.error.title"));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/profiles/${deleting.id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("state.error.title"));
      toast({ title: t("common.deleted"), variant: "success" });
      setDeleting(null);
      if (deleting.id === activeProfileId) {
        writeClientCookie(PROFILE_COOKIE, "", 0);
      }
      router.refresh();
    } catch (removeError) {
      toast({
        title: removeError instanceof Error ? removeError.message : t("state.error.title"),
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  function switchTo(profileId: string) {
    writeClientCookie(PROFILE_COOKIE, profileId, PREFERENCE_MAX_AGE_SECONDS);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">{t("family.isolated")}</p>
        <Button size="sm" onClick={startAdd} icon={<Plus className="size-3.5" />}>
          {t("family.add")}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {profiles.map(({ profile, documentCount, medicationCount, observationCount }) => {
          const Icon = RELATION_ICONS[profile.relation];
          const isActive = profile.id === activeProfileId;
          return (
            <div
              key={profile.id}
              className={`panel p-4 ${isActive ? "border-accent/35" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full border border-accent/25 bg-gradient-to-br from-azure-dim to-accent-dim">
                    <Icon className="size-4.5 text-accent" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-ink">{profile.name}</h3>
                      {profile.isPrimary && <Badge tone="accent">Primary</Badge>}
                      {isActive && <Badge tone="success">Viewing</Badge>}
                    </div>
                    <p className="mt-0.5 text-[11px] text-faint">
                      {t(`family.relation.${profile.relation}` as "family.relation.self")}
                      {profile.dob ? ` · ${formatDate(profile.dob, locale)}` : ""}
                      {profile.bloodGroup ? ` · ${profile.bloodGroup}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(profile)}
                    className="rounded-md p-1.5 text-faint hover:bg-panel hover:text-ink"
                    aria-label={`Edit ${profile.name}`}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(profile)}
                    className="rounded-md p-1.5 text-faint hover:bg-danger-dim hover:text-danger"
                    aria-label={`Delete ${profile.name}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border border-line/70 bg-panel/40 p-2.5 text-center">
                <div>
                  <p className="font-mono text-sm text-ink">{documentCount}</p>
                  <p className="text-[10px] text-faint">{t("family.docsCount")}</p>
                </div>
                <div>
                  <p className="font-mono text-sm text-ink">{observationCount}</p>
                  <p className="text-[10px] text-faint">{t("dash.stat.results")}</p>
                </div>
                <div>
                  <p className="font-mono text-sm text-ink">{medicationCount}</p>
                  <p className="text-[10px] text-faint">{t("family.medsCount")}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <a
                  href={`/dashboard/family/${profile.id}`}
                  className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
                >
                  View profile <ArrowRight className="size-3" aria-hidden />
                </a>
                {!isActive && (
                  <button
                    type="button"
                    onClick={() => switchTo(profile.id)}
                    className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-ink"
                  >
                    <Check className="size-3" aria-hidden /> Set as active
                  </button>
                )}
              </div>

              {profile.relation !== "self" && (
                <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-faint">
                  <span aria-hidden>⚖</span>
                  {profile.authorizationAffirmedAt
                    ? `Authorization affirmed ${formatDate(profile.authorizationAffirmedAt, locale)}`
                    : "Authorization not affirmed — review required"}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <Alert tone="warning" title={t("family.authorizationNote")}>
        Accessing another adult's medical information requires their permission. Family profiles are
        isolated at the data layer: each profile's documents, measurements, medications, and assistant
        context are separate.
      </Alert>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? t("family.edit") : t("family.add")}
        description="Each profile is a separate health space, owned by your account."
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t("common.name")}
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              maxLength={120}
              required
            />
            <Select
              label={t("family.relation")}
              value={form.relation}
              onChange={(event) => setForm((prev) => ({ ...prev, relation: event.target.value as ProfileRelation }))}
              options={RELATIONS.map((relation) => ({
                value: relation,
                label: t(`family.relation.${relation}` as "family.relation.self"),
              }))}
            />
            <Input
              label={t("family.dob")}
              type="date"
              value={form.dob}
              onChange={(event) => setForm((prev) => ({ ...prev, dob: event.target.value }))}
              max={new Date().toISOString().slice(0, 10)}
            />
            <Select
              label={t("family.sex")}
              value={form.sex}
              onChange={(event) => setForm((prev) => ({ ...prev, sex: event.target.value as FormState["sex"] }))}
              placeholder="Prefer not to say"
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "other", label: "Other" },
              ]}
            />
            <Select
              label={t("family.bloodGroup")}
              value={form.bloodGroup}
              onChange={(event) => setForm((prev) => ({ ...prev, bloodGroup: event.target.value }))}
              placeholder="Unknown"
              options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((value) => ({ value, label: value }))}
            />
          </div>
          <Textarea
            label={`${t("common.notes")} (${t("common.optional")})`}
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            rows={2}
            maxLength={2000}
          />
          {form.relation !== "self" && (
            <Checkbox
              label={t("family.authorization")}
              description={t("family.authorizationNote")}
              checked={form.authorization}
              onChange={(event) => setForm((prev) => ({ ...prev, authorization: event.target.checked }))}
              error={fieldError}
            />
          )}
        </div>
      </Dialog>

      <Dialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={t("family.delete.title")}
        description={t("family.delete.body")}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" onClick={remove} loading={saving} icon={<Trash2 className="size-4" />}>
              {t("common.delete")}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">
          You are about to delete <span className="text-ink">{deleting?.name}</span> and every record
          belonging to this profile.
        </p>
      </Dialog>
    </div>
  );
}
