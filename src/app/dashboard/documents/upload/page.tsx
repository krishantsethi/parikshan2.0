import type { Metadata } from "next";
import { ScanLine, ShieldCheck, Sparkles } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/misc";
import { DocumentUploader } from "@/components/documents/uploader";
import { getConfig } from "@/lib/env";
import { getDashboardContext } from "@/server/dashboard/context";

export const metadata: Metadata = {
  title: "Upload documents",
  robots: { index: false, follow: false },
};

export default async function UploadPage() {
  const { activeProfile, t, aiConfigured } = await getDashboardContext();
  const cfg = getConfig();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={activeProfile.name}
        title={t("docs.upload.title")}
        description={t("docs.upload.subtitle")}
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="panel p-5">
          <DocumentUploader profileId={activeProfile.id} maxBytes={cfg.uploadMaxBytes} />
        </div>

        <div className="space-y-3">
          <div className="panel p-4">
            <div className="flex items-center gap-2">
              <ScanLine className="size-4 text-accent" aria-hidden />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Pipeline</h2>
            </div>
            <ol className="mt-3 space-y-2 text-[12px] text-muted">
              {[
                "Upload validated by magic bytes",
                "PDF text layer or local OCR",
                "Line-level structured extraction",
                "You review and confirm every value",
              ].map((step, index) => (
                <li key={step} className="flex gap-2.5">
                  <span className="font-mono text-[10px] text-accent/70">0{index + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="panel p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-accent" aria-hidden />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Privacy</h2>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-muted">
              Files are stored privately and served only through authenticated, ownership-checked
              requests. OCR runs locally in this deployment.
            </p>
          </div>

          <div className="panel p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-accent" aria-hidden />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">AI explanations</h2>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-muted">
              {aiConfigured
                ? "An AI provider is configured — you can generate a plain-language explanation from the document page."
                : "No AI provider is configured, so a deterministic structured digest is generated instead. AI explanations are never simulated."}
            </p>
          </div>
        </div>
      </div>

      <Alert tone="info" title="Best results with digital PDFs">
        Text-based PDFs (downloaded from a lab portal) extract perfectly. For scans, upload sharp,
        straight-on page images — OCR confidence is shown on the document page.
      </Alert>
    </div>
  );
}
