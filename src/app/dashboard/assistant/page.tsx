import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/misc";
import { AssistantChat, type ChatMessage, type ConversationSummary } from "@/components/assistant/chat";
import { getDashboardContext } from "@/server/dashboard/context";
import { getStore } from "@/server/db";

export const metadata: Metadata = {
  title: "AI assistant",
  robots: { index: false, follow: false },
};

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { user, activeProfile, t, locale, aiConfigured } = await getDashboardContext();
  const params = await searchParams;
  const store = await getStore();

  const conversations = await store.listConversations(user.id, activeProfile.id);
  const selected = params.c ? conversations.find((conversation) => conversation.id === params.c) : undefined;

  // If a conversation id was supplied but no longer exists (or belongs to
  // another profile), fall back to the list rather than leaking anything.
  if (params.c && !selected) redirect("/dashboard/assistant");

  const messages = selected ? await store.listMessages(selected.id, 100) : [];
  const [documentCount, observationCount, medicationCount] = await Promise.all([
    store.listDocuments({ userId: user.id, profileId: activeProfile.id, limit: 1 }),
    store.listObservations({ userId: user.id, profileId: activeProfile.id, limit: 1 }),
    store.listMedications({ userId: user.id, profileId: activeProfile.id, activeOnly: true }),
  ]);

  const chatMessages: ChatMessage[] = messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    citations: message.citations,
    grounded: message.grounded,
    provider: message.provider,
    error: message.error,
    createdAt: message.createdAt.toISOString(),
  }));

  const conversationSummaries: ConversationSummary[] = conversations.map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    updatedAt: conversation.updatedAt.toISOString(),
  }));

  const recordCount = documentCount.total + observationCount.length + medicationCount.length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={activeProfile.name}
        title={t("assistant.title")}
        description={t("assistant.subtitle")}
      />
      <AssistantChat
        profileId={activeProfile.id}
        profileName={activeProfile.name}
        initialMessages={chatMessages}
        conversations={conversationSummaries}
        initialConversationId={selected?.id ?? null}
        aiConfigured={aiConfigured}
        recordCount={recordCount}
        locale={locale}
      />
    </div>
  );
}
