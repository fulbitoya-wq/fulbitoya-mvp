const path = require("path");

const appRoot = path.resolve(__dirname);
const sharedRoot = path.join(appRoot, ".generated", "shared");

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "https://porlacancha.com",
  },
  turbopack: {
    root: appRoot,
    resolveAlias: {
      "@shared": sharedRoot,
    },
  },
  outputFileTracingRoot: appRoot,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/.well-known/apple-app-site-association",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@shared": sharedRoot,
    };
    return config;
  },
};

module.exports = nextConfig;
