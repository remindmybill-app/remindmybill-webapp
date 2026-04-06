import withPWA from 'next-pwa';

const isDev = process.env.NODE_ENV !== 'production';

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: isDev, // Disable PWA in development
  customWorkerDir: 'worker',
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
  // Required: Set root explicitly so Next.js 16 doesn't detect a
  // parent-level lockfile as the workspace root (causes exit code 1).
  // Also silences the turbopack/webpack coexistence warning from next-pwa.
  turbopack: {
    root: process.cwd(),
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
};

export default nextConfig;
