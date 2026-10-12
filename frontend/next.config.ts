import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "same-origin" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ] }];
  },
  // The shared reference topology sits beside frontend and backend.
  turbopack: { root: path.resolve(process.cwd(), "..") },
  outputFileTracingRoot: path.resolve(process.cwd(), ".."),
  outputFileTracingExcludes: {
    "*": ["../.nexus-data/**/*", ".nexus-data/**/*", "../.git/**/*", "../backend/.env*"],
  },
};

export default nextConfig;
