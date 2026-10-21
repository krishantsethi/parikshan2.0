import { getStore } from "@/server/db";
import { ApiError, requireOwnedDocument, requireUserApi } from "@/server/auth/guard";
import { handleApiError, jsonOk, parseJsonBody } from "@/server/api/http";
import { documentUpdateSchema } from "@/server/validation/schemas";
import { deleteDocumentForUser } from "@/server/documents/service";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserApi();
    const { id } = await context.params;
    await requireOwnedDocument(user.id, id);
    const input = await parseJsonBody(request, documentUpdateSchema);
    const store = await getStore();

    const patch: Parameters<typeof store.updateDocument>[1] = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.category !== undefined) patch.category = input.category;
    if (input.summary !== undefined) {
      patch.summary = input.summary;
      patch.summaryKind = input.summary === null ? null : "structured_digest";
    }

    const document = await store.updateDocument(id, patch);
    if (!document) throw new ApiError(404, "Document not found.", "not_found");
    return jsonOk({ document });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserApi();
    const { id } = await context.params;
    await deleteDocumentForUser(user.id, id);
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
