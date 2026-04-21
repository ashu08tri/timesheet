import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.dicebear.com' },
    ],
  },
}

export default nextConfig