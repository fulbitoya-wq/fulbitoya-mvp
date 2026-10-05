/** @type {import('next').NextConfig} */
const path = require("path");

const projectRoot = path.resolve(process.cwd());

const nextConfig = {
  turbopack: {
    root: projectRoot,
  },
  async redirects() {
    return [
      { source: "/jugador", destination: "/dashboard", permanent: false },
      { source: "/jugador/:path*", destination: "/dashboard", permanent: false },
      { source: "/desafios", destination: "/", permanent: false },
      { source: "/desafios/:path*", destination: "/", permanent: false },
      { source: "/canchas", destination: "/dashboard/canchas", permanent: false },
      { source: "/canchas/:path*", destination: "/dashboard/canchas", permanent: false },
      { source: "/mis-reservas", destination: "/dashboard/reservas", permanent: false },
      { source: "/equipos/:path*", destination: "/dashboard", permanent: false },
      { source: "/dashboard/desafios", destination: "/dashboard", permanent: false },
      { source: "/dashboard/desafios/:path*", destination: "/dashboard", permanent: false },
      { source: "/dashboard/invitaciones", destination: "/dashboard", permanent: false },
    ];
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
