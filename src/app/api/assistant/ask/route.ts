import type { Locale } from "@/types/domain";
import { getStore } from "@/server/db";
import { ApiError, requireUserApi, resolveActorProfile } from "@/server/auth/guard";
import { enforceRateLimit, handleApiError, jsonOk, parseJsonBody } from "@/server/api/http";
import { assistantAskSchema } from "@/server/validation/schemas";
import { answerHealthQuestion } from "@/server/ai/assistant";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const user = await requireUserApi();
    enforceRateLimit(request, "assistant-ask", { max: 20, windowSeconds: 300 });
    const input = await parseJsonBody(request, assistantAskSchema);
    const store = await getStore();
    const profile = await resolveActorProfile(user.id, input.profileId ?? null);

    let conversationId = input.conversationId;
    let locale: Locale = input.locale ?? user.locale;

    if (conversationId) {
      const existing = await store.getConversation(conversationId);
      if (!existing || existing.userId !== user.id) {
        throw new ApiError(404, "Conversation not found.", "not_found");
      }
      if (existing.profileId && existing.profileId !== profile.id) {
        throw new ApiError(400, "This conversation belongs to a different health profile.", "profile_mismatch");
      }
      locale = input.locale ?? existing.locale ?? user.locale;
    } else {
      const conversation = await store.createConversation({
        userId: user.id,
        profileId: profile.id,
        title: input.question.slice(0, 70),
        locale,
      });
      conversationId = conversation.id;
    }

    const history = await store.listMessages(conversationId, 12);
    await store.createMessage({
      conversationId,
      role: "user",
      content: input.question,
    });

    const answer = await answerHealthQuestion({
      store,
      user,
      profile,
      question: input.question,
      locale,
      history,
    });

    const message = await store.createMessage({
      conversationId,
      role: "assistant",
      content: answer.content,
      citations: answer.citations,
      grounded: answer.grounded,
      provider: answer.provider,
      error: answer.error,
    });

    await store.logAudit({
      userId: user.id,
      action: "assistant.asked",
      entity: "conversation",
      entityId: conversationId,
      meta: { grounded: answer.grounded, provider: answer.provider ? "configured" : "none" },
    });

    return jsonOk({ conversationId, message }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
