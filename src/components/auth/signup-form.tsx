"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox, Input } from "@/components/ui/field";
import { useT } from "@/components/providers/locale-provider";
import { useToast } from "@/components/providers/toast-provider";

export function SignupForm() {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (name.trim().length < 1) errors.name = t("auth.validation.nameRequired");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = t("auth.validation.emailInvalid");
    if (password.length < 8) errors.password = t("auth.validation.passwordShort");
    if (password !== confirm) errors.confirm = t("auth.validation.passwordMismatch");
    if (!acknowledged) errors.acknowledge = t("auth.validation.termsRequired");
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          acknowledgeDisclaimer: true,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(
          response.status === 409 ? t("auth.error.emailTaken") : (data.error ?? t("auth.error.generic")),
        );
      }
      toast({ title: t("auth.success.signup"), variant: "success" });
      router.push("/onboarding");
      router.refresh();
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : t("auth.error.generic"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("auth.signup.title")}</h1>
      <p className="mt-1.5 text-sm text-muted">{t("auth.signup.subtitle")}</p>

      {error && (
        <Alert tone="danger" className="mt-5" title="Could not create the account">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <Input
          label={t("auth.name.label")}
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={fieldErrors.name}
          maxLength={100}
          required
        />
        <Input
          label={t("auth.email.label")}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
          placeholder="you@example.com"
          required
        />
        <Input
          label={t("auth.password.label")}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
          hint="At least 8 characters"
          required
        />
        <Input
          label={t("auth.password.confirm")}
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          error={fieldErrors.confirm}
          required
        />
        <Checkbox
          label={t("auth.signupConsent")}
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
          error={fieldErrors.acknowledge}
        />
        <Button type="submit" fullWidth loading={submitting} iconRight={<ArrowRight className="size-4" />}>
          {t("auth.signup.title")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          {t("nav.login")}
        </Link>
      </p>
    </div>
  );
}
