import Link from "next/link";
import { Compass } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="app-backdrop flex min-h-dvh flex-col items-center justify-center px-5 text-center">
      <div className="absolute inset-0 grid-overlay opacity-40" aria-hidden />
      <div className="relative">
        <LogoMark size={44} className="mx-auto" />
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-faint">Error 404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Page not found</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
          The page you're looking for doesn't exist or has moved. If you followed a link from a
          document, the record may have been deleted.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/" icon={<Compass className="size-4" />}>
            Go home
          </ButtonLink>
          <ButtonLink href="/dashboard" variant="secondary">
            Open dashboard
          </ButtonLink>
        </div>
        <p className="mt-8 text-[11px] text-faint">
          Need help?{" "}
          <Link href="/contact" className="text-accent hover:underline">
            Contact the team
          </Link>
        </p>
      </div>
    </div>
  );
}
