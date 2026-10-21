import { getConfig } from "@/lib/env";
import { getStore } from "@/server/db";
import { ApiError, requireOwnedProfile, requireUserApi } from "@/server/auth/guard";
import { enforceRateLimit, handleApiError, jsonOk, parseJsonBody } from "@/server/api/http";
import { interactionCheckSchema } from "@/server/validation/schemas";
import {
  INTERACTION_DISCLAIMER,
  reviewMedicationList,
} from "@/server/medications/review";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const user = await requireUserApi();
    enforceRateLimit(request, "interaction-check", { max: 12, windowSeconds: 300 });
    const input = await parseJsonBody(request, interactionCheckSchema);
    const profile = await requireOwnedProfile(user.id, input.profileId);
    const store = await getStore();
    const cfg = getConfig();

    const all = await store.listMedications({ userId: user.id, profileId: profile.id });
    const selected = all.filter((med) => input.medicationIds.includes(med.id));
    if (selected.length < 2) {
      throw new ApiError(
        400,
        "Select at least two medications from this profile to run a review.",
        "insufficient_medications",
      );
    }

    const review = await reviewMedicationList(selected, {
      openfda: { enabled: cfg.openfda.enabled, apiKey: cfg.openfda.apiKey },
    });

    const check = await store.createInteractionCheck({
      userId: user.id,
      profileId: profile.id,
      medicationIds: selected.map((m) => m.id),
      medicationNames: selected.map((m) => m.name),
      findings: review.findings,
      sourcesUsed: review.sourcesUsed,
      status: review.status,
      disclaimer: INTERACTION_DISCLAIMER,
    });

    await store.logAudit({
      userId: user.id,
      action: "interaction.checked",
      entity: "interaction_check",
      entityId: check.id,
      meta: {
        findings: review.findings.length,
        sources: review.sourcesUsed,
        medications: selected.length,
      },
    });

    return jsonOk({ check, warnings: review.warnings, uncertainNames: review.uncertainNames }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
