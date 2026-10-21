import type { MetadataRoute } from "next";
import { ARTICLES } from "@/content/articles";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicRoutes: Array<{ path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }> = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/features", priority: 0.9, changeFrequency: "monthly" },
    { path: "/how-it-works", priority: 0.8, changeFrequency: "monthly" },
    { path: "/security", priority: 0.8, changeFrequency: "monthly" },
    { path: "/tools", priority: 0.8, changeFrequency: "monthly" },
    { path: "/resources", priority: 0.7, changeFrequency: "monthly" },
    { path: "/blog", priority: 0.7, changeFrequency: "weekly" },
    { path: "/about", priority: 0.6, changeFrequency: "yearly" },
    { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.5, changeFrequency: "yearly" },
    { path: "/feedback", priority: 0.4, changeFrequency: "yearly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/disclaimer", priority: 0.4, changeFrequency: "yearly" },
  ];

  return [
    ...publicRoutes.map((route) => ({
      url: `${baseUrl}${route.path}`,
      lastModified: new Date(),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...ARTICLES.map((article) => ({
      url: `${baseUrl}/blog/${article.slug}`,
      lastModified: new Date(article.publishedAt),
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
  ];
}
