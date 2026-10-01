const path = require("path");

const appRoot = path.resolve(__dirname);
const workspaceRoot = path.resolve(__dirname, "..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: workspaceRoot,
    resolveAlias: {
      "@shared": path.join(workspaceRoot, "shared"),
    },
  },
  outputFileTracingRoot: workspaceRoot,
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
      "@shared": path.join(workspaceRoot, "shared"),
    };
    return config;
  },
};

module.exports = nextConfig;
