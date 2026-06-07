import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // jsdom (used by isomorphic-dompurify) relies on dynamic `require()` calls
  // that the production bundler mangles — keep it external so Node resolves
  // it natively at runtime instead.
  serverExternalPackages: ["isomorphic-dompurify", "jsdom"],
};

export default nextConfig;
