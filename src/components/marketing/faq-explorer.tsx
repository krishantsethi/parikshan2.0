"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { FaqEntry } from "@/content/faq";

export function FaqExplorer({ entries, categories }: { entries: FaqEntry[]; categories: readonly string[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (category !== "all" && entry.category !== category) return false;
      if (!q) return true;
      return (
        entry.question.toLowerCase().includes(q) ||
        entry.answer.toLowerCase().includes(q) ||
        entry.category.toLowerCase().includes(q) ||
        (entry.keywords ?? []).some((keyword) => keyword.toLowerCase().includes(q))
      );
    });
  }, [entries, query, category]);

  const items = filtered.map((entry) => ({
    id: entry.id,
    question: entry.question,
    answer: (
      <div className="space-y-2">
        <p>{entry.answer}</p>
        <p className="text-[11px] uppercase tracking-wider text-faint">{entry.category}</p>
      </div>
    ),
  }));

  return (
    <div>
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-[1.15rem] size-4 -translate-y-1/2 text-faint" aria-hidden />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search questions — try “OCR”, “range”, or “delete”"
            aria-label="Search frequently asked questions"
            className="pl-10 pr-10"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-faint hover:text-ink"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {["all", ...categories].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              aria-pressed={category === cat}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                category === cat
                  ? "border-accent/40 bg-accent-dim text-accent"
                  : "border-line text-muted hover:border-line-strong hover:text-ink",
              )}
            >
              {cat === "all" ? "All questions" : cat}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {items.length > 0 ? (
          <Accordion items={items} />
        ) : (
          <EmptyState
            title="No matching questions"
            description="Try a different search term, or switch back to all categories."
            action={
              <button
                type="button"
                className="text-sm text-accent hover:underline"
                onClick={() => {
                  setQuery("");
                  setCategory("all");
                }}
              >
                Reset filters
              </button>
            }
          />
        )}
      </div>
      <p className="mt-4 text-xs text-faint">
        {filtered.length} of {entries.length} questions shown
      </p>
    </div>
  );
}
