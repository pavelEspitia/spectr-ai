import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@spectr-ai/engine"],
  allowedDevOrigins: ["172.30.19.32"],
};

export default nextConfig;
