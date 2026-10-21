"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-on-accent font-semibold hover:bg-accent-strong shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_8px_24px_-12px_var(--color-accent)]",
  secondary:
    "bg-panel-raised text-ink border border-line hover:border-line-strong hover:bg-panel",
  ghost: "text-muted hover:text-ink hover:bg-panel-raised",
  outline: "border border-line-strong text-ink hover:bg-panel-raised",
  danger: "bg-danger text-white font-semibold hover:opacity-90",
  link: "text-accent underline-offset-4 hover:underline p-0 h-auto",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-[var(--radius-field)]",
  lg: "h-12 px-6 text-base gap-2.5 rounded-[var(--radius-field)]",
  icon: "size-10 rounded-[var(--radius-field)]",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

const base =
  "inline-flex items-center justify-center whitespace-nowrap transition-all duration-200 select-none disabled:opacity-50 disabled:pointer-events-none active:translate-y-px";

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  iconRight,
  fullWidth,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(base, VARIANTS[variant], SIZES[size], fullWidth && "w-full", className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
      {iconRight}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  fullWidth,
  className,
  children,
  ...props
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
  target?: string;
  rel?: string;
  prefetch?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(base, VARIANTS[variant], SIZES[size], fullWidth && "w-full", className)}
      {...props}
    >
      {icon}
      {children}
      {iconRight}
    </Link>
  );
}
