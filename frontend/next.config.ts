import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/trustwallet/assets/master/blockchains/**",
      },
      {
        protocol: "https",
        hostname: "assets.coingecko.com",
        pathname: "/coins/images/**",
      },
      {
        protocol: "https",
        hostname: "icons.llama.fi",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "li.fi",
        pathname: "/assets/branding/**",
      },
    ],
  },
};

export default nextConfig;
