import { z } from "zod";
import { getStore } from "@/server/db";
import { destroySession } from "@/server/auth/session";
import { requireUserApi } from "@/server/auth/guard";
import { handleApiError, jsonOk, parseJsonBody } from "@/server/api/http";

export const dynamic = "force-dynamic";

const schema = z.object({ confirm: z.literal("DELETE") });

export async function POST(request: Request) {
  try {
    const user = await requireUserApi();
    await parseJsonBody(request, schema);
    const store = await getStore();

    await store.logAudit({
      userId: user.id,
      action: "account.deletion_requested",
      entity: "user",
      entityId: user.id,
    });
    await store.deleteUser(user.id);
    await destroySession();
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
