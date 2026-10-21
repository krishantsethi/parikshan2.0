"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the digest only — never the message (it may reference user data).
    console.error("[parikshan] Route error digest:", error.digest ?? "none");
  }, [error]);

  return (
    <div className="app-backdrop flex min-h-dvh flex-col items-center justify-center px-5 text-center">
      <div className="panel max-w-md p-8">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-warning/30 bg-warning-dim">
          <AlertTriangle className="size-5 text-warning" aria-hidden />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-ink">Something went wrong</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          This section could not be rendered. Your records were not changed. Try again, or return to
          the dashboard.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-[10px] text-faint">Reference: {error.digest}</p>
        )}
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={reset} icon={<RotateCcw className="size-4" />}>
            Try again
          </Button>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center rounded-[var(--radius-field)] border border-line px-4 text-sm text-ink hover:border-line-strong"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
