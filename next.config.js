/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.devfolio.co' },
      { protocol: 'https', hostname: 'devfolio.co' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: '**.googleapis.com' },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['playwright'],
  },
}

module.exports = nextConfig
