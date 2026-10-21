"use client";

import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const controlClass =
  "w-full rounded-[var(--radius-field)] border border-line bg-panel/70 px-3.5 py-2.5 text-sm text-ink placeholder:text-faint " +
  "transition-colors hover:border-line-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 " +
  "disabled:opacity-60 disabled:cursor-not-allowed aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/20";

const labelClass = "block text-xs font-medium uppercase tracking-wider text-muted";

function FieldShell({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className={labelClass}>
          {label}
          {required && <span className="ml-1 text-accent">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-faint">{hint}</p>}
      {error && (
        <p className="flex items-start gap-1.5 text-xs text-danger" role="alert">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string | null;
  fieldClassName?: string;
}

export function Input({ label, hint, error, className, id, required, fieldClassName, ...props }: InputProps) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <FieldShell
      label={label}
      htmlFor={inputId}
      hint={hint}
      error={error}
      required={required}
      className={fieldClassName}
    >
      <input
        id={inputId}
        className={cn(controlClass, className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint ? `${inputId}-hint` : undefined}
        required={required}
        {...props}
      />
    </FieldShell>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string | null;
}

export function Textarea({ label, hint, error, className, id, required, ...props }: TextareaProps) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <FieldShell label={label} htmlFor={inputId} hint={hint} error={error} required={required}>
      <textarea
        id={inputId}
        className={cn(controlClass, "min-h-24 resize-y leading-relaxed", className)}
        aria-invalid={error ? true : undefined}
        required={required}
        {...props}
      />
    </FieldShell>
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string | null;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  fieldClassName?: string;
}

export function Select({
  label,
  hint,
  error,
  className,
  id,
  options,
  placeholder,
  required,
  fieldClassName,
  ...props
}: SelectProps) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <FieldShell label={label} htmlFor={inputId} hint={hint} error={error} required={required} className={fieldClassName}>
      <select
        id={inputId}
        className={cn(controlClass, "appearance-none bg-panel pr-9", className)}
        aria-invalid={error ? true : undefined}
        required={required}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function Checkbox({
  label,
  description,
  error,
  id,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode;
  description?: string;
  error?: string | null;
}) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-3">
        <input
          id={inputId}
          type="checkbox"
          className={cn(
            "mt-0.5 size-4 shrink-0 rounded border-line bg-panel accent-[var(--color-accent)]",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            className,
          )}
          aria-invalid={error ? true : undefined}
          {...props}
        />
        <label htmlFor={inputId} className="text-sm leading-relaxed text-muted">
          {label}
          {description && <span className="mt-1 block text-xs text-faint">{description}</span>}
        </label>
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-danger" role="alert">
          <AlertCircle className="size-3.5" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

export function FieldGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-4 sm:grid-cols-2", className)}>{children}</div>;
}
