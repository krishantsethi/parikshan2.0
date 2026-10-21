import { getConfig } from "@/lib/env";

/**
 * AI provider abstraction.
 *
 * Ships with an OpenAI-compatible chat-completions client (works with OpenAI,
 * Azure OpenAI gateways, OpenRouter, and local OpenAI-compatible servers).
 * Swapping providers means implementing this interface only.
 *
 * If no key is configured the app NEVER fabricates AI output: callers check
 * `isConfigured()` and fall back to deterministic, record-grounded answers
 * that are clearly labeled as such.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface CompletionResult {
  text: string;
  model: string;
}

export interface AiProvider {
  readonly id: string;
  isConfigured(): boolean;
  complete(messages: ChatMessage[], options?: CompletionOptions): Promise<CompletionResult>;
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI provider is not configured on this deployment.");
  }
}

export class AiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number | null = null,
  ) {
    super(message);
  }
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: unknown } }>;
  model?: string;
  error?: { message?: unknown };
}

export class OpenAICompatibleProvider implements AiProvider {
  readonly id = "openai-compatible";

  isConfigured(): boolean {
    return getConfig().ai.enabled;
  }

  async complete(messages: ChatMessage[], options: CompletionOptions = {}): Promise<CompletionResult> {
    const cfg = getConfig();
    if (!cfg.ai.apiKey) throw new AiNotConfiguredError();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 45_000);

    try {
      const response = await fetch(`${cfg.ai.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${cfg.ai.apiKey}`,
        },
        body: JSON.stringify({
          model: cfg.ai.model,
          messages,
          temperature: options.temperature ?? 0.2,
          max_tokens: options.maxTokens ?? cfg.ai.maxTokens,
        }),
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        // Never surface provider response bodies (they can contain account
        // details); status is enough for the UI and logs.
        throw new AiRequestError(
          response.status === 401
            ? "AI provider rejected the configured credentials."
            : response.status === 429
              ? "AI provider is rate-limiting requests. Try again shortly."
              : `AI provider returned HTTP ${response.status}.`,
          response.status,
        );
      }

      const body = (await response.json()) as ChatCompletionResponse;
      const content = body.choices?.[0]?.message?.content;
      if (typeof content !== "string" || content.trim().length === 0) {
        throw new AiRequestError("AI provider returned an empty response.", response.status);
      }
      return { text: content.trim(), model: body.model ?? cfg.ai.model };
    } catch (error) {
      if (error instanceof AiRequestError || error instanceof AiNotConfiguredError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new AiRequestError("AI provider request timed out.", null);
      }
      throw new AiRequestError(
        `AI request failed: ${error instanceof Error ? error.message : "unknown error"}`,
        null,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function getAiProvider(): AiProvider {
  return new OpenAICompatibleProvider();
}

/** Strip fences/leading labels models sometimes add; caps runaway output. */
export function sanitizeModelText(text: string, maxChars = 8000): string {
  let out = text.trim();
  out = out.replace(/^```(?:markdown|md|text)?\s*/i, "").replace(/\s*```$/i, "");
  return out.slice(0, maxChars).trim();
}
