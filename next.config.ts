import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // ExcelJS optionally depends on canvas (for image rendering) which requires
    // native binaries unavailable in Vercel's serverless environment.
    // Marking it external prevents the build from trying to bundle it.
    config.externals = [...(config.externals ?? []), "canvas"];
    return config;
  },
};

export default nextConfig;
