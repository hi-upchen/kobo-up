/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      fs: false, // Use 'false' to indicate an empty module
      ...(config.resolve.fallback || {}), // Preserve existing fallbacks
    };

    // Add the 'module' configuration for handling .wasm files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'javascript/auto',
    });

    return config;
  }
};

export default nextConfig;
