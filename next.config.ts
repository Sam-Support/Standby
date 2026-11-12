import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (base locale) et exceljs s'exécutent en Node natif, sans bundling
  serverExternalPackages: ["@electric-sql/pglite", "exceljs"],
  outputFileTracingIncludes: { "/**": ["./db/migrations/**/*"] },
  // la base locale (.data) ne doit jamais partir dans le build
  outputFileTracingExcludes: { "/**": ["./.data/**/*"] },
  poweredByHeader: false,
  experimental: {
    // dépôts de plaquettes, documents et fichiers de leads (20 Mo + marge multipart)
    serverActions: { bodySizeLimit: "25mb" },
    proxyClientMaxBodySize: "25mb",
  },
  // en-têtes valables pour toutes les réponses, fichiers statiques compris ; le reste (CSP avec nonce, nosniff,
  // Referrer-Policy, Permissions-Policy) est posé par requête dans proxy.ts
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
