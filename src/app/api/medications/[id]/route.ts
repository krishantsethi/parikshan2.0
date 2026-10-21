import { getStore } from "@/server/db";
import { ApiError, requireUserApi } from "@/server/auth/guard";
import { handleApiError, jsonOk, parseJsonBody } from "@/server/api/http";
import { medicationUpdateSchema } from "@/server/validation/schemas";

export const dynamic = "force-dynamic";

async function loadOwned(userId: string, id: string) {
  const store = await getStore();
  const medication = await store.getMedication(id);
  if (!medication || medication.userId !== userId) {
    throw new ApiError(404, "Medication not found.", "not_found");
  }
  return { store, medication };
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserApi();
    const { id } = await context.params;
    const { store } = await loadOwned(user.id, id);
    const input = await parseJsonBody(request, medicationUpdateSchema);

    if (input.startDate && input.endDate && input.endDate < input.startDate) {
      throw new ApiError(400, "End date cannot be before the start date.", "invalid_dates");
    }

    const medication = await store.updateMedication(id, input);
    if (!medication) throw new ApiError(404, "Medication not found.", "not_found");
    await store.logAudit({
      userId: user.id,
      action: "medication.updated",
      entity: "medication",
      entityId: id,
    });
    return jsonOk({ medication });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserApi();
    const { id } = await context.params;
    const { store } = await loadOwned(user.id, id);
    await store.deleteMedication(id);
    await store.logAudit({
      userId: user.id,
      action: "medication.deleted",
      entity: "medication",
      entityId: id,
    });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
