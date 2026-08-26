import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent webpack from bundling these packages so they run as native Node.js
  // CJS modules in serverless functions. xlsx in particular reads binary data
  // using typed-array operations that break when bundled/transpiled by webpack.
  serverExternalPackages: ["xlsx"],
};

export default nextConfig;
