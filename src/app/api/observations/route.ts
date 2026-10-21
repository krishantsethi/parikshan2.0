import { getStore } from "@/server/db";
import { requireOwnedProfile, requireUserApi } from "@/server/auth/guard";
import { enforceRateLimit, handleApiError, jsonOk, parseJsonBody } from "@/server/api/http";
import { observationCreateSchema } from "@/server/validation/schemas";
import { computeFlag } from "@/server/documents/extract-lab";

export const dynamic = "force-dynamic";

/** Manual measurement entry (always user-confirmed). */
export async function POST(request: Request) {
  try {
    const user = await requireUserApi();
    enforceRateLimit(request, "observation-create", { max: 60, windowSeconds: 300 });
    const input = await parseJsonBody(request, observationCreateSchema);
    await requireOwnedProfile(user.id, input.profileId);
    const store = await getStore();

    const numeric = Number.parseFloat(input.valueText.replace(/,/g, ""));
    const valueNumeric = input.valueNumeric ?? (Number.isFinite(numeric) ? numeric : null);
    const flag = computeFlag(valueNumeric, input.refLow ?? null, input.refHigh ?? null);

    const observation = await store.createObservation({
      userId: user.id,
      profileId: input.profileId,
      documentId: null,
      testName: input.testName,
      valueText: input.valueText,
      valueNumeric,
      unit: input.unit ?? null,
      refLow: input.refLow ?? null,
      refHigh: input.refHigh ?? null,
      refText: input.refText ?? null,
      flag,
      collectedAt: input.collectedAt ?? null,
      source: "manual",
      verified: true, // typed in by the account owner
      notes: input.notes ?? null,
    });

    await store.logAudit({
      userId: user.id,
      action: "observation.manual",
      entity: "observation",
      entityId: observation.id,
      meta: { profileId: input.profileId },
    });
    return jsonOk({ observation }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
