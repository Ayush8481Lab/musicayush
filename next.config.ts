import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // Prevents Vercel image optimization limits
    remotePatterns:[
      {
        protocol: "https",
        hostname: "**", // Allows all image URLs (c.saavncdn.com, etc.)
      },
    ],
  },
  async rewrites() {
    return[
      {
        source: "/api/jiosaavn",
        destination: "https://www.jiosaavn.com/api.php",
      },
    ];
  },
};

export default nextConfig;
