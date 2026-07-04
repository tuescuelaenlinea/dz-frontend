/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '179.43.112.64',
        port: '8080',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '179.43.112.64',  // ← ← ← AGREGAR: Sin puerto
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.dzsalon.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'dzsalon.com',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '3000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8080',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;