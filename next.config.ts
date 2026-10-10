import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* ZUVO is a fully dynamic marketplace (sessions, carts, live inventory):
     classic rendering mode — every route renders per request. */
  cacheComponents: false,
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
