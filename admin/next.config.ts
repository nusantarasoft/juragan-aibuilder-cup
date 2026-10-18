import type { NextConfig } from "next";
<<<<<<< HEAD
=======
const { WebpackModuleStallLogger } = require("./scripts/webpack-module-stall-logger.js");
const withPWA = require('next-pwa')({
  dest: 'public',
  disable:
    process.env.NODE_ENV === 'development' ||
    process.env.DISABLE_PWA === '1',
});
>>>>>>> origin/master

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  // Turbopack config — root pinned to admin dir to prevent multi-lockfile warning
  turbopack: { root: __dirname },
  // Webpack config for @xenova/transformers (fixes compatibility issues)
  webpack: (config, { dev, webpack }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "sharp$": false,
      "onnxruntime-node$": false,
    };
    if (!dev && process.env.DISABLE_MINIFY === "1") {
      config.optimization = {
        ...config.optimization,
        minimize: false,
      };
    }
    if (!dev && process.env.BUILD_MODULE_LOG === "1") {
      config.plugins.push(new WebpackModuleStallLogger({ stallSec: 20, intervalMs: 15_000 }));
    }
    if (!dev && process.env.BUILD_PROGRESS === "1") {
      config.plugins.push(
        new webpack.ProgressPlugin((percent, msg, ...args) => {
          const pct = Math.round(percent * 100);
          // Throttle noise; still shows steady % during long compiles
          if (pct % 2 === 0 || pct >= 99) {
            console.log(`[webpack ${pct}%] ${msg}`, ...args);
          }
        }),
      );
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'aceternity.com',
      },
      {
        protocol: 'https',
        hostname: 'ui.aceternity.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.aceternity.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
};

export default nextConfig;
