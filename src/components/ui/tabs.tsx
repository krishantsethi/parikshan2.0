"use client";

import { useId, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
}

/** Accessible tab set with a sliding indicator (ARIA tablist/tab/tabpanel). */
export function Tabs({
  items,
  defaultTab,
  className,
  panelClassName,
}: {
  items: TabItem[];
  defaultTab?: string;
  className?: string;
  panelClassName?: string;
}) {
  const [active, setActive] = useState(defaultTab ?? items[0]?.id ?? "");
  const baseId = useId();
  const activeItem = items.find((item) => item.id === active) ?? items[0];

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label="Sections"
        className="relative flex gap-1 overflow-x-auto rounded-xl border border-line bg-panel/60 p-1"
      >
        {items.map((item) => {
          const selected = item.id === activeItem?.id;
          return (
            <button
              key={item.id}
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(item.id)}
              onKeyDown={(event) => {
                const index = items.findIndex((i) => i.id === activeItem?.id);
                if (event.key === "ArrowRight") {
                  event.preventDefault();
                  setActive(items[(index + 1) % items.length]!.id);
                } else if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  setActive(items[(index - 1 + items.length) % items.length]!.id);
                }
              }}
              className={cn(
                "relative flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                selected ? "text-ink" : "text-muted hover:text-ink",
              )}
            >
              {selected && (
                <motion.span
                  layoutId={`${baseId}-indicator`}
                  className="absolute inset-0 rounded-lg border border-line-strong bg-panel-raised"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative flex items-center gap-2">
                {item.icon}
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      {activeItem && (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${activeItem.id}`}
          aria-labelledby={`${baseId}-tab-${activeItem.id}`}
          className={cn("mt-5", panelClassName)}
        >
          {activeItem.content}
        </div>
      )}
    </div>
  );
}
