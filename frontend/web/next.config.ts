import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    optimizePackageImports: ["lucide-react"],
    // Egress must hydrate without depending on the development React debug stream.
    reactDebugChannel: false,
  },
  images: {
    remotePatterns: [
      ...(process.env.NEXT_PUBLIC_ASSET_HOST
        ? [{ protocol: "https" as const, hostname: process.env.NEXT_PUBLIC_ASSET_HOST }]
        : []),
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
