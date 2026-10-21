import type { Metadata } from "next";
import { Cpu, Database, Languages, Palette, ScanLine, Sparkles, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { AccountForm, DataControls } from "@/components/settings/account-settings";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { abdmStatus } from "@/server/interop/abdm";
import { capabilityReport } from "@/lib/env";
import { getDashboardContext } from "@/server/dashboard/context";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const { user, t } = await getDashboardContext();
  const capabilities = capabilityReport();
  const abdm = abdmStatus();

  return (
    <div className="space-y-6">
      <PageHeader title={t("settings.title")} description={t("settings.subtitle")} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            icon={<UserCog className="size-4" aria-hidden />}
            title={t("settings.profile")}
            description="Your name and sign-in email."
          />
          <AccountForm initialName={user.name} initialEmail={user.email} />
        </Card>

        <Card>
          <CardHeader icon={<Palette className="size-4" aria-hidden />} title={t("settings.appearance")} />
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-ink">{t("common.theme")}</p>
                <p className="text-xs text-muted">Persisted across sessions via a cookie.</p>
              </div>
              <ThemeToggle />
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
              <div>
                <p className="flex items-center gap-1.5 text-sm text-ink">
                  <Languages className="size-3.5 text-accent" aria-hidden />
                  {t("settings.languagePref")}
                </p>
                <p className="max-w-xs text-xs leading-relaxed text-muted">{t("settings.languageHint")}</p>
              </div>
              <LocaleSwitcher />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          icon={<Cpu className="size-4" aria-hidden />}
          title={t("settings.system")}
          description={t("settings.systemHint")}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { icon: Database, key: "database", value: capabilities.database },
            { icon: Sparkles, key: "ai", value: capabilities.ai },
            { icon: ScanLine, key: "ocr", value: capabilities.ocr },
            { icon: Cpu, key: "interactions", value: capabilities.openfda },
          ].map((row) => (
            <div key={row.key} className="rounded-xl border border-line bg-panel/40 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-xs font-medium text-ink">
                  <row.icon className="size-3.5 text-faint" aria-hidden />
                  {row.key}
                </span>
                <Badge tone={row.value.configured ? "success" : "warning"}>
                  {row.value.configured ? "Configured" : "Not configured"}
                </Badge>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{row.value.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl border border-line bg-panel/40 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-ink">ABHA / ABDM</span>
            <Badge tone="neutral">Not connected</Badge>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{abdm.label}</p>
          <p className="mt-1 font-mono text-[10px] text-faint">
            required: {abdm.requiredVariables.join(", ")}
          </p>
        </div>
        <p className="mt-3 text-[10px] text-faint">
          FHIR export is available per profile (export-only mapping; not a certified FHIR server).
        </p>
      </Card>

      <Card className="border-danger/25">
        <CardHeader title={t("settings.danger")} description="Irreversible operations." />
        <DataControls />
      </Card>
    </div>
  );
}
