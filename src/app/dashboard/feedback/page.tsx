import type { Metadata } from "next";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { PageHeader } from "@/components/ui/misc";
import { getDashboardContext } from "@/server/dashboard/context";

export const metadata: Metadata = {
  title: "Feedback",
  robots: { index: false, follow: false },
};

export default async function DashboardFeedbackPage() {
  const { user, t } = await getDashboardContext();
  return (
    <div className="space-y-6">
      <PageHeader title={t("feedback.title")} description={t("feedback.subtitle")} />
      <div className="panel max-w-2xl p-5">
        <FeedbackForm signedInAs={user.email} />
      </div>
      <p className="max-w-2xl text-[11px] leading-relaxed text-faint">
        Feedback is rate-limited (five submissions per fifteen minutes per IP) and validated
        server-side. It is never displayed publicly without explicit permission — this product does
        not publish testimonials.
      </p>
    </div>
  );
}
