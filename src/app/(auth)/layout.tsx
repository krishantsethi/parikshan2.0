import type { ReactNode } from "react";
import Link from "next/link";
import { BrainCircuit, FileScan, ShieldCheck } from "lucide-react";
import { Wordmark } from "@/components/brand/logo";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-backdrop min-h-dvh lg:grid lg:grid-cols-[1.02fr_0.98fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-line p-10 lg:flex lg:p-14">
        <div className="absolute inset-0 grid-overlay opacity-60" aria-hidden />
        <div
          className="absolute -left-24 top-1/3 size-[30rem] rounded-full bg-[radial-gradient(circle,rgba(66,232,245,0.12),transparent_65%)]"
          aria-hidden
        />
        <div className="relative">
          <Link href="/" aria-label="PARIKSHAN home">
            <Wordmark size={30} showTagline />
          </Link>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-ink">
            Your records. Understood.{" "}
            <span className="text-gradient">On your terms.</span>
          </h2>
          <ul className="mt-8 space-y-5">
            {[
              {
                icon: FileScan,
                title: "Extraction you can verify",
                body: "Every value keeps its unit, printed reference range, and source line.",
              },
              {
                icon: BrainCircuit,
                title: "Grounded answers only",
                body: "The assistant cites your documents — and says when it doesn't know.",
              },
              {
                icon: ShieldCheck,
                title: "Private by architecture",
                body: "Ownership checks, hashed sessions, and export/delete built in.",
              },
            ].map((item) => (
              <li key={item.title} className="flex gap-3">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-accent-dim">
                  <item.icon className="size-4 text-accent" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative max-w-sm text-[11px] leading-relaxed text-faint">
          PARIKSHAN is not a medical device and does not provide diagnosis or treatment. Always consult
          a qualified healthcare professional.
        </p>
      </aside>

      <main className="relative flex min-h-dvh flex-col">
        <div className="flex items-center justify-between p-5 lg:justify-end lg:p-6">
          <Link href="/" className="lg:hidden" aria-label="PARIKSHAN home">
            <Wordmark size={24} />
          </Link>
          <div className="flex items-center gap-2">
            <LocaleSwitcher compact />
            <ThemeToggle />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-16 pt-4">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  );
}
