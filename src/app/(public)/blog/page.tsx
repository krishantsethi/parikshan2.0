import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";
import { MarketingSection, PageHero } from "@/components/marketing/page-hero";
import { Badge } from "@/components/ui/badge";
import { ARTICLES, ARTICLE_CATEGORIES, articleWordCount } from "@/content/articles";
import { formatDate, readingTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Original, conservative health-education articles on reading lab reports, reference ranges, medication lists, and HbA1c — with sources.",
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const activeCategory = ARTICLE_CATEGORIES.includes(params.category as (typeof ARTICLE_CATEGORIES)[number])
    ? (params.category as string)
    : "All";

  const articles = ARTICLES.filter(
    (article) => activeCategory === "All" || article.category === activeCategory,
  ).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  return (
    <>
      <PageHero
        eyebrow="Health education"
        title="Understand the numbers. Not just what they say."
        description="Original articles written to be conservative and useful — every one lists its sources and states whether a clinician reviewed it."
        badge="No copied content"
      />
      <MarketingSection>
        <div className="flex flex-wrap gap-2">
          {["All", ...ARTICLE_CATEGORIES].map((category) => (
            <Link
              key={category}
              href={category === "All" ? "/blog" : `/blog?category=${encodeURIComponent(category)}`}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                activeCategory === category
                  ? "border-accent/40 bg-accent-dim text-accent"
                  : "border-line text-muted hover:border-line-strong hover:text-ink",
              )}
              aria-current={activeCategory === category ? "page" : undefined}
            >
              {category}
            </Link>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              className="group panel flex h-full flex-col p-5 transition-all hover:-translate-y-0.5 hover:border-line-strong"
            >
              <div className="flex items-center justify-between gap-3">
                <Badge tone="azure">{article.category}</Badge>
                <span className="flex items-center gap-1 text-[11px] text-faint">
                  <Clock className="size-3" aria-hidden />
                  {readingTime(articleWordCount(article))} min
                </span>
              </div>
              <h2 className="mt-4 text-base font-semibold leading-snug text-ink group-hover:text-accent">
                {article.title}
              </h2>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted">{article.excerpt}</p>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[11px] text-faint">
                <span>{formatDate(article.publishedAt)}</span>
                <span className="flex items-center gap-1 text-accent">
                  Read <ArrowUpRight className="size-3" aria-hidden />
                </span>
              </div>
            </Link>
          ))}
        </div>

        {articles.length === 0 && (
          <p className="mt-8 text-sm text-muted">No articles in this category yet.</p>
        )}

        <p className="mt-10 rounded-xl border border-line bg-panel/40 px-4 py-3 text-xs leading-relaxed text-faint">
          Educational content only. Articles are written by the PARIKSHAN engineering team and are not
          reviewed by a licensed clinician unless stated on the article. They do not replace advice
          from your healthcare provider.
        </p>
      </MarketingSection>
    </>
  );
}
