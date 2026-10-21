import { getStore } from "@/server/db";
import { ApiError, requireOwnedProfile, requireUserApi } from "@/server/auth/guard";
import { enforceRateLimit, handleApiError, jsonOk, parseJsonBody } from "@/server/api/http";
import { medicationCreateSchema } from "@/server/validation/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUserApi();
    const url = new URL(request.url);
    const profileId = url.searchParams.get("profileId") ?? undefined;
    if (profileId) await requireOwnedProfile(user.id, profileId);
    const store = await getStore();
    const medications = await store.listMedications({ userId: user.id, profileId });
    return jsonOk({ medications });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUserApi();
    enforceRateLimit(request, "medication-create", { max: 40, windowSeconds: 300 });
    const input = await parseJsonBody(request, medicationCreateSchema);
    await requireOwnedProfile(user.id, input.profileId);
    const store = await getStore();

    if (input.startDate && input.endDate && input.endDate < input.startDate) {
      throw new ApiError(400, "End date cannot be before the start date.", "invalid_dates");
    }

    const medication = await store.createMedication({
      userId: user.id,
      profileId: input.profileId,
      name: input.name,
      dosageText: input.dosageText ?? null,
      scheduleText: input.scheduleText ?? null,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      active: input.active ?? true,
      prescriber: input.prescriber ?? null,
      notes: input.notes ?? null,
    });

    await store.logAudit({
      userId: user.id,
      action: "medication.created",
      entity: "medication",
      entityId: medication.id,
    });
    return jsonOk({ medication }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
