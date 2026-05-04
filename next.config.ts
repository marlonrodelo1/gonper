import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    remotePatterns: [
      // Imágenes públicas servidas por Supabase Storage
      // (bucket "salon-assets": logos y banners de cada salón)
      {
        protocol: "https",
        hostname: "lyqvgdambamzbrzpwgpg.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Cover de fallback en hero (web pública del salón)
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
