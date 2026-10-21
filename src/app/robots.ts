import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Never index authenticated areas or APIs.
        disallow: ["/dashboard", "/dashboard/", "/api/", "/login", "/signup", "/onboarding", "/reset-password", "/forgot-password"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
