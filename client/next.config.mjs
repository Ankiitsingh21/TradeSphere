/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  turbopack: {},
  webpack: (config) => ({
    ...config,
    watchOptions: {
      ...config.watchOptions,
      poll: 300,
    },
  }),
  allowedDevOrigins: ["sphere.dev"],
};

export default nextConfig;
