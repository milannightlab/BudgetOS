import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully dynamic auth/workspace app — skip Cache Components PPR constraints.
  // Allow property photo uploads up to 5 MB (+ multipart overhead).
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
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
