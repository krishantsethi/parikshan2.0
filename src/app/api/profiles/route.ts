import { getStore } from "@/server/db";
import { ApiError, requireUserApi } from "@/server/auth/guard";
import { enforceRateLimit, handleApiError, jsonOk, parseJsonBody } from "@/server/api/http";
import { profileCreateSchema } from "@/server/validation/schemas";

export const dynamic = "force-dynamic";

const MAX_PROFILES = 8;

export async function GET() {
  try {
    const user = await requireUserApi();
    const store = await getStore();
    return jsonOk({ profiles: await store.listProfiles(user.id) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUserApi();
    enforceRateLimit(request, "profile-create", { max: 20, windowSeconds: 3600 });
    const input = await parseJsonBody(request, profileCreateSchema);
    const store = await getStore();

    const existing = await store.listProfiles(user.id);
    if (existing.length >= MAX_PROFILES) {
      throw new ApiError(409, `You can manage up to ${MAX_PROFILES} profiles.`, "profile_limit");
    }
    if (existing.some((p) => p.name.toLowerCase() === input.name.toLowerCase())) {
      throw new ApiError(409, "A profile with that name already exists.", "duplicate_profile");
    }

    const profile = await store.createProfile({
      ownerId: user.id,
      name: input.name,
      relation: input.relation,
      dob: input.dob ?? null,
      sex: input.sex ?? null,
      bloodGroup: input.bloodGroup ?? null,
      notes: input.notes ?? null,
      authorizationAffirmedAt:
        input.relation === "self" ? null : input.authorizationAffirmed ? new Date() : null,
      isPrimary: false,
    });

    await store.logAudit({
      userId: user.id,
      action: "profile.created",
      entity: "profile",
      entityId: profile.id,
      meta: { relation: profile.relation },
    });
    return jsonOk({ profile }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
