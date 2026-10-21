import { getStore } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { enforceRateLimit, handleApiError, jsonOk, parseJsonBody } from "@/server/api/http";
import { feedbackSchema } from "@/server/validation/schemas";

export const dynamic = "force-dynamic";

/** Public feedback endpoint — authenticated users get their submission linked. */
export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "feedback", { max: 5, windowSeconds: 900 });
    const input = await parseJsonBody(request, feedbackSchema);
    const user = await getCurrentUser();
    const store = await getStore();

    const feedback = await store.createFeedback({
      userId: user?.id ?? null,
      email: input.email ?? user?.email ?? null,
      name: input.name ?? user?.name ?? null,
      rating: input.rating ?? null,
      category: input.category,
      message: input.message,
    });

    if (user) {
      await store.logAudit({
        userId: user.id,
        action: "feedback.submitted",
        entity: "feedback",
        entityId: feedback.id,
        meta: { category: input.category, rating: input.rating ?? null },
      });
    }

    return jsonOk({ ok: true, id: feedback.id }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
