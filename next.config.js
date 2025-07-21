/** @type {import('next').NextConfig} */
const nextConfig = {
  
  // Security headers for Emma AI
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options', 
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ]
      }
    ]
  },

  // Optimize for voice and AI processing
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Optimize for production
    if (!dev) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      }
    }
    return config
  },

  // Image optimization for UI components
  images: {
    domains: ['cdn.elevenlabs.io'],
    formats: ['image/webp', 'image/avif']
  },

  // Performance optimizations
  compress: true,
  poweredByHeader: false,
}

module.exports = nextConfig