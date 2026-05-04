import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // Permitir uploads de hasta 6 MB en server actions (logo: 2 MB, banner: 5 MB,
  // galería: 5 MB, foto profesional: 3 MB). Default Next es 1 MB → fallaba.
  experimental: {
    serverActions: {
      bodySizeLimit: '6mb',
    },
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
