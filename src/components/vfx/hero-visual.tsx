"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "framer-motion";

const HeroScene = dynamic(() => import("@/components/vfx/hero-scene"), {
  ssr: false,
  loading: () => <HeroFallback />,
});

/**
 * SVG/CSS fallback: layered orbital rings, radial glow, and slow pulse.
 * Used for reduced-motion users, devices without WebGL, and as the loading
 * state before the WebGL bundle arrives (no layout shift).
 */
export function HeroFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
      <div className="relative size-[min(78vw,540px)]">
        <div className="absolute inset-[18%] rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(66,232,245,0.28),rgba(91,140,255,0.12)_45%,transparent_70%)] blur-2xl" />
        <svg viewBox="0 0 400 400" className="absolute inset-0 size-full text-accent">
          <defs>
            <radialGradient id="pk-core" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#7df1fa" stopOpacity="0.5" />
              <stop offset="55%" stopColor="#42e8f5" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#42e8f5" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="200" cy="200" r="96" fill="url(#pk-core)" />
          <circle cx="200" cy="200" r="96" fill="none" stroke="currentColor" strokeOpacity="0.25" />
          <ellipse
            cx="200"
            cy="200"
            rx="158"
            ry="58"
            fill="none"
            stroke="#5b8cff"
            strokeOpacity="0.28"
            transform="rotate(-24 200 200)"
          />
          <ellipse
            cx="200"
            cy="200"
            rx="178"
            ry="70"
            fill="none"
            stroke="#42e8f5"
            strokeOpacity="0.16"
            transform="rotate(18 200 200)"
          />
          <circle cx="200" cy="200" r="130" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="2 8" />
          {[0, 60, 120, 180, 240, 300].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            return (
              <circle
                key={deg}
                cx={200 + Math.cos(rad) * 158}
                cy={200 + Math.sin(rad) * 58 * Math.cos(rad * 0.4)}
                r="3"
                fill="#42e8f5"
                opacity="0.8"
              />
            );
          })}
          <path
            d="M140 205h28l14-34 22 66 16-42 12 20h30"
            fill="none"
            stroke="#7df1fa"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.95"
          />
        </svg>
        <span className="absolute inset-[30%] rounded-full border border-accent/30 animate-pulse-ring" />
      </div>
    </div>
  );
}

function supportsWebGl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl")),
    );
  } catch {
    return false;
  }
}

export function HeroVisual() {
  const reducedMotion = useReducedMotion();
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    setWebgl(supportsWebGl());
    // Skip WebGL on very small screens to keep mobile scrolling smooth.
    const query = window.matchMedia("(max-width: 640px)");
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const showScene = webgl === true && !reducedMotion && !compact;

  return (
    <div className="absolute inset-0" aria-hidden>
      <div className="absolute left-1/2 top-1/2 size-[min(92vw,720px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(66,232,245,0.10),transparent_62%)]" />
      {showScene ? <HeroScene /> : <HeroFallback />}
    </div>
  );
}
