import { getStore } from "@/server/db";
import { hashPassword, passwordProblems } from "@/server/auth/password";
import { hashToken } from "@/server/auth/tokens";
import { ApiError } from "@/server/auth/guard";
import { enforceRateLimit, handleApiError, jsonOk, parseJsonBody } from "@/server/api/http";
import { resetPasswordSchema } from "@/server/validation/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "reset-password", { max: 10, windowSeconds: 900 });
    const { token, password } = await parseJsonBody(request, resetPasswordSchema);
    if (passwordProblems(password).includes("too_short")) {
      throw new ApiError(400, "Password must be at least 8 characters.", "weak_password");
    }

    const store = await getStore();
    const record = await store.getValidPasswordResetToken(hashToken(token));
    if (!record) {
      throw new ApiError(400, "This reset link is invalid or has expired. Request a new one.", "invalid_token");
    }

    const passwordHash = await hashPassword(password);
    const updated = await store.updateUser(record.userId, { passwordHash });
    if (!updated) throw new ApiError(400, "This account no longer exists.", "invalid_token");

    await store.consumePasswordResetToken(record.id);
    // Invalidate every existing session after a password change.
    await store.deleteSessionsForUser(record.userId);
    await store.logAudit({
      userId: record.userId,
      action: "password.reset_completed",
      entity: "user",
      entityId: record.userId,
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
