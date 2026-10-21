"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/providers/toast-provider";
import { useT } from "@/components/providers/locale-provider";
import type { MessageKey } from "@/i18n";
import { cn } from "@/lib/utils";

const CATEGORY_OPTIONS = [
  { value: "bug", labelKey: "feedback.category.bug" },
  { value: "feature", labelKey: "feedback.category.feature" },
  { value: "experience", labelKey: "feedback.category.experience" },
  { value: "other", labelKey: "feedback.category.other" },
] as const satisfies ReadonlyArray<{ value: string; labelKey: MessageKey }>;

export function FeedbackForm({ signedInAs }: { signedInAs?: string }) {
  const t = useT();
  const { toast } = useToast();
  const [category, setCategory] = useState("experience");
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (message.trim().length < 10) {
      setError(t("feedback.validation.message"));
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category,
          message: message.trim(),
          rating,
          email: email.trim() || undefined,
          name: name.trim() || undefined,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        if (response.status === 429) throw new Error(t("feedback.rateLimited"));
        throw new Error(data.error ?? t("state.error.title"));
      }
      setSubmitted(true);
      setMessage("");
      setRating(null);
      toast({ title: t("feedback.success"), variant: "success" });
    } catch (submitError) {
      const text = submitError instanceof Error ? submitError.message : t("state.error.title");
      setError(text);
      toast({ title: text, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {submitted && (
        <Alert tone="success" title={t("feedback.success")}>
          Feedback is stored in the secure feedback table and reviewed by the team.
        </Alert>
      )}

      <div>
        <span className="block text-xs font-medium uppercase tracking-wider text-muted" id="rating-label">
          {t("feedback.rating")} <span className="normal-case text-faint">(optional)</span>
        </span>
        <div className="mt-2 flex items-center gap-1.5" role="group" aria-labelledby="rating-label">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(rating === value ? null : value)}
              aria-label={`${value} out of 5`}
              aria-pressed={rating === value}
              className={cn(
                "rounded-md p-1 transition-transform hover:scale-110",
                rating && value <= rating ? "text-warning" : "text-faint hover:text-muted",
              )}
            >
              <Star className={cn("size-6", rating && value <= rating && "fill-current")} />
            </button>
          ))}
        </div>
      </div>

      <Select
        label={t("feedback.category")}
        value={category}
        onChange={(event) => setCategory(event.target.value)}
        options={CATEGORY_OPTIONS.map((option) => ({
          value: option.value,
          label: t(option.labelKey),
        }))}
      />

      <Textarea
        label={t("feedback.message")}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder={t("feedback.messagePlaceholder")}
        error={error}
        minLength={10}
        maxLength={5000}
        rows={5}
        required
      />

      {!signedInAs && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={`${t("common.name")} (${t("common.optional")})`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            maxLength={100}
          />
          <Input
            label={`${t("common.email")} (${t("common.optional")})`}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            maxLength={254}
            placeholder="you@example.com"
          />
        </div>
      )}
      {signedInAs && (
        <p className="text-xs text-faint">
          Submitting as <span className="text-muted">{signedInAs}</span>
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" loading={submitting}>
          {t("common.submit")}
        </Button>
        <p className="text-[11px] text-faint">Rate-limited to 5 submissions per 15 minutes.</p>
      </div>
    </form>
  );
}
