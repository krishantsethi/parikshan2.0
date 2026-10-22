import { getStore } from "@/server/db";
import { getConfig } from "@/lib/env";
import { DEMO_CREDENTIALS } from "@/server/db/memory-store";
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

    // The seeded demo account gets a stateless signed session on demo
    // deployments (no shared storage across serverless instances); every other
    // account keeps a database-backed, revocable session.
    const statelessDemo = !getConfig().databaseUrl && user.email === DEMO_CREDENTIALS.email;
    await establishSession(user.id, request.headers.get("user-agent"), {
      statelessDemo,
    });
    await store.logAudit({ userId: user.id, action: "login", entity: "user", entityId: user.id });
    return jsonOk({ ok: true, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    return handleApiError(error);
  }
}
