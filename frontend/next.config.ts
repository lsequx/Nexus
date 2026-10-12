import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // The shared reference topology sits beside frontend and backend.
  turbopack: { root: path.resolve(process.cwd(), "..") },
  outputFileTracingRoot: path.resolve(process.cwd(), ".."),
  outputFileTracingExcludes: {
    "*": ["../.nexus-data/**/*", ".nexus-data/**/*", "../.git/**/*", "../backend/.env*"],
  },
};

export default nextConfig;
