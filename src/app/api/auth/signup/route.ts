import { getStore } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import { establishSession } from "@/server/auth/session";
import { ApiError } from "@/server/auth/guard";
import { enforceRateLimit, handleApiError, jsonOk, parseJsonBody } from "@/server/api/http";
import { signupSchema } from "@/server/validation/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "signup", { max: 5, windowSeconds: 300 });
    const input = await parseJsonBody(request, signupSchema);
    const store = await getStore();

    const existing = await store.getUserByEmail(input.email);
    if (existing) {
      throw new ApiError(409, "An account with this email already exists.", "email_taken");
    }

    const passwordHash = await hashPassword(input.password);
    const user = await store.createUser({
      email: input.email,
      name: input.name,
      passwordHash,
    });

    // Every account starts with a primary "self" profile so the app is usable
    // immediately; onboarding refines it.
    await store.createProfile({
      ownerId: user.id,
      name: input.name,
      relation: "self",
      isPrimary: true,
    });

    await store.logAudit({
      userId: user.id,
      action: "signup",
      entity: "user",
      entityId: user.id,
      meta: { store: store.kind },
    });

    await establishSession(user.id, request.headers.get("user-agent"));
    return jsonOk({ ok: true, user: { id: user.id, name: user.name, email: user.email } }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
