"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/providers/locale-provider";
import { useToast } from "@/components/providers/toast-provider";
import {
  ensureStorageAccess,
  hasStorageAccess,
  supportsStorageAccess,
} from "@/lib/storage-access";

type State = "unknown" | "ok" | "blocked";

/**
 * Explains — instead of silently failing — when the app is framed cross-origin
 * and the browser is withholding third-party cookie access. Offers a gesture-
 * driven grant button (Storage Access API) and a first-party escape hatch.
 *
 * Renders nothing when access is fine, so normally-served deployments and
 * top-level tabs are completely unaffected.
 */
export function StorageAccessNotice() {
  const t = useT();
  const { toast } = useToast();
  const [state, setState] = useState<State>("unknown");
  const [requesting, setRequesting] = useState(false);
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    setHref(window.location.href);
    let cancelled = false;
    void hasStorageAccess().then((ok) => {
      if (!cancelled) setState(ok ? "ok" : "blocked");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async () => {
    setRequesting(true);
    try {
      const ok = await ensureStorageAccess();
      setState(ok ? "ok" : "blocked");
      if (ok) toast({ title: t("auth.storage.enable"), variant: "success" });
    } finally {
      setRequesting(false);
    }
  }, [t, toast]);

  if (state !== "blocked") return null;

  return (
    <Alert tone="warning" className="mt-5" title={t("auth.storage.title")}>
      <p className="text-sm">{t("auth.storage.body")}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {supportsStorageAccess() && (
          <Button size="sm" onClick={() => void enable()} disabled={requesting} loading={requesting}>
            {t("auth.storage.enable")}
          </Button>
        )}
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-line-strong px-3 text-xs text-ink transition-colors hover:bg-panel-raised"
          >
            <ExternalLink className="size-3.5" aria-hidden />
            {t("auth.storage.openTab")}
          </a>
        )}
      </div>
    </Alert>
  );
}
