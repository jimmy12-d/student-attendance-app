// next.config.js (or next.config.mjs if you're using ES module syntax consistently)

// It seems you are using ES module syntax with 'import type' and 'export default',
// so I'll keep that. If it's a .js file, you might use require/module.exports.
// However, 'import type' only imports types, the actual config still needs to be `module.exports` for a .js file
// unless your package.json has "type": "module".
// Let's assume for a .js file you'd use module.exports and for .mjs you'd use export default.
// Given `export default nextConfig;`, this is likely an .mjs file or `type: "module"` is set.

// import type { NextConfig } from "next"; // This is fine for type checking

const actualBasePath = "/admin-one-react-tailwind"; // Define it once

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

  async redirects() {
    return [
      {
        source: "/",
        destination: actualBasePath, // Use the variable
        basePath: false,
        permanent: false,
      },
    ];
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

// If your file is strictly next.config.js and you don't have "type": "module" in package.json,
// you should use module.exports:
//
// const actualBasePath = "/admin-one-react-tailwind";
// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   output: process.env.IS_OUTPUT_EXPORT ? "export" : "standalone",
//   basePath: actualBasePath,
//   env: {
//     NEXT_PUBLIC_BASE_PATH: actualBasePath,
//   },
//   async redirects() { /* ... */ },
//   images: { /* ... */ },
// };
// module.exports = nextConfig;