import { getStore } from "@/server/db";
import { ApiError, requireOwnedProfile, requireUserApi } from "@/server/auth/guard";
import { handleApiError, jsonOk, parseJsonBody } from "@/server/api/http";
import { profileUpdateSchema } from "@/server/validation/schemas";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserApi();
    const { id } = await context.params;
    await requireOwnedProfile(user.id, id);
    const input = await parseJsonBody(request, profileUpdateSchema);
    const store = await getStore();

    if ("authorizationAffirmed" in input && input.authorizationAffirmed !== true) {
      // Never allow clearing the affirmation without re-affirming explicitly.
      delete input.authorizationAffirmed;
    }

    const profile = await store.updateProfile(id, {
      ...input,
      authorizationAffirmedAt: input.authorizationAffirmed ? new Date() : undefined,
    });
    if (!profile) throw new ApiError(404, "Profile not found.", "not_found");

    await store.logAudit({
      userId: user.id,
      action: "profile.updated",
      entity: "profile",
      entityId: profile.id,
    });
    return jsonOk({ profile });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserApi();
    const { id } = await context.params;
    await requireOwnedProfile(user.id, id);
    const store = await getStore();

    const profiles = await store.listProfiles(user.id);
    if (profiles.length <= 1) {
      throw new ApiError(
        409,
        "Every account needs at least one health profile. Create another profile before deleting this one.",
        "last_profile",
      );
    }
    const target = profiles.find((p) => p.id === id);
    await store.deleteProfile(id);
    if (target?.isPrimary) {
      const next = profiles.find((p) => p.id !== id);
      if (next) await store.updateProfile(next.id, { isPrimary: true });
    }

    await store.logAudit({
      userId: user.id,
      action: "profile.deleted",
      entity: "profile",
      entityId: id,
    });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
