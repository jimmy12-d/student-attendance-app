const actualBasePath = ""; // Define it once

const nextConfig = { // Removed NextConfig type here for simplicity if it causes issues with module.exports
  output: process.env.IS_OUTPUT_EXPORT ? "export" : "standalone",
  basePath: actualBasePath, // Use the variable

  // ADD THIS ENV BLOCK TO EXPOSE basePath TO THE CLIENT
  env: {
    NEXT_PUBLIC_BASE_PATH: actualBasePath, // Must start with NEXT_PUBLIC_
  },

  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  eslint: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },

  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.justboil.me",
      },
    ],
  },
};

export default nextConfig; // If it's an .mjs file or "type": "module" in package.json
