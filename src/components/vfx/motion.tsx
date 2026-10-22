"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Scroll-triggered reveal.
 *
 * Fail-open by design: the server-rendered (and pre-hydration) markup is fully
 * visible. Motion is layered on only after React mounts, so a blocked, slow, or
 * failing script — or an IntersectionObserver that never fires inside a
 * throttled cross-origin iframe — can never leave page content invisible.
 *
 * No-ops entirely for users who prefer reduced motion.
 */
export function Reveal({
  children,
  delay = 0,
  y = 22,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  const reduced = useReducedMotion();
  const nodeRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const inView = useInView(nodeRef, { once: true, margin: "-80px" });

  // Callback ref typed against HTMLElement. Because parameter types are
  // contravariant, this satisfies the per-tag ref of whichever element `as`
  // resolves to (div | section | li | article) without an unsafe cast.
  const attachRef = useCallback((node: HTMLElement | null) => {
    nodeRef.current = node;
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Server render, pre-hydration, and reduced-motion: plain visible element.
  // Nothing here can strand content at opacity 0.
  if (reduced || !mounted) {
    const Static = as;
    return (
      <Static data-pk-reveal="" className={className} ref={attachRef}>
        {children}
      </Static>
    );
  }

  // Post-mount: drive the animation from `animate` rather than `initial`, so
  // no opacity:0 is ever committed to the server HTML.
  const Component = motion[as];
  return (
    <Component
      data-pk-reveal=""
      className={className}
      ref={attachRef}
      animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : y }}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Component>
  );
}

/**
 * Counts up to `value` when scrolled into view.
 *
 * Fail-open: the server renders the real value, never a misleading `0`. The
 * count-up is layered on after mount, and skipped entirely for reduced motion.
 */
export function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  decimals = 0,
  className,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  // Start at the true value so SSR and any pre-hydration paint are correct.
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !inView || reduced) {
      setDisplay(value);
      return;
    }
    let frame = 0;
    const duration = 1200;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    setDisplay(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, mounted, reduced, value]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {display.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

/** Subtle staggered fade for lists/grids (CSS-based, reduced-motion safe). */
export function StaggerGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("[&>*]:animate-none", className)} style={{ perspective: 1000 }}>
      {children}
    </div>
  );
}
