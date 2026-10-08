import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "My NBA",
    short_name: "My NBA",
    description: "NBA fantasy decisions, player performance and payroll",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#06132b",
    theme_color: "#06132b",
    icons: [
      {
        src: "/app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
