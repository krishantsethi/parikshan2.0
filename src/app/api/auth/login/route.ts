import { getStore } from "@/server/db";
import { verifyPassword } from "@/server/auth/password";
import { establishSession } from "@/server/auth/session";
import { ApiError } from "@/server/auth/guard";
import {
  DUMMY_PASSWORD_HASH,
  enforceRateLimit,
  handleApiError,
  jsonOk,
  parseJsonBody,
} from "@/server/api/http";
import { loginSchema } from "@/server/validation/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "login", { max: 10, windowSeconds: 300 });
    const input = await parseJsonBody(request, loginSchema);
    const store = await getStore();

    const user = await store.getUserByEmail(input.email);
    // Always run a scrypt verification so unknown emails don't return faster.
    const passwordOk = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

    if (!user || !passwordOk) {
      throw new ApiError(401, "Incorrect email or password.", "invalid_credentials");
    }

    await establishSession(user.id, request.headers.get("user-agent"));
    await store.logAudit({ userId: user.id, action: "login", entity: "user", entityId: user.id });
    return jsonOk({ ok: true, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    return handleApiError(error);
  }
}
