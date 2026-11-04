import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["tesseract.js", "sharp", "heic-convert"],
  poweredByHeader: false,
  // Skew protection: a page left open across a deploy hard-reloads instead of loading the old build's scripts.
  deploymentId: process.env.RENDER_GIT_COMMIT || undefined,
  devIndicators: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "60mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
