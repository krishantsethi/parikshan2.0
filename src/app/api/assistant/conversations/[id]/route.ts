import { getStore } from "@/server/db";
import { ApiError, requireUserApi } from "@/server/auth/guard";
import { handleApiError, jsonOk } from "@/server/api/http";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserApi();
    const { id } = await context.params;
    const store = await getStore();
    const conversation = await store.getConversation(id);
    if (!conversation || conversation.userId !== user.id) {
      throw new ApiError(404, "Conversation not found.", "not_found");
    }
    await store.deleteConversation(id);
    await store.logAudit({
      userId: user.id,
      action: "assistant.conversation_deleted",
      entity: "conversation",
      entityId: id,
    });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
