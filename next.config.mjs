import path from "node:path"
import { fileURLToPath } from "node:url"

const appRoot = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Parent dirs may contain other lockfiles; pin tracing/dev to this app only.
  outputFileTracingRoot: appRoot,
  turbopack: {
    root: appRoot,
  },
  serverExternalPackages: [
    "@supabase/supabase-js",
    "@supabase/ssr",
    "@supabase/auth-helpers-nextjs",
    "@supabase/auth-helpers-shared",
    "@supabase/node-fetch",
    "whatwg-url",
    "tr46",
    "webidl-conversions",
  ],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Stale chunk IDs (e.g. missing ./2796.js) after HMR when dev cache survives partial rebuilds.
  experimental: {
    serverComponentsHmrCache: false,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false
    }
    return config
  },
}

export default nextConfig
