# AI layer

## Provider abstraction

`src/server/ai/provider.ts` implements an OpenAI-compatible chat-completions client:

- `OPENAI_API_KEY` (server only) enables AI features.
- `OPENAI_BASE_URL` and `AI_MODEL` select the endpoint/model (works with OpenAI, gateways such as OpenRouter, and local OpenAI-compatible servers).
- Requests time out at 45 s; provider error bodies are never surfaced (status codes are mapped to safe messages).
- Swapping providers means implementing `AiProvider` (`isConfigured`, `complete`) only.

**Without a key, no AI call is attempted.** The assistant returns a deterministic digest of retrieved records and says AI is not configured. Report pages show a deterministic digest labeled “Structured digest (no AI configured)”.

## Grounding contract

The system prompt (`src/server/ai/prompts.ts`) enforces:

1. Every personal claim must cite a provided source tag (`[S1]`). Invented tags are dropped by `extractCitations` before display.
2. If the records do not contain the answer, say so and suggest what record would help.
3. Never diagnose, rule out a condition, or advise starting/stopping/changing medication.
4. General education must be labeled as general.
5. Emergency language triggers an immediate advisory (also enforced outside the model, so it cannot be prompted away).
6. End with a short “educational information, not medical advice” line.

## Retrieval design

`retrieveAssistantContext` (no vector DB):

1. Load documents (25), observations (300), active medications for **the selected profile only**.
2. Token-overlap scoring against test names/document titles/categories + recency bonus.
3. Always include active medications (max 15); include the top 12 observations and up to 4 documents; source text excerpts (1.8k chars) only for cited documents.
4. Compose numbered sources with provenance (date, verified status, from-document vs manual).
5. Pass the context block + last 6 messages to the model.

This is intentionally simple and inspectable. Every claim can be traced to a source object stored with the message.

## Report explanations

`generateDocumentExplanation` sends the document text (truncated to 12k chars) and the machine-extracted values, asking for: SUMMARY, KEY RESULTS (exact units/ranges), TERMS EXPLAINED, QUESTIONS FOR YOUR CLINICIAN, UNCERTAINTY. It is user-triggered from the document page (never automatic) and can be regenerated.

## Safety and failure behavior

| Situation | Behavior |
| --- | --- |
| No API key | deterministic record digest, explicitly labeled; no fabrication |
| Provider error / timeout | error note + deterministic fallback with retrieved sources; `error` recorded on the message |
| No records for the profile | honest “no records” answer, no citation |
| Emergency keywords | emergency guidance prepended before any answer |
| Model cites an unknown tag | tag dropped from UI citations |
| Low OCR confidence | surfaced on the document and in extraction warnings before AI is involved |

## Cost & privacy controls

- AI calls are rate-limited per IP (20 / 5 min) and per document regeneration (8 / 5 min).
- Only excerpts needed for the specific request are sent; conversations are stored in your own database.
- No training, fine-tuning, embeddings, or analytics pipelines exist in this repository.

## Not implemented

- Streaming responses (answers arrive complete).
- Multi-turn tool use / function calling.
- Medical reference retrieval (e.g., curated guidelines) — the assistant can only ground in user records; general knowledge comes from the model and is labeled as general.
- Automated prompt-injection evaluation suite.
