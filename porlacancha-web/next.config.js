const path = require("path");

const appRoot = path.resolve(__dirname);
const sharedRoot = path.join(appRoot, ".generated", "shared");

/** @type {import('next').NextConfig} */
const nextConfig = {
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
