"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200",
          checked ? "border-accent/40 bg-accent/80" : "border-line bg-panel-raised",
          disabled && "opacity-50",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4.5 rounded-full bg-white shadow transition-all duration-200",
            checked ? "left-[calc(100%-1.375rem)]" : "left-0.5",
          )}
        />
      </button>
    </div>
  );
}
