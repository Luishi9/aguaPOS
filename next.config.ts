import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", process.env.NEXTAUTH_URL ?? ""].filter(Boolean),
    },
  },
};

export default nextConfig;
