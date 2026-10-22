import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PersistenceNotice } from "@/components/auth/persistence-notice";
import { SignupForm } from "@/components/auth/signup-form";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a free PARIKSHAN account and start organizing your health records.",
  robots: { index: false, follow: false },
};

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  return (
    <>
      <PersistenceNotice />
      <SignupForm />
    </>
  );
}
