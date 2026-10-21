import { getConfig } from "@/lib/env";
import { ApiError, requireUserApi, requireOwnedProfile } from "@/server/auth/guard";
import { enforceRateLimit, handleApiError, jsonOk } from "@/server/api/http";
import { createAndProcessDocument } from "@/server/documents/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const user = await requireUserApi();
    enforceRateLimit(request, "document-upload", { max: 10, windowSeconds: 300 });
    const cfg = getConfig();

    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > cfg.uploadMaxBytes + 1024 * 1024) {
      throw new ApiError(
        413,
        `File exceeds the ${Math.round(cfg.uploadMaxBytes / (1024 * 1024))} MB limit.`,
        "file_too_large",
      );
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new ApiError(400, "Upload must be sent as multipart form data.", "invalid_form");
    }

    const file = form.get("file");
    const profileId = form.get("profileId");
    if (!(file instanceof File)) {
      throw new ApiError(400, "No file was included in the upload.", "missing_file");
    }
    if (typeof profileId !== "string" || profileId.length === 0) {
      throw new ApiError(400, "A profile must be selected for the upload.", "missing_profile");
    }

    const profile = await requireOwnedProfile(user.id, profileId);
    const bytes = new Uint8Array(await file.arrayBuffer());

    const result = await createAndProcessDocument({
      user,
      profile,
      filename: file.name || "document",
      declaredType: file.type,
      bytes,
    });

    return jsonOk(
      {
        document: {
          id: result.document.id,
          title: result.document.title,
          status: result.document.status,
          category: result.document.category,
          errorMessage: result.document.errorMessage,
        },
        processing: result.processed
          ? {
              engine: result.processed.engine,
              confidence: result.processed.confidence,
              pages: result.processed.pages,
              resultsFound: result.processed.lab.results.length,
              medicationsFound: result.processed.medications.length,
              warnings: result.processed.warnings,
            }
          : null,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
