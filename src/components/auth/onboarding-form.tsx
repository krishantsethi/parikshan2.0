"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck, UploadCloud } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select } from "@/components/ui/field";
import { useT } from "@/components/providers/locale-provider";
import { useToast } from "@/components/providers/toast-provider";
import type { HealthProfile } from "@/types/domain";

export function OnboardingForm({ profile, displayName }: { profile: HealthProfile; displayName: string }) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(profile.name || displayName);
  const [dob, setDob] = useState(profile.dob ?? "");
  const [sex, setSex] = useState(profile.sex ?? "");
  const [bloodGroup, setBloodGroup] = useState(profile.bloodGroup ?? "");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!acknowledged) {
      setError(t("auth.validation.termsRequired"));
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/profiles/${profile.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          dob: dob || null,
          sex: sex || null,
          bloodGroup: bloodGroup || null,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("state.error.title"));
      toast({ title: t("settings.saved"), variant: "success" });
      router.push("/dashboard");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("state.error.title"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && (
        <Alert tone="danger" title="Could not save">
          {error}
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={t("common.name")}
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={120}
          required
        />
        <Input
          label={`${t("family.dob")} (${t("common.optional")})`}
          type="date"
          value={dob}
          onChange={(event) => setDob(event.target.value)}
          max={new Date().toISOString().slice(0, 10)}
        />
        <Select
          label={`${t("family.sex")} (${t("common.optional")})`}
          value={sex}
          onChange={(event) => setSex(event.target.value)}
          placeholder="Prefer not to say"
          options={[
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
            { value: "other", label: "Other" },
          ]}
        />
        <Select
          label={`${t("family.bloodGroup")} (${t("common.optional")})`}
          value={bloodGroup}
          onChange={(event) => setBloodGroup(event.target.value)}
          placeholder="Unknown"
          options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((group) => ({
            value: group,
            label: group,
          }))}
        />
      </div>

      <div className="rounded-xl border border-line bg-panel/50 p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-accent" aria-hidden />
          <p className="text-sm font-medium text-ink">Privacy basics</p>
        </div>
        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted">
          <li>Only the AI excerpts needed to answer a question are sent to a configured provider.</li>
          <li>Your documents are never public and never used to train models.</li>
          <li>You can export or delete everything at any time from Settings.</li>
        </ul>
      </div>

      <Checkbox
        label={t("auth.signupConsent")}
        checked={acknowledged}
        onChange={(event) => setAcknowledged(event.target.checked)}
      />

      <Button type="submit" fullWidth loading={loading} iconRight={<ArrowRight className="size-4" />}>
        {t("onboarding.finish")}
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-[11px] text-faint">
        <UploadCloud className="size-3.5" aria-hidden />
        You can upload your first report from the dashboard.
      </p>
    </form>
  );
}
