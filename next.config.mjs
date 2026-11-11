/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/takethecookies',
  assetPrefix: '/takethecookies/',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
