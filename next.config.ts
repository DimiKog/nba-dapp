import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "mybackend.dimikog.org",
        pathname: "/photos/**",
      },
    ],
  },
};

export default nextConfig;
