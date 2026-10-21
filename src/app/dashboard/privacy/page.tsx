import type { Metadata } from "next";
import Link from "next/link";
import { Download, EyeOff, FileKey, Lock, RefreshCcw, ShieldCheck, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { getDashboardContext } from "@/server/dashboard/context";
import { getStore } from "@/server/db";

export const metadata: Metadata = {
  title: "Privacy controls",
  robots: { index: false, follow: false },
};

export default async function PrivacyPage() {
  const { user, activeProfile, t, isDemo } = await getDashboardContext();
  const store = await getStore();

  const [documents, observations, medications, conversations, audit] = await Promise.all([
    store.listDocuments({ userId: user.id, limit: 1 }),
    store.listObservations({ userId: user.id, limit: 1 }),
    store.listMedications({ userId: user.id }),
    store.listConversations(user.id),
    store.listAudit(user.id, 1),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("privacy.title")} description={t("privacy.subtitle")} />

      {isDemo && (
        <Alert tone="warning" title="Demo mode">
          No durable database is configured, so this data lives in server memory and may reset.
          Export anything you need before the instance recycles.
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: t("dash.stat.documents"), value: documents.total, href: "/dashboard/documents" },
          { label: t("dash.stat.results"), value: observations.length, href: "/dashboard/health-trends" },
          { label: t("dash.stat.medications"), value: medications.length, href: "/dashboard/medications" },
          { label: t("assistant.conversations"), value: conversations.length, href: "/dashboard/assistant" },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href} className="panel p-4 transition-colors hover:border-line-strong">
            <p className="font-mono text-2xl text-ink">{stat.value}</p>
            <p className="mt-0.5 text-xs text-muted">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader icon={<FileKey className="size-4" aria-hidden />} title={t("privacy.stored")} />
          <ul className="space-y-2 text-[13px] text-muted">
            {[
              "Account identity: name, email, scrypt password hash, preferences",
              "Profiles with authorization records for family members",
              "Uploaded files, extracted text, and confirmed measurements",
              "Medications and interaction-review results",
              "Assistant conversations and their citations",
              "Audit events for security-relevant actions",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent/70" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader icon={<Lock className="size-4" aria-hidden />} title={t("privacy.sharing")} />
          <p className="text-[13px] leading-relaxed text-muted">{t("privacy.sharingBody")}</p>
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-line bg-panel/40 p-3 text-[11px] leading-relaxed text-faint">
            <EyeOff className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Dashboard routes are marked noindex, excluded from robots.txt, and never embedded in
            marketing pages.
          </div>
        </Card>

        <Card>
          <CardHeader icon={<RefreshCcw className="size-4" aria-hidden />} title={t("privacy.retention")} />
          <p className="text-[13px] leading-relaxed text-muted">{t("privacy.retentionBody")}</p>
        </Card>

        <Card>
          <CardHeader icon={<ShieldCheck className="size-4" aria-hidden />} title="Exercise your controls" />
          <div className="space-y-2">
            <a
              href="/api/settings/export"
              className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5 text-[13px] text-ink transition-colors hover:border-line-strong"
            >
              <span className="flex items-center gap-2">
                <Download className="size-3.5 text-accent" aria-hidden />
                {t("settings.exportData")}
              </span>
              <span className="text-[10px] text-faint">JSON</span>
            </a>
            <a
              href={`/api/fhir/export?profileId=${activeProfile.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5 text-[13px] text-ink transition-colors hover:border-line-strong"
            >
              <span className="flex items-center gap-2">
                <Download className="size-3.5 text-accent" aria-hidden />
                FHIR export · {activeProfile.name}
              </span>
              <span className="text-[10px] text-faint">application/fhir+json</span>
            </a>
            <Link
              href="/dashboard/settings"
              className="flex items-center justify-between gap-3 rounded-lg border border-danger/25 bg-danger-dim/30 px-3 py-2.5 text-[13px] text-ink transition-colors hover:border-danger/50"
            >
              <span className="flex items-center gap-2">
                <Trash2 className="size-3.5 text-danger" aria-hidden />
                {t("settings.deleteAccount")}
              </span>
              <span className="text-[10px] text-faint">Settings</span>
            </Link>
          </div>
          <p className="mt-3 text-[11px] text-faint">
            Last recorded audit event: {audit.length > 0 ? new Date(audit[0]!.createdAt).toLocaleString("en-IN") : "none"}
          </p>
        </Card>
      </div>

      <p className="rounded-xl border border-line bg-panel/40 px-4 py-3 text-[11px] leading-relaxed text-faint">
        This deployment makes no HIPAA, GDPR, ISO, or ABDM certification claims. See the{" "}
        <Link href="/security" className="text-accent hover:underline">
          security model
        </Link>{" "}
        for known limitations. {t("privacy.export")}
      </p>
    </div>
  );
}
