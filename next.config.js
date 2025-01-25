/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };
    return config;
  },
  // Increase the memory limit if needed
  experimental: {
    memoryBasedWorkersCount: 2,
  }
};

module.exports = nextConfig; 