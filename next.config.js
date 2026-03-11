/** @type {import('next').NextConfig} */
const path = require("path");

const projectRoot = path.resolve(process.cwd());

const nextConfig = {
  turbopack: {
    root: projectRoot,
  },
  webpack: (config) => {
    config.context = projectRoot;
    return config;
  },
};

module.exports = nextConfig;
