import { cn } from "@/lib/utils";

/**
 * PARIKSHAN brand mark.
 *
 * Concept: a verification shield built from a hexagonal precision frame, an
 * ECG trace (health), and a central node (intelligence). The diagonal form
 * suggests forward motion; the pulse line doubles as a check.
 */
export function LogoMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label="PARIKSHAN symbol"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="pk-mark-grad" x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#42E8F5" />
          <stop offset="0.55" stopColor="#5B8CFF" />
          <stop offset="1" stopColor="#42E8F5" stopOpacity="0.65" />
        </linearGradient>
        <linearGradient id="pk-mark-fill" x1="8" y1="8" x2="32" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#42E8F5" stopOpacity="0.16" />
          <stop offset="1" stopColor="#5B8CFF" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <path
        d="M20 2.5 35.2 11v18L20 37.5 4.8 29V11L20 2.5Z"
        fill="url(#pk-mark-fill)"
        stroke="url(#pk-mark-grad)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M20 8.2 30.3 14v12L20 31.8 9.7 26V14L20 8.2Z"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      {/* ECG / check trace */}
      <path
        d="M11.4 21.4h4.1l2.1-5.6 3.4 10.2 2.3-6.2 1.7 2.9h3.6"
        stroke="url(#pk-mark-grad)"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="27.9" cy="22.7" r="1.7" fill="#42E8F5" />
      <circle cx="27.9" cy="22.7" r="3.6" stroke="#42E8F5" strokeOpacity="0.28" strokeWidth="1" />
    </svg>
  );
}

export function Wordmark({
  className,
  size = 30,
  showTagline = false,
}: {
  className?: string;
  size?: number;
  showTagline?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold uppercase tracking-[0.22em] text-ink">
          Parikshan
        </span>
        {showTagline && (
          <span className="mt-1.5 text-[9px] uppercase tracking-[0.2em] text-faint">
            Personal Health Intelligence
          </span>
        )}
      </span>
    </span>
  );
}
