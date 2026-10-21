import type { Metadata } from "next";
import { AlertTriangle, BrainCircuit, Calculator, FileScan, Pill, PhoneCall, ShieldAlert } from "lucide-react";
import { LegalDocument } from "@/components/marketing/prose";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = {
  title: "Medical & AI disclaimer",
  description:
    "The explicit limitations of PARIKSHAN: not a medical device, AI can be wrong, OCR can misread, interactions are not exhaustive, calculators are estimates.",
};

const limits = [
  {
    icon: ShieldAlert,
    title: "Not a medical device",
    body: "PARIKSHAN has not been cleared or approved by any medical device regulator (including CDSCO, FDA, or CE marking bodies). It is a record-organization and education tool.",
  },
  {
    icon: BrainCircuit,
    title: "AI can be confidently wrong",
    body: "Language models can misread context even with grounding. Every AI explanation is anchored to displayed extracted values so you can check it, and it can still be incomplete or mistaken.",
  },
  {
    icon: FileScan,
    title: "OCR and extraction are imperfect",
    body: "Text recognition fails on blurry, rotated, handwritten, or low-contrast documents. Values are shown with confidence and require your confirmation. Never assume an extracted value matches the original — verify it.",
  },
  {
    icon: Pill,
    title: "Interaction review is not exhaustive",
    body: "The curated dataset is small and educational, and OpenFDA quotes are not severity-graded. “No interaction found” is not evidence of safety. Ask a pharmacist about your full list, including over-the-counter products and supplements.",
  },
  {
    icon: Calculator,
    title: "Calculators are estimates",
    body: "BMI, BMR, TDEE, macronutrients, lean body mass, and eGFR use published equations with individual variation of roughly ±10–15% or more. eGFR in particular requires clinical context and must not be used for self-diagnosis.",
  },
  {
    icon: AlertTriangle,
    title: "No standards certification",
    body: "FHIR-shaped export is a mapping, not a certified FHIR server. ABHA/ABDM is not integrated. No interoperability certification is claimed or held.",
  },
];

export default function DisclaimerPage() {
  return (
    <LegalDocument title="Medical & AI disclaimer" updated="21 October 2026" draftWarning={false}>
      <Alert tone="danger" title="Emergencies">
        <span className="flex items-start gap-2">
          <PhoneCall className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            If you think you are experiencing a medical emergency, call emergency services (112 in
            India) or go to the nearest emergency department. Do not wait for an app.
          </span>
        </span>
      </Alert>

      <h2>No doctor–patient relationship</h2>
      <p>
        Using PARIKSHAN does not create a physician–patient relationship, and no content in the
        application constitutes a diagnosis, prescription, treatment plan, or second opinion. Decisions
        about your health must be made with a licensed healthcare professional who knows your history.
      </p>

      <h2>Specific limitations</h2>
      <div className="not-prose mt-4 grid gap-3 sm:grid-cols-2">
        {limits.map((limit) => (
          <div key={limit.title} className="rounded-xl border border-line bg-panel/50 p-4">
            <div className="flex items-center gap-2">
              <limit.icon className="size-4 text-warning" aria-hidden />
              <h3 className="text-sm font-semibold text-ink">{limit.title}</h3>
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{limit.body}</p>
          </div>
        ))}
      </div>

      <h2>Interpretation of results</h2>
      <p>
        Abnormality flags are computed only from the reference range printed on the source document.
        Reference ranges vary by laboratory, method, age, sex, and clinical context. A flag of
        "within range" does not mean a value is irrelevant to your health, and a flag of "above" or
        "below" does not establish a diagnosis.
      </p>

      <h2>Medications</h2>
      <p>
        Never start, stop, or change a medication based on this application. Interaction reviews are
        informational aids, not clinical decisions, and must be confirmed by a pharmacist or
        prescriber.
      </p>

      <h2>Data accuracy</h2>
      <p>
        You are responsible for reviewing and confirming extracted values before relying on them.
        Where data is missing, the interface is designed to say so rather than interpolate.
      </p>

      <h2>Governing statement</h2>
      <p>
        This disclaimer is part of the draft legal documentation of this deployment and must be
        reviewed by qualified counsel before production use.
      </p>
    </LegalDocument>
  );
}
