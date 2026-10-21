import type { Metadata } from "next";
import {
  Activity,
  BrainCircuit,
  Download,
  FileText,
  History as HistoryIcon,
  Info,
  LogIn,
  LogOut,
  MessageSquareHeart,
  Pill,
  ShieldPlus,
  UserPlus,
  Users,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/misc";
import { getDashboardContext } from "@/server/dashboard/context";
import { getStore } from "@/server/db";
import { formatDateTime } from "@/lib/format";
import type { MessageKey, Translate } from "@/i18n";

export const metadata: Metadata = {
  title: "Activity history",
  robots: { index: false, follow: false },
};

const ACTION_META: Record<
  string,
  { icon: typeof FileText; key?: MessageKey; tone: string }
> = {
  signup: { icon: UserPlus, key: "history.event.signup", tone: "text-success" },
  login: { icon: LogIn, key: "history.event.login", tone: "text-azure" },
  logout: { icon: LogOut, key: "history.event.logout", tone: "text-faint" },
  "document.uploaded": { icon: FileText, key: "history.event.document.uploaded", tone: "text-accent" },
  "document.processed": { icon: FileText, key: "history.event.document.processed", tone: "text-accent" },
  "document.failed": { icon: FileText, key: "history.event.document.processed", tone: "text-warning" },
  "document.deleted": { icon: FileText, key: "history.event.document.deleted", tone: "text-danger" },
  "document.summary.generated": { icon: BrainCircuit, key: "history.event.document.processed", tone: "text-accent" },
  "observation.confirmed": { icon: Activity, key: "history.event.observation.confirmed", tone: "text-success" },
  "observation.manual": { icon: Activity, key: "history.event.observation.manual", tone: "text-accent" },
  "observation.updated": { icon: Activity, key: "history.event.observation.confirmed", tone: "text-accent" },
  "observation.deleted": { icon: Activity, key: "history.event.observation.manual", tone: "text-danger" },
  "medication.created": { icon: Pill, key: "history.event.medication.created", tone: "text-accent" },
  "medication.updated": { icon: Pill, key: "history.event.medication.updated", tone: "text-accent" },
  "medication.deleted": { icon: Pill, key: "history.event.medication.deleted", tone: "text-danger" },
  "interaction.checked": { icon: ShieldPlus, key: "history.event.interaction.checked", tone: "text-azure" },
  "assistant.asked": { icon: BrainCircuit, key: "history.event.assistant.asked", tone: "text-accent" },
  "assistant.conversation_deleted": { icon: BrainCircuit, key: "history.event.assistant.asked", tone: "text-danger" },
  "profile.created": { icon: Users, key: "history.event.profile.created", tone: "text-accent" },
  "profile.updated": { icon: Users, key: "history.event.profile.updated", tone: "text-accent" },
  "profile.deleted": { icon: Users, key: "history.event.profile.deleted", tone: "text-danger" },
  "feedback.submitted": { icon: MessageSquareHeart, key: "history.event.feedback.submitted", tone: "text-accent" },
  "data.exported": { icon: Download, key: "history.event.data.exported", tone: "text-azure" },
  "fhir.exported": { icon: Download, key: "history.event.data.exported", tone: "text-azure" },
  "account.updated": { icon: Info, key: "history.event.profile.updated", tone: "text-faint" },
  "password.reset_requested": { icon: Info, key: "history.event.login", tone: "text-warning" },
  "password.reset_completed": { icon: Info, key: "history.event.login", tone: "text-warning" },
};

function actionLabel(action: string, t: Translate): string {
  const meta = ACTION_META[action];
  if (meta?.key) return t(meta.key);
  return action.replace(/[._]/g, " ");
}

export default async function HistoryPage() {
  const { user, t, locale } = await getDashboardContext();
  const store = await getStore();
  const events = await store.listAudit(user.id, 100);

  const grouped = new Map<string, typeof events>();
  for (const event of events) {
    const day = event.createdAt.toISOString().slice(0, 10);
    const bucket = grouped.get(day) ?? [];
    bucket.push(event);
    grouped.set(day, bucket);
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("history.title")} description={t("history.subtitle")} />

      {events.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon className="size-5" aria-hidden />}
          title={t("history.empty")}
          description="Uploading a document, adding a medication, or asking the assistant will appear here."
        />
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([day, dayEvents]) => (
            <section key={day}>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">
                {new Date(`${day}T00:00:00Z`).toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              </h2>
              <ol className="relative space-y-0 border-l border-line pl-5">
                {dayEvents.map((event) => {
                  const meta = ACTION_META[event.action] ?? {
                    icon: Info,
                    tone: "text-faint",
                  };
                  const Icon = meta.icon;
                  return (
                    <li key={event.id} className="relative py-2.5">
                      <span className="absolute -left-[1.72rem] top-3 flex size-6 items-center justify-center rounded-full border border-line bg-base">
                        <Icon className={`size-3 ${meta.tone}`} aria-hidden />
                      </span>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-[13px] text-ink">{actionLabel(event.action, t)}</p>
                        <time className="font-mono text-[10px] text-faint" dateTime={event.createdAt.toISOString()}>
                          {formatDateTime(event.createdAt, locale)}
                        </time>
                      </div>
                      {event.entity && (
                        <p className="mt-0.5 text-[11px] text-faint">
                          {event.entity}
                          {event.entityId ? ` · ${event.entityId.slice(0, 8)}…` : ""}
                          {typeof event.meta?.count === "number" ? ` · ${event.meta.count} value(s)` : ""}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}

      <p className="rounded-xl border border-line bg-panel/40 px-4 py-3 text-[11px] leading-relaxed text-faint">
        Audit events contain action metadata only — never document contents. Deleting your account
        removes these events as well.
      </p>
    </div>
  );
}
