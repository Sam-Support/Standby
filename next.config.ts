import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // PGlite (base locale) et exceljs s'exécutent en Node natif, sans bundling
  serverExternalPackages: ["@electric-sql/pglite", "exceljs"],
  outputFileTracingIncludes: { "/**": ["./db/migrations/**/*"] },
  poweredByHeader: false,
  experimental: {
    // dépôts de plaquettes, documents et fichiers de leads (20 Mo + marge multipart)
    serverActions: { bodySizeLimit: "25mb" },
    proxyClientMaxBodySize: "25mb",
  },
};

export default nextConfig;
