import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { PersistenceNotice } from "@/components/auth/persistence-notice";
import { SkeletonText } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Log in",
  description: "Sign in to your private PARIKSHAN health workspace.",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <>
      <PersistenceNotice />
      <Suspense
        fallback={
          <div className="space-y-4">
            <SkeletonText lines={2} />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </>
  );
}
