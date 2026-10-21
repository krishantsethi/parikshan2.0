import { getStore } from "@/server/db";
import { ApiError, requireUserApi } from "@/server/auth/guard";
import { handleApiError, jsonOk, parseJsonBody } from "@/server/api/http";
import { settingsAccountSchema } from "@/server/validation/schemas";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const user = await requireUserApi();
    const input = await parseJsonBody(request, settingsAccountSchema);
    const store = await getStore();

    if (input.email && input.email !== user.email) {
      const existing = await store.getUserByEmail(input.email);
      if (existing && existing.id !== user.id) {
        throw new ApiError(409, "That email is already in use.", "email_taken");
      }
    }

    const updated = await store.updateUser(user.id, input);
    if (!updated) throw new ApiError(404, "Account not found.", "not_found");
    await store.logAudit({
      userId: user.id,
      action: "account.updated",
      entity: "user",
      entityId: user.id,
      meta: { fields: Object.keys(input) },
    });

    return jsonOk({ user: { id: updated.id, name: updated.name, email: updated.email } });
  } catch (error) {
    return handleApiError(error);
  }
}
