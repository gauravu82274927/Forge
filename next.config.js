/** @type {import('next').NextConfig} */

// PostHog region: https://us.i.posthog.com (default) or https://eu.i.posthog.com.
// Must match NEXT_PUBLIC_POSTHOG_HOST, which the browser code also reads.
const posthogHost = (process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com').replace(/\/+$/, '');
const posthogAssetsHost = posthogHost.replace('.i.posthog.com', '-assets.i.posthog.com');

const nextConfig = {
  images: { unoptimized: true },
  // PostHog sends URLs with trailing slashes (like /e/); Next must not redirect them.
  skipTrailingSlashRedirect: true,
  // Send analytics through our own domain so ad blockers do not drop it.
  async rewrites() {
    return [
      { source: '/ingest/static/:path*', destination: `${posthogAssetsHost}/static/:path*` },
      { source: '/ingest/array/:path*', destination: `${posthogAssetsHost}/array/:path*` },
      { source: '/ingest/:path*', destination: `${posthogHost}/:path*` },
    ];
  },
};

module.exports = nextConfig;
