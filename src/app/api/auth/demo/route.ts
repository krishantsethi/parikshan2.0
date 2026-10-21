import { getConfig } from "@/lib/env";
import { getStore } from "@/server/db";
import { establishSession } from "@/server/auth/session";
import { ApiError } from "@/server/auth/guard";
import { enforceRateLimit, handleApiError, jsonOk } from "@/server/api/http";
import { DEMO_CREDENTIALS } from "@/server/db/memory-store";

export const dynamic = "force-dynamic";

/**
 * One-click demo login. Only works when the demo store is active (no
 * DATABASE_URL) and DEMO_MODE is not disabled. The seeded account contains
 * clearly-labeled fictional SAMPLE data.
 */
export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "demo-login", { max: 10, windowSeconds: 300 });
    const cfg = getConfig();
    if (cfg.databaseUrl) {
      throw new ApiError(
        409,
        "Demo login is only available on the in-memory demo deployment. Sign in with your own account.",
        "demo_unavailable",
      );
    }
    if (!cfg.demoMode) {
      throw new ApiError(409, "Demo mode is disabled on this deployment.", "demo_disabled");
    }

    const store = await getStore();
    const user = await store.getUserByEmail(DEMO_CREDENTIALS.email);
    if (!user) {
      throw new ApiError(
        503,
        "The demo workspace is not seeded on this instance. Sign up instead — it takes a few seconds.",
        "demo_not_seeded",
      );
    }

    await establishSession(user.id, request.headers.get("user-agent"));
    await store.logAudit({ userId: user.id, action: "login", entity: "user", entityId: user.id, meta: { demo: true } });
    return jsonOk({ ok: true, demo: true });
  } catch (error) {
    return handleApiError(error);
  }
}
