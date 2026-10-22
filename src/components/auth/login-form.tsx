"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Play } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useT } from "@/components/providers/locale-provider";
import { useToast } from "@/components/providers/toast-provider";
import { StorageAccessNotice } from "@/components/auth/storage-access-notice";
import { ensureStorageAccess } from "@/lib/storage-access";

export function LoginForm() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const autoDemoTried = useRef(false);

  async function enterDemo() {
    setError(null);
    setDemoLoading(true);
    try {
      // Inside a cross-origin preview frame the browser may withhold cookie
      // access entirely. Requesting it here is a genuine user gesture, which
      // is exactly what the Storage Access API requires.
      if (!(await ensureStorageAccess())) {
        throw new Error(t("auth.error.storageAccess"));
      }
      const response = await fetch("/api/auth/demo", { method: "POST" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("auth.error.generic"));
      toast({ title: "Demo workspace ready", variant: "success" });
      router.push("/dashboard");
      router.refresh();
    } catch (demoError) {
      const message = demoError instanceof Error ? demoError.message : t("auth.error.generic");
      setError(message);
      toast({ title: message, variant: "error" });
    } finally {
      setDemoLoading(false);
    }
  }

  useEffect(() => {
    if (params.get("demo") === "1" && !autoDemoTried.current) {
      autoDemoTried.current = true;
      void enterDemo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (!(await ensureStorageAccess())) {
        throw new Error(t("auth.error.storageAccess"));
      }
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(
          response.status === 401 ? t("auth.error.invalidCredentials") : (data.error ?? t("auth.error.generic")),
        );
      }
      router.push("/dashboard");
      router.refresh();
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : t("auth.error.generic");
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("auth.login.title")}</h1>
      <p className="mt-1.5 text-sm text-muted">{t("auth.login.subtitle")}</p>

      {error && (
        <Alert tone="danger" className="mt-5" title="Could not sign in">
          {error}
        </Alert>
      )}

      <StorageAccessNotice />

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <Input
          label={t("auth.email.label")}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
        />
        <Input
          label={t("auth.password.label")}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs text-accent hover:underline">
            {t("auth.forgotLink")}
          </Link>
        </div>
        <Button type="submit" fullWidth loading={submitting} iconRight={<ArrowRight className="size-4" />}>
          {t("nav.login")}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-faint">
        <span className="h-px flex-1 bg-line" />
        {t("common.or")}
        <span className="h-px flex-1 bg-line" />
      </div>

      <Button
        variant="secondary"
        fullWidth
        loading={demoLoading}
        onClick={enterDemo}
        icon={<Play className="size-4" />}
      >
        {t("auth.demoButton")}
      </Button>
      <p className="mt-2 text-[11px] leading-relaxed text-faint">{t("auth.demoHint")}</p>

      <p className="mt-6 text-center text-sm text-muted">
        {t("auth.noAccount")}{" "}
        <Link href="/signup" className="font-medium text-accent hover:underline">
          {t("nav.signup")}
        </Link>
      </p>

      <div className="mt-6 rounded-lg border border-line/70 bg-panel/40 px-3 py-2 text-[11px] text-faint">
        Demo account: <span className="font-mono text-muted">demo@parikshan.health</span> /{" "}
        <span className="font-mono text-muted">Demo@1234</span>
      </div>
    </div>
  );
}
