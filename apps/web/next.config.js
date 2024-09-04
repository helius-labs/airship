/** @type {import('next').NextConfig} */

module.exports = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback.fs = false;
      config.resolve.alias = {
        ...config.resolve.alias,
        "os": false,
        "child_process": false,
        "worker_threads": false
      }
    }
    return config;
  },
};
