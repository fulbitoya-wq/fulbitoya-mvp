/** @type {import('next').NextConfig} */
const path = require("path");

const projectRoot = path.resolve(process.cwd());

const nextConfig = {
  turbopack: {
    root: projectRoot,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  webpack: (config) => {
    config.context = projectRoot;
    return config;
  },
};

module.exports = nextConfig;
