import type { ObservationFlag } from "@/types/domain";
import { getStore } from "@/server/db";
import { requireOwnedDocument, requireUserApi } from "@/server/auth/guard";
import { handleApiError, jsonOk, parseJsonBody } from "@/server/api/http";
import { updateObservationConfirmSchema } from "@/server/validation/schemas";
import { computeFlag } from "@/server/documents/extract-lab";
import type { NewObservation } from "@/server/db/types";

export const dynamic = "force-dynamic";

/**
 * Review/confirm step: replaces the document's extracted observations with the
 * user-reviewed values. The abnormality flag is recomputed server-side from the
 * submitted reference range — the client cannot set flags directly.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserApi();
    const { id } = await context.params;
    const document = await requireOwnedDocument(user.id, id);
    const input = await parseJsonBody(request, updateObservationConfirmSchema);
    const store = await getStore();

    const existing = await store.listObservations({ userId: user.id, documentId: id });
    const existingById = new Map(existing.map((obs) => [obs.id, obs]));

    const kept = input.observations.filter((o) => o.keep !== false);
    const newObservations: NewObservation[] = kept.map((entry) => {
      const previous = entry.id ? existingById.get(entry.id) : undefined;
      const numeric = Number.parseFloat(entry.valueText.replace(/,/g, ""));
      const valueNumeric = Number.isFinite(numeric) ? numeric : (previous?.valueNumeric ?? null);
      const refLow = entry.refLow ?? null;
      const refHigh = entry.refHigh ?? null;
      const flag: ObservationFlag = computeFlag(valueNumeric, refLow, refHigh);
      return {
        userId: user.id,
        profileId: document.profileId,
        documentId: id,
        testName: entry.testName,
        valueText: entry.valueText,
        valueNumeric,
        unit: entry.unit ?? null,
        refLow,
        refHigh,
        refText: entry.refText ?? null,
        flag,
        collectedAt: entry.collectedAt ?? previous?.collectedAt ?? null,
        source: "reviewed",
        confidence: previous?.confidence ?? null,
        verified: true,
        notes: previous?.notes
          ? `${previous.notes.split(". Review and confirm")[0]}. Reviewed and confirmed by the account owner.`
          : "Reviewed and confirmed by the account owner.",
      };
    });

    const observations = await store.replaceDocumentObservations(id, newObservations);
    await store.updateDocument(id, {
      status: "ready",
      errorMessage: null,
    });
    await store.logAudit({
      userId: user.id,
      action: "observation.confirmed",
      entity: "document",
      entityId: id,
      meta: { count: observations.length },
    });

    return jsonOk({ observations });
  } catch (error) {
    return handleApiError(error);
  }
}
