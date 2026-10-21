import { capabilityReport } from "@/lib/env";
import { getStore } from "@/server/db";
import { handleApiError, jsonOk } from "@/server/api/http";

export const dynamic = "force-dynamic";

/** Safe deployment status — no secrets, no user data. */
export async function GET() {
  try {
    const store = await getStore();
    return jsonOk({
      status: "ok",
      time: new Date().toISOString(),
      store: store.kind,
      capabilities: capabilityReport(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
