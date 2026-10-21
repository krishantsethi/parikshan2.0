import { getStore } from "@/server/db";
import { requireUserApi } from "@/server/auth/guard";
import { handleApiError } from "@/server/api/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_INLINE_FILE_BYTES = 1_500_000;

/**
 * Full data export (GDPR-style portability). Includes profiles, documents
 * (metadata + extracted text), observations, medications, interaction checks,
 * conversations and audit history. Binary files are embedded as base64 when
 * under 1.5 MB and otherwise referenced with a download path.
 */
export async function GET() {
  try {
    const user = await requireUserApi();
    const store = await getStore();
    const profiles = await store.listProfiles(user.id);

    const data: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      account: { id: user.id, name: user.name, email: user.email, locale: user.locale, theme: user.theme },
      storeKind: store.kind,
      profiles: [],
    };
    const profileExports: unknown[] = [];

    for (const profile of profiles) {
      const { items: documents, total } = await store.listDocuments({
        userId: user.id,
        profileId: profile.id,
        limit: 500,
      });
      const observations = await store.listObservations({
        userId: user.id,
        profileId: profile.id,
        limit: 2000,
      });
      const medications = await store.listMedications({ userId: user.id, profileId: profile.id });
      const interactionChecks = await store.listInteractionChecks(user.id, profile.id, 100);
      const conversations = await store.listConversations(user.id, profile.id);
      const conversationExports = [];
      for (const conversation of conversations) {
        conversationExports.push({
          conversation,
          messages: await store.listMessages(conversation.id, 200),
        });
      }

      const documentExports = [];
      for (const doc of documents) {
        const text = await store.getDocumentText(doc.id);
        const file = await store.getFile(doc.id);
        documentExports.push({
          document: doc,
          extractedText: text?.text ?? null,
          originalFile:
            file && file.bytes.length <= MAX_INLINE_FILE_BYTES
              ? {
                  mime: file.mime,
                  bytesBase64: Buffer.from(file.bytes).toString("base64"),
                }
              : file
                ? {
                    mime: file.mime,
                    sizeBytes: file.bytes.length,
                    note: "Binary omitted from this export because it exceeds 1.5 MB. Download it from the document page.",
                  }
                : null,
        });
      }

      profileExports.push({
        profile,
        documentCount: total,
        documents: documentExports,
        observations,
        medications,
        interactionChecks,
        conversations: conversationExports,
      });
    }
    data.profiles = profileExports;
    data.auditEvents = await store.listAudit(user.id, 1000);

    await store.logAudit({
      userId: user.id,
      action: "data.exported",
      entity: "user",
      entityId: user.id,
    });

    const filename = `parikshan-export-${new Date().toISOString().slice(0, 10)}.json`;
    return new Response(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
