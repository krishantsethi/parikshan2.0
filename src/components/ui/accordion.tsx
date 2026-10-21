"use client";

import { useId, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AccordionItemData {
  id: string;
  question: string;
  answer: ReactNode;
  category?: string;
}

export function Accordion({ items, className }: { items: AccordionItemData[]; className?: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const baseId = useId();

  return (
    <div className={cn("divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line", className)}>
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <div key={item.id} className="bg-panel/40">
            <h3>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : item.id)}
                aria-expanded={open}
                aria-controls={`${baseId}-${item.id}`}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-panel/70"
              >
                <span className="text-sm font-medium text-ink">{item.question}</span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-faint transition-transform duration-300",
                    open && "rotate-180 text-accent",
                  )}
                  aria-hidden
                />
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  key="content"
                  id={`${baseId}-${item.id}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 text-sm leading-relaxed text-muted">{item.answer}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
