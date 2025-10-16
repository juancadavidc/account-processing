import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Enable logging for API routes in development
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  // Ensure API routes logs are visible
  experimental: {
    logging: {
      level: 'verbose',
      fullUrl: true,
    },
  },
};

export default nextConfig;
