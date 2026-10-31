import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  // Legacy slugs the source still links to and permanently redirects.
  async redirects() {
    return [
      {
        source: "/categories/accessories-camera-bracket-junction-box",
        destination: "/categories/accessories-camera-bracket-and-junction-box",
        permanent: true,
      },
      {
        source: "/products/rg59-cctv-cable-10m-bnc-video-with-dc-power-shotgun-lead-for-camera",
        destination: "/categories/wire-cable",
        permanent: true,
      },
    ];
  },
  images: {
    // cctvmaster.co.uk serves product and category images at quality 90.
    qualities: [75, 90],
    // Images uploaded in the admin are stored in Vercel Blob in production.
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
};

export default nextConfig;
