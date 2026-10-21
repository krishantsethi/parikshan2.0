import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Clock, ExternalLink, ShieldAlert } from "lucide-react";
import { ArticleBody } from "@/components/marketing/article-body";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ARTICLES, articleWordCount, getArticle } from "@/content/articles";
import { formatDate, readingTime } from "@/lib/format";

export function generateStaticParams() {
  return ARTICLES.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "Article not found" };
  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      publishedTime: article.publishedAt,
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const related = ARTICLES.filter(
    (candidate) => candidate.slug !== article.slug && candidate.category === article.category,
  ).slice(0, 2);

  return (
    <article className="mx-auto max-w-3xl px-5 py-14 lg:px-8 lg:py-20">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        All articles
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Badge tone="azure">{article.category}</Badge>
        <span className="text-xs text-faint">{formatDate(article.publishedAt)}</span>
        <span className="flex items-center gap-1 text-xs text-faint">
          <Clock className="size-3" aria-hidden />
          {readingTime(articleWordCount(article))} min read
        </span>
      </div>

      <h1 className="mt-4 text-balance text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
        {article.title}
      </h1>
      <p className="mt-4 text-pretty text-base leading-relaxed text-muted">{article.excerpt}</p>

      <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-warning/25 bg-warning-dim px-4 py-3 text-xs leading-relaxed text-muted">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        <span>{article.reviewNote} This is educational information, not medical advice.</span>
      </div>

      <div className="mt-10">
        <ArticleBody blocks={article.body} />
      </div>

      <section className="mt-12 rounded-[var(--radius-card)] border border-line bg-panel/40 p-5">
        <h2 className="text-sm font-semibold text-ink">Sources & further reading</h2>
        <p className="mt-1 text-xs text-faint">
          External links open the source organisation's page. PARIKSHAN is not affiliated with them.
        </p>
        <ul className="mt-3 space-y-2">
          {article.sources.map((source) => (
            <li key={source.url}>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
              >
                {source.label}
                <ExternalLink className="size-3" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </section>

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold text-ink">Related reading</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {related.map((item) => (
              <Link
                key={item.slug}
                href={`/blog/${item.slug}`}
                className="panel group p-4 transition-colors hover:border-line-strong"
              >
                <p className="text-sm font-medium text-ink group-hover:text-accent">{item.title}</p>
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">{item.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
        <p className="text-xs text-faint">Want to see this applied to your own reports?</p>
        <ButtonLink href="/signup" size="sm" iconRight={<ArrowUpRight className="size-3.5" />}>
          Create a free account
        </ButtonLink>
      </div>
    </article>
  );
}
