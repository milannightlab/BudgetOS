import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully dynamic auth/workspace app — skip Cache Components PPR constraints.
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
