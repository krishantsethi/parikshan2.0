"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Minimal, accessible dropdown menu (click outside + Escape to close). */
export function Dropdown({
  trigger,
  children,
  align = "right",
  className,
  label,
}: {
  trigger: (props: { open: boolean; toggle: () => void; triggerId: string }) => ReactNode;
  children: (props: { close: () => void }) => ReactNode;
  align?: "left" | "right";
  className?: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerId = useId();

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v), triggerId })}
      {open && (
        <div
          role="menu"
          aria-label={label}
          className={cn(
            "panel-raised absolute z-50 mt-2 min-w-52 overflow-hidden p-1.5",
            "animate-in fade-in slide-in-from-top-1 duration-150",
            align === "right" ? "right-0" : "left-0",
            className,
          )}
        >
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  href,
  destructive,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  destructive?: boolean;
  className?: string;
}) {
  const base = cn(
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
    destructive ? "text-danger hover:bg-danger-dim" : "text-muted hover:bg-panel hover:text-ink",
    className,
  );
  if (href) {
    return (
      <a href={href} role="menuitem" className={base}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" role="menuitem" className={base} onClick={onClick}>
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="my-1.5 h-px bg-line" role="separator" />;
}
