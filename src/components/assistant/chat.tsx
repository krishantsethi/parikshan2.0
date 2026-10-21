"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowUp,
  BrainCircuit,
  FileText,
  Loader2,
  MessageSquarePlus,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { useT } from "@/components/providers/locale-provider";
import { useToast } from "@/components/providers/toast-provider";
import { cn } from "@/lib/utils";
import type { Citation } from "@/types/domain";
import type { Locale } from "@/types/domain";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  grounded: boolean;
  provider: string | null;
  error: string | null;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

/** Safe minimal markdown-ish renderer: paragraphs + bullet lists, no HTML. */
function MessageBody({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/);
  return (
    <div className="space-y-2.5 text-[13.5px] leading-relaxed">
      {blocks.map((block, index) => {
        const lines = block.split("\n");
        const isList = lines.every((line) => /^\s*[-•*]\s+/.test(line)) && lines.length > 0;
        if (isList) {
          return (
            <ul key={index} className="list-disc space-y-1 pl-4">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{line.replace(/^\s*[-•*]\s+/, "")}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index} className="whitespace-pre-wrap">
            {block}
          </p>
        );
      })}
    </div>
  );
}

export function AssistantChat({
  profileId,
  profileName,
  initialMessages,
  conversations,
  initialConversationId,
  aiConfigured,
  recordCount,
  locale,
}: {
  profileId: string;
  profileName: string;
  initialMessages: ChatMessage[];
  conversations: ConversationSummary[];
  initialConversationId: string | null;
  aiConfigured: boolean;
  recordCount: number;
  locale: Locale;
}) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  useEffect(() => {
    setMessages(initialMessages);
    setConversationId(initialConversationId);
  }, [initialMessages, initialConversationId]);

  async function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed || pending) return;
    setError(null);
    setInput("");
    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: trimmed,
      citations: [],
      grounded: false,
      provider: null,
      error: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setPending(true);

    try {
      const response = await fetch("/api/assistant/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          conversationId: conversationId ?? undefined,
          profileId,
          locale,
        }),
      });
      const data = (await response.json()) as {
        conversationId?: string;
        message?: ChatMessage;
        error?: string;
      };
      if (!response.ok || !data.message) throw new Error(data.error ?? t("state.error.title"));
      if (data.conversationId && data.conversationId !== conversationId) {
        setConversationId(data.conversationId);
        window.history.replaceState(null, "", `/dashboard/assistant?c=${data.conversationId}`);
        router.refresh();
      }
      setMessages((prev) => [...prev, data.message!]);
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : t("state.error.title");
      setError(message);
      setMessages((prev) => prev.filter((entry) => entry.id !== optimistic.id));
      setInput(trimmed);
    } finally {
      setPending(false);
      textareaRef.current?.focus();
    }
  }

  async function deleteConversation(id: string) {
    if (!window.confirm("Delete this conversation? Its messages will be removed permanently.")) return;
    const response = await fetch(`/api/assistant/conversations/${id}`, { method: "DELETE" });
    if (response.ok) {
      toast({ title: "Conversation deleted", variant: "success" });
      if (id === conversationId) {
        setMessages([]);
        setConversationId(null);
        window.history.replaceState(null, "", "/dashboard/assistant");
      }
      router.refresh();
    } else {
      toast({ title: "Could not delete the conversation", variant: "error" });
    }
  }

  const suggestions = [t("assistant.suggestion1"), t("assistant.suggestion2"), t("assistant.suggestion3")];

  return (
    <div className="grid gap-4 lg:grid-cols-[230px_1fr]">
      {/* conversations */}
      <aside className="panel order-2 h-fit p-2.5 lg:order-1">
        <ButtonLink
          href="/dashboard/assistant"
          variant="secondary"
          size="sm"
          fullWidth
          className="mb-2"
          icon={<MessageSquarePlus className="size-3.5" />}
        >
          {t("assistant.newChat")}
        </ButtonLink>
        <p className="px-2 py-1 text-[10px] uppercase tracking-wider text-faint">
          {t("assistant.conversations")}
        </p>
        <ul className="max-h-64 space-y-0.5 overflow-y-auto lg:max-h-[50vh]">
          {conversations.length === 0 && (
            <li className="px-2 py-1.5 text-[11px] text-faint">{t("assistant.empty")}</li>
          )}
          {conversations.map((conversation) => (
            <li key={conversation.id} className="group flex items-center gap-1">
              <Link
                href={`/dashboard/assistant?c=${conversation.id}`}
                className={cn(
                  "min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-[12px] transition-colors",
                  conversation.id === conversationId
                    ? "bg-accent-dim text-ink"
                    : "text-muted hover:bg-panel hover:text-ink",
                )}
                aria-current={conversation.id === conversationId ? "page" : undefined}
              >
                {conversation.title}
              </Link>
              <button
                type="button"
                onClick={() => deleteConversation(conversation.id)}
                className="rounded p-1 text-faint opacity-0 transition-opacity hover:text-danger focus:opacity-100 group-hover:opacity-100"
                aria-label={`Delete conversation ${conversation.title}`}
              >
                <Trash2 className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* chat */}
      <div className="order-1 flex min-h-[560px] flex-col lg:order-2">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted">
            <BrainCircuit className="size-3.5 text-accent" aria-hidden />
            {t("assistant.grounding")}: <span className="text-ink">{profileName}</span>
            <Badge tone={recordCount > 0 ? "success" : "warning"}>
              {recordCount} record{recordCount === 1 ? "" : "s"}
            </Badge>
          </div>
          <Badge tone={aiConfigured ? "accent" : "warning"}>
            {aiConfigured ? "AI provider configured" : "Deterministic mode"}
          </Badge>
        </div>

        {!aiConfigured && (
          <Alert tone="warning" className="mb-3" title="AI provider not configured">
            {t("assistant.notConfigured")}
          </Alert>
        )}

        <div
          ref={scrollRef}
          className="panel min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
          aria-live="polite"
          aria-label="Conversation"
        >
          {messages.length === 0 && !pending && (
            <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
              <div className="flex size-12 items-center justify-center rounded-full border border-accent/25 bg-accent-dim">
                <Sparkles className="size-5 text-accent" aria-hidden />
              </div>
              <h2 className="mt-4 text-sm font-semibold text-ink">{t("assistant.title")}</h2>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">{t("assistant.subtitle")}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => send(suggestion)}
                    className="rounded-full border border-line px-3 py-1.5 text-[11px] text-muted transition-colors hover:border-accent/40 hover:text-ink"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn("flex gap-2.5", message.role === "user" && "flex-row-reverse")}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border",
                  message.role === "assistant"
                    ? "border-accent/25 bg-accent-dim text-accent"
                    : "border-line bg-panel-raised text-muted",
                )}
                aria-hidden
              >
                {message.role === "assistant" ? <Sparkles className="size-3.5" /> : <User className="size-3.5" />}
              </span>
              <div
                className={cn(
                  "max-w-[86%] rounded-2xl border px-4 py-3",
                  message.role === "assistant"
                    ? "rounded-bl-md border-accent/15 bg-accent-dim/50 text-ink"
                    : "rounded-br-md border-line bg-panel-raised text-ink",
                )}
              >
                <MessageBody content={message.content} />
                {message.citations.length > 0 && (
                  <div className="mt-3 border-t border-line/70 pt-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-faint">{t("assistant.citations")}</p>
                    <ul className="mt-1.5 space-y-1">
                      {message.citations.map((citation) => (
                        <li key={`${citation.kind}-${citation.id}`}>
                          {citation.kind === "document" ? (
                            <Link
                              href={`/dashboard/documents/${citation.id}`}
                              className="inline-flex items-start gap-1.5 text-[11px] text-accent hover:underline"
                            >
                              <FileText className="mt-0.5 size-3 shrink-0" aria-hidden />
                              <span>
                                {citation.label}
                                {citation.detail ? <span className="text-faint"> · {citation.detail}</span> : null}
                              </span>
                            </Link>
                          ) : (
                            <span className="inline-flex items-start gap-1.5 text-[11px] text-muted">
                              <FileText className="mt-0.5 size-3 shrink-0 text-faint" aria-hidden />
                              <span>
                                {citation.label}
                                {citation.detail ? <span className="text-faint"> · {citation.detail}</span> : null}
                              </span>
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {message.error === "ai_request_failed" && (
                  <p className="mt-2 text-[10px] text-warning">
                    AI request failed — this is a record digest, not a generated answer.
                  </p>
                )}
                {message.provider === null && message.role === "assistant" && !message.error && (
                  <p className="mt-2 text-[10px] text-faint">{t("common.notMedicalAdvice")}</p>
                )}
              </div>
            </div>
          ))}

          {pending && (
            <div className="flex items-center gap-2.5 text-xs text-muted">
              <span className="flex size-7 items-center justify-center rounded-full border border-accent/25 bg-accent-dim">
                <Loader2 className="size-3.5 animate-spin text-accent" aria-hidden />
              </span>
              {t("assistant.thinking")}
            </div>
          )}
        </div>

        {error && (
          <Alert tone="danger" className="mt-3" title="Message not sent">
            {error}
          </Alert>
        )}

        <form
          className="mt-3"
          onSubmit={(event) => {
            event.preventDefault();
            void send(input);
          }}
        >
          <div className="panel flex items-end gap-2 p-2">
            <label htmlFor="assistant-input" className="sr-only">
              {t("assistant.placeholder")}
            </label>
            <textarea
              id="assistant-input"
              ref={textareaRef}
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                event.target.style.height = "auto";
                event.target.style.height = `${Math.min(event.target.scrollHeight, 140)}px`;
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder={t("assistant.placeholder")}
              className="max-h-36 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-ink placeholder:text-faint focus:outline-none"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || pending}
              aria-label={t("assistant.send")}
              className="shrink-0"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
            </Button>
          </div>
        </form>
        <p className="mt-2 text-center text-[10px] leading-relaxed text-faint">{t("assistant.safety")}</p>
      </div>
    </div>
  );
}
