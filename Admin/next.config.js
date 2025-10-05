/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  },
  // Digital Ocean App Platform configuration
  trailingSlash: false,
  // Ensure proper serving
  distDir: '.next',
  // Disable static optimization for API routes
  experimental: {
    serverComponentsExternalPackages: ['pg'],
  },
}

module.exports = nextConfig






