import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Existing config options */
  eslint: {
    // Allow production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
