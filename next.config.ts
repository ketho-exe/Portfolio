import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export keeps hosting free and portable (Cloudflare, Vercel, any static host).
  // See vault: 05 Development/Decisions.md (D-002).
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // cacheComponents (PPR) is incompatible with output: "export" in 16.4 — left off deliberately.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
