/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable strict TypeScript checking
  typescript: {
    ignoreBuildErrors: false,
  },
  // Enable Next.js Image Optimization
  images: {
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
{
              key: 'Content-Security-Policy',
              value: [
                "default-src 'self'",
                // Next.js injects inline scripts/styles (hydration, styled-jsx).
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data: blob:",
                "font-src 'self' data:",
                "connect-src 'self'",
                "frame-ancestors 'none'",
                "base-uri 'self'",
                "form-action 'self'",
              ].join('; '),
            },
        ],
      },
    ];
  },
}

export default nextConfig
