import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PARIKSHAN — Personal Health Intelligence",
    short_name: "PARIKSHAN",
    description:
      "Organize medical records, understand lab reports, track trends, and ask grounded health questions.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#07111f",
    theme_color: "#07111f",
    lang: "en",
    categories: ["health", "medical", "productivity"],
    icons: [],
  };
}
