import { getLocaleFromCookie } from "@/i18n/server";
import { requireOwnedDocument, requireUserApi } from "@/server/auth/guard";
import { enforceRateLimit, handleApiError, jsonOk } from "@/server/api/http";
import { generateSummaryForDocument } from "@/server/documents/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserApi();
    enforceRateLimit(request, "document-summary", { max: 8, windowSeconds: 300 });
    const { id } = await context.params;
    await requireOwnedDocument(user.id, id);
    const locale = await getLocaleFromCookie();
    const outcome = await generateSummaryForDocument(user, id, locale);
    return jsonOk(outcome);
  } catch (error) {
    return handleApiError(error);
  }
}
