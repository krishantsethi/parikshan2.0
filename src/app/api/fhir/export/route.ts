import { getConfig } from "@/lib/env";
import { getStore } from "@/server/db";
import { ApiError, requireOwnedProfile, requireUserApi } from "@/server/auth/guard";
import { handleApiError } from "@/server/api/http";
import { toFhirBundle } from "@/server/interop/fhir";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * FHIR R4-shaped JSON export for ONE profile the caller owns.
 * Export-only mapping — not a certified FHIR endpoint (see docs).
 */
export async function GET(request: Request) {
  try {
    const user = await requireUserApi();
    const url = new URL(request.url);
    const profileId = url.searchParams.get("profileId");
    if (!profileId) throw new ApiError(400, "A profileId query parameter is required.", "missing_profile");
    const profile = await requireOwnedProfile(user.id, profileId);
    const store = await getStore();
    const cfg = getConfig();

    const [{ items: documents }, observations, medications] = await Promise.all([
      store.listDocuments({ userId: user.id, profileId: profile.id, limit: 500 }),
      store.listObservations({ userId: user.id, profileId: profile.id, limit: 2000 }),
      store.listMedications({ userId: user.id, profileId: profile.id }),
    ]);

    const bundle = toFhirBundle({
      profile,
      observations,
      medications,
      documents,
      baseUrl: cfg.appUrl,
    });

    await store.logAudit({
      userId: user.id,
      action: "fhir.exported",
      entity: "profile",
      entityId: profile.id,
      meta: { resources: bundle.entry.length },
    });

    return new Response(JSON.stringify(bundle, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/fhir+json; charset=utf-8",
        "content-disposition": `attachment; filename="fhir-bundle-${profile.id.slice(0, 8)}.json"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
