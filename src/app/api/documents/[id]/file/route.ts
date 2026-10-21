import { getStore } from "@/server/db";
import { ApiError, requireOwnedDocument, requireUserApi } from "@/server/auth/guard";
import { handleApiError } from "@/server/api/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Authenticated, ownership-checked download of the original document. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserApi();
    const { id } = await context.params;
    const document = await requireOwnedDocument(user.id, id);
    const store = await getStore();
    const file = await store.getFile(id);
    if (!file) throw new ApiError(404, "The stored file is not available.", "file_missing");

    const url = new URL(request.url);
    const download = url.searchParams.get("download") === "1";
    const asciiName = document.originalFilename.replace(/[^\w.\-]+/g, "_");
    const encodedName = encodeURIComponent(document.originalFilename);

    return new Response(new Uint8Array(file.bytes), {
      status: 200,
      headers: {
        "content-type": file.mime,
        "content-length": String(file.bytes.length),
        "content-disposition": `${download ? "attachment" : "inline"}; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
        "content-security-policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
