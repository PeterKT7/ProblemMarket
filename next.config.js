/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      // The static marketing site lives at public/index.html and ships unchanged.
      // Next.js owns /api/*, /admin, /dashboard, /login, /pledge/*, /cases/*.
      beforeFiles: [{ source: '/', destination: '/index.html' }],
    };
  },
};

module.exports = nextConfig;
