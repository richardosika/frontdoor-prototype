import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["tesseract.js", "sharp", "heic-convert"],
  poweredByHeader: false,
  devIndicators: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
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
