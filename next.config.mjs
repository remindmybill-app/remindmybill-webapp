import withPWA from 'next-pwa';

const isDev = process.env.NODE_ENV !== 'production';

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: isDev, // Disable PWA in development
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
        }
      }
    }
  ]
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Explicitly force webpack (required for next-pwa)
  turbopack: undefined, // Disable Turbopack

  // Your existing config
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },

  // Ensure webpack is used
  webpack: (config, { isServer }) => {
    // Required for next-pwa
    return config;
  }
};

export default pwaConfig(nextConfig);
