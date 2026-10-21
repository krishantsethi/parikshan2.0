import { getStore } from "@/server/db";
import { destroySession, getCurrentUser } from "@/server/auth/session";
import { handleApiError, jsonOk } from "@/server/api/http";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (user) {
      const store = await getStore();
      await store.logAudit({ userId: user.id, action: "logout", entity: "user", entityId: user.id });
    }
    await destroySession();
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
