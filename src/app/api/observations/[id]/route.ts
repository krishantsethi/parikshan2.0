import { getStore } from "@/server/db";
import { ApiError, requireUserApi } from "@/server/auth/guard";
import { handleApiError, jsonOk, parseJsonBody } from "@/server/api/http";
import { observationUpdateSchema } from "@/server/validation/schemas";
import { computeFlag } from "@/server/documents/extract-lab";
import type { ObservationPatch } from "@/server/db/types";

export const dynamic = "force-dynamic";

async function loadOwnedObservation(userId: string, id: string) {
  const store = await getStore();
  const observation = await store.getObservation(id);
  if (!observation || observation.userId !== userId) {
    throw new ApiError(404, "Measurement not found.", "not_found");
  }
  return { store, observation };
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserApi();
    const { id } = await context.params;
    const { store, observation } = await loadOwnedObservation(user.id, id);
    const input = await parseJsonBody(request, observationUpdateSchema);

    const valueText = input.valueText ?? observation.valueText;
    const numeric = Number.parseFloat(valueText.replace(/,/g, ""));
    const valueNumeric =
      input.valueNumeric !== undefined
        ? input.valueNumeric
        : Number.isFinite(numeric)
          ? numeric
          : observation.valueNumeric;
    const refLow = input.refLow !== undefined ? input.refLow : observation.refLow;
    const refHigh = input.refHigh !== undefined ? input.refHigh : observation.refHigh;

    const patch: ObservationPatch = {
      ...input,
      valueText,
      valueNumeric,
      flag: computeFlag(valueNumeric, refLow, refHigh),
      // Editing a value counts as a human review.
      verified: input.verified ?? true,
    };

    const updated = await store.updateObservation(id, patch);
    if (!updated) throw new ApiError(404, "Measurement not found.", "not_found");
    await store.logAudit({
      userId: user.id,
      action: "observation.updated",
      entity: "observation",
      entityId: id,
    });
    return jsonOk({ observation: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserApi();
    const { id } = await context.params;
    const { store } = await loadOwnedObservation(user.id, id);
    await store.deleteObservation(id);
    await store.logAudit({
      userId: user.id,
      action: "observation.deleted",
      entity: "observation",
      entityId: id,
    });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
