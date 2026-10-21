import type { Metadata } from "next";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { PageHero } from "@/components/marketing/page-hero";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Feedback",
  description: "Share feedback about PARIKSHAN. Submissions are validated, rate-limited, and stored securely.",
};

export default async function PublicFeedbackPage() {
  const user = await getCurrentUser();
  return (
    <>
      <PageHero
        eyebrow="Feedback"
        title="Tell us what actually needs fixing."
        description="No surveys, no incentives, no fabricated testimonials. Just a direct line to the team that maintains this build."
      />
      <section className="mx-auto max-w-2xl px-5 py-14 lg:px-8">
        <div className="panel p-6">
          <FeedbackForm signedInAs={user?.email} />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-faint">
          Submissions are stored in the feedback table with optional account linkage. Rate limit: five
          submissions per fifteen minutes per IP address.
        </p>
      </section>
    </>
  );
}
