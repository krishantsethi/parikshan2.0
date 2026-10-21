"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, MailCheck } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useT } from "@/components/providers/locale-provider";

export function ForgotPasswordForm() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { error?: string; devResetUrl?: string };
      if (!response.ok) throw new Error(data.error ?? t("state.error.title"));
      setSubmitted(true);
      setDevUrl(data.devResetUrl ?? null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("state.error.title"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("auth.forgot.title")}</h1>
      <p className="mt-1.5 text-sm text-muted">{t("auth.forgot.subtitle")}</p>

      {submitted ? (
        <div className="mt-6 space-y-4">
          <Alert tone="info" title="Request received">
            {t("auth.reset.requested")}
          </Alert>
          <p className="text-xs leading-relaxed text-muted">{t("auth.reset.noEmail")}</p>
          {devUrl && (
            <div className="rounded-xl border border-accent/25 bg-accent-dim p-3">
              <p className="text-[11px] uppercase tracking-wider text-accent">Development only</p>
              <Link href={devUrl} className="mt-1 block break-all font-mono text-[11px] text-ink hover:underline">
                {devUrl}
              </Link>
            </div>
          )}
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
            {t("nav.login")} <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          {error && (
            <Alert tone="danger" title="Request failed">
              {error}
            </Alert>
          )}
          <Input
            label={t("auth.email.label")}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Button type="submit" fullWidth loading={loading} icon={<MailCheck className="size-4" />}>
            {t("auth.forgot.title")}
          </Button>
          <Link href="/login" className="block text-center text-xs text-accent hover:underline">
            {t("nav.login")}
          </Link>
        </form>
      )}
    </div>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useT();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(t("auth.validation.passwordShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.validation.passwordMismatch"));
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("state.error.title"));
      setSuccess(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : t("state.error.title"));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("auth.reset.title")}</h1>
        <Alert tone="warning" className="mt-5" title="Missing reset token">
          This page needs a valid reset link. Request a new one from the{" "}
          <Link href="/forgot-password" className="text-accent underline">
            forgot password
          </Link>{" "}
          page.
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("auth.reset.title")}</h1>
      <p className="mt-1.5 text-sm text-muted">
        Choose a strong password. All existing sessions will be signed out.
      </p>

      {success ? (
        <Alert tone="success" className="mt-6" title="Password updated">
          Redirecting you to sign in…
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          {error && (
            <Alert tone="danger" title="Reset failed">
              {error}
            </Alert>
          )}
          <Input
            label={t("auth.newPassword.label")}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            hint="At least 8 characters"
            required
          />
          <Input
            label={t("auth.password.confirm")}
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
          />
          <Button type="submit" fullWidth loading={loading}>
            {t("auth.reset.title")}
          </Button>
        </form>
      )}
    </div>
  );
}
