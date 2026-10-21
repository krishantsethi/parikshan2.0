import type { InteractionCheck, InteractionFinding, InteractionSourceKind, Medication } from "@/types/domain";
import { CURATED_INTERACTIONS, CURATED_LAST_REVIEWED } from "@/server/medications/curated";
import { nameMatches, normalizeMedicationName } from "@/lib/medications/normalize";
import { lookupOpenFdaMention } from "@/server/medications/openfda";

export const INTERACTION_DISCLAIMER =
  "This review is informational and not exhaustive. A result of “no known interaction” never means a combination is safe. " +
  "Always confirm with your prescribing clinician or pharmacist before starting, stopping, or changing any medication.";

const SEVERITY_ORDER: Record<InteractionFinding["severity"], number> = {
  major: 0,
  moderate: 1,
  minor: 2,
  unknown: 3,
};

export interface InteractionReview {
  findings: InteractionFinding[];
  sourcesUsed: InteractionSourceKind[];
  status: InteractionCheck["status"];
  uncertainNames: string[];
  warnings: string[];
}

export function normalizeMedicationList(medications: Medication[]) {
  return medications.map((med) => ({ med, ...normalizeMedicationName(med.name) }));
}

/**
 * Deterministic pair-wise review:
 *  1. curated dataset (always) — severity-graded, labeled educational
 *  2. optional OpenFDA label mentions — quoted official label text, no severity
 */
export async function reviewMedicationList(
  medications: Medication[],
  options: { openfda: { enabled: boolean; apiKey: string | null } },
): Promise<InteractionReview> {
  const normalized = normalizeMedicationList(medications);
  const findings: InteractionFinding[] = [];
  const warnings: string[] = [];
  const uncertainNames = normalized.filter((n) => n.uncertain).map((n) => n.raw);
  for (const n of normalized) {
    if (n.brandMatchedAs) {
      warnings.push(
        `“${n.raw}” was matched to the generic name “${n.brandMatchedAs}” using a common brand hint. Confirm the generic name with your pharmacist.`,
      );
    }
  }

  const pairsWithHit = new Set<string>();
  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      const left = normalized[i]!;
      const right = normalized[j]!;

      for (const entry of CURATED_INTERACTIONS) {
        const leftInA = entry.a.some((alias) => nameMatches(left.normalized, alias));
        const leftInB = entry.b.some((alias) => nameMatches(left.normalized, alias));
        const rightInA = entry.a.some((alias) => nameMatches(right.normalized, alias));
        const rightInB = entry.b.some((alias) => nameMatches(right.normalized, alias));
        if ((leftInA && rightInB) || (leftInB && rightInA)) {
          const pairKey = [left.normalized, right.normalized].sort().join("|");
          pairsWithHit.add(pairKey);
          findings.push({
            drugA: left.raw,
            drugB: right.raw,
            severity: entry.severity,
            source: "curated",
            description: entry.description,
            evidenceNote: `${entry.evidence} (curated dataset, last reviewed ${CURATED_LAST_REVIEWED}; not exhaustive)`,
            retrievedAt: null,
          });
        }
      }
    }
  }

  const sourcesUsed: InteractionSourceKind[] = ["curated"];
  let status: InteractionCheck["status"] = "complete";

  if (options.openfda.enabled && normalized.length >= 2) {
    // Bound outbound calls: only pairs without a curated hit, max 4 lookups.
    const candidates: Array<{ left: string; right: string; key: string }> = [];
    for (let i = 0; i < normalized.length; i++) {
      for (let j = i + 1; j < normalized.length; j++) {
        const pairKey = [normalized[i]!.normalized, normalized[j]!.normalized].sort().join("|");
        if (!pairsWithHit.has(pairKey) && normalized[i]!.normalized && normalized[j]!.normalized) {
          candidates.push({ left: normalized[i]!.normalized, right: normalized[j]!.normalized, key: pairKey });
        }
      }
    }

    const lookups = candidates.slice(0, 4);
    if (candidates.length > lookups.length) {
      warnings.push(
        `Only ${lookups.length} of ${candidates.length} medication pairs were checked against OpenFDA (lookup limit).`,
      );
    }

    const results = await Promise.allSettled(
      lookups.map((pair) => lookupOpenFdaMention(pair.left, pair.right, { apiKey: options.openfda.apiKey })),
    );

    let succeeded = 0;
    let failed = 0;
    results.forEach((result, index) => {
      const pair = lookups[index]!;
      if (result.status === "rejected") {
        failed += 1;
        return;
      }
      succeeded += 1;
      if (result.value) {
        findings.push({
          drugA: pair.left,
          drugB: pair.right,
          severity: "unknown",
          source: "openfda",
          description: result.value.description,
          evidenceNote:
            "Quoted from the official FDA drug label (drug_interactions section). A mention is not a graded severity — ask a pharmacist.",
          retrievedAt: result.value.retrievedAt,
        });
      }
    });

    if (succeeded > 0) sourcesUsed.push("openfda");
    if (failed > 0) {
      status = "partial";
      warnings.push(
        `${failed} OpenFDA lookup(s) failed — live label data may be incomplete. Curated results are unaffected.`,
      );
    }
  }

  findings.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.drugA.localeCompare(b.drugA),
  );

  return { findings, sourcesUsed, status, uncertainNames, warnings };
}
