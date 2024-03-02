/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    mdxRs: true,
    serverComponentsExternalPackages: ["mongoose"],
  },
  images: {
    domains: [
      "img.clerk.com",
      "encrypted-tbn0.gstatic.com",
      "upload.wikimedia.org",
      "pbs.twimg.com",
      "prd-sc102-cdn.rtx.com",
      "utfs.io",
    ],
  },
};

module.exports = nextConfig;
