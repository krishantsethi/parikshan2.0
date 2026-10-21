import { ApiError, requireOwnedDocument, requireUserApi } from "@/server/auth/guard";
import { enforceRateLimit, handleApiError, jsonOk } from "@/server/api/http";
import { retryDocumentProcessing } from "@/server/documents/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserApi();
    enforceRateLimit(request, "document-retry", { max: 6, windowSeconds: 300 });
    const { id } = await context.params;
    const document = await requireOwnedDocument(user.id, id);
    if (document.status === "processing") {
      throw new ApiError(409, "This document is already being processed.", "already_processing");
    }
    const updated = await retryDocumentProcessing(user.id, id);
    return jsonOk({ document: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
