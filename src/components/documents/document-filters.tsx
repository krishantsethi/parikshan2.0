"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/field";
import { useT } from "@/components/providers/locale-provider";

const CATEGORIES = [
  "lab_report",
  "prescription",
  "discharge_summary",
  "imaging_report",
  "vaccination",
  "invoice",
  "insurance",
  "other",
] as const;

const STATUSES = ["processing", "ready", "needs_review", "failed"] as const;

/** URL-driven filters keep the document list server-rendered and shareable. */
export function DocumentFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const t = useT();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setSearch(params.get("q") ?? "");
  }, [params]);

  function apply(next: Record<string, string>) {
    const searchParams = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) searchParams.set(key, value);
      else searchParams.delete(key);
    }
    startTransition(() => {
      router.push(`/dashboard/documents?${searchParams.toString()}`);
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <form
        className="relative flex-1"
        onSubmit={(event) => {
          event.preventDefault();
          apply({ q: search.trim() });
        }}
      >
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("docs.search.placeholder")}
          aria-label={t("docs.search.placeholder")}
          className="pl-10"
        />
        {pending && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-accent" aria-hidden />}
      </form>
      <div className="flex gap-2">
        <select
          aria-label="Filter by category"
          value={params.get("category") ?? ""}
          onChange={(event) => apply({ category: event.target.value })}
          className="h-10 rounded-[var(--radius-field)] border border-line bg-panel/70 px-3 text-xs text-ink focus:border-accent focus:outline-none"
        >
          <option value="">{t("common.all")} · {t("common.category")}</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {t(`docs.category.${category}` as "docs.category.other")}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by status"
          value={params.get("status") ?? ""}
          onChange={(event) => apply({ status: event.target.value })}
          className="h-10 rounded-[var(--radius-field)] border border-line bg-panel/70 px-3 text-xs text-ink focus:border-accent focus:outline-none"
        >
          <option value="">{t("common.all")} · {t("common.status")}</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(`docs.status.${status}` as "docs.status.ready")}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
