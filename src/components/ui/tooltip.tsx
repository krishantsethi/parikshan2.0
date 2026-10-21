import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Lightweight CSS tooltip (hover + keyboard focus). For critical information
 * never rely on a tooltip alone — the text is also exposed via aria-label.
 */
export function Tooltip({
  content,
  children,
  className,
}: {
  content: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("group/tooltip relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-64 -translate-x-1/2 translate-y-1 rounded-lg border border-line-strong bg-panel-raised px-2.5 py-1.5 text-xs leading-snug text-ink opacity-0 shadow-lg transition-all duration-150 group-hover/tooltip:translate-y-0 group-hover/tooltip:opacity-100 group-focus-within/tooltip:translate-y-0 group-focus-within/tooltip:opacity-100"
      >
        {content}
      </span>
    </span>
  );
}
