import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* ZUVO is a fully dynamic marketplace (sessions, carts, live inventory):
     classic rendering mode — every route renders per request. */
  cacheComponents: false,
  /* Ship the pre-seeded SQLite bundle with serverless functions so
     instrumentation.ts can copy it to /tmp on first boot (Vercel). */
  outputFileTracingIncludes: {
    "/*": ["./prisma/seed.db"],
  },
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
