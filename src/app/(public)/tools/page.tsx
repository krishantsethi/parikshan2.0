import type { Metadata } from "next";
import { Activity } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { HealthTools } from "@/components/tools/health-tools";

export const metadata: Metadata = {
  title: "Health tools",
  description:
    "Transparent BMI, BMR, TDEE, macronutrient, lean body mass, and eGFR calculators with documented formulas and limitations.",
};

export default function ToolsPage() {
  return (
    <>
      <PageHero
        eyebrow="Health tools"
        title="Calculators you can actually audit."
        description="Every tool names its formula, states its assumptions, and explains why the result is an estimate. No black boxes, no false precision."
        badge="Educational"
      />
      <section className="mx-auto max-w-5xl px-5 py-14 lg:px-8 lg:py-20">
        <div className="mb-6 flex items-center gap-2 text-xs text-faint">
          <Activity className="size-3.5 text-accent" aria-hidden />
          All calculations run in your browser — no measurements are sent or stored.
        </div>
        <HealthTools />
      </section>
    </>
  );
}
