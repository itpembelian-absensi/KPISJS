import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3", "xlsx", "pdfkit"],
  experimental: {
    // Proxy memotong body di 10MB. Backup SQLite boleh sampai 200MB.
    proxyClientMaxBodySize: "200mb",
  },
};

export default nextConfig;
