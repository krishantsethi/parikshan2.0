import { getConfig } from "@/lib/env";
import { getStore } from "@/server/db";
import { hashToken, randomToken } from "@/server/auth/tokens";
import { enforceRateLimit, handleApiError, jsonOk, parseJsonBody } from "@/server/api/http";
import { forgotPasswordSchema } from "@/server/validation/schemas";

export const dynamic = "force-dynamic";

/**
 * Password-reset request.
 *
 * Email delivery is NOT configured in this deployment. In development the
 * reset URL is printed to the server console and returned in the JSON body so
 * the flow is genuinely testable; in production the response is identical
 * whether or not the account exists (no account enumeration) and the URL is
 * only logged to the server console. See docs/AUTH.md for wiring a mail
 * provider.
 */
export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "forgot-password", { max: 5, windowSeconds: 900 });
    const { email } = await parseJsonBody(request, forgotPasswordSchema);
    const store = await getStore();
    const cfg = getConfig();

    const user = await store.getUserByEmail(email);
    let devResetUrl: string | undefined;

    if (user) {
      const token = randomToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await store.createPasswordResetToken(user.id, hashToken(token), expiresAt);
      const url = `${cfg.appUrl}/reset-password?token=${token}`;
      // Server-side only; never logged with medical content.
      console.warn(`[parikshan] password reset link for ${user.email}: ${url}`);
      await store.logAudit({
        userId: user.id,
        action: "password.reset_requested",
        entity: "user",
        entityId: user.id,
      });
      if (!cfg.isProduction) devResetUrl = url;
    }

    return jsonOk({
      ok: true,
      message:
        "If an account exists for that email, a reset link has been prepared. Email delivery is not configured on this instance — see docs/AUTH.md.",
      ...(devResetUrl ? { devResetUrl } : {}),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
