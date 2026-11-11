import type { NextConfig } from "next"

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""

const nextConfig: NextConfig = {
  // Permite um build de verificação sem conflitar com o `next dev` (que usa .next)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  // Só há imagens locais (logo): sem otimizador de imagens no servidor (e sem o sharp em execução)
  images: { unoptimized: true },
  experimental: {
    // Upload de comprovantes/documentos passa pelo Storage, não pelas actions; folga para formulários grandes
    serverActions: { bodySizeLimit: "2mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          {
            key: "Content-Security-Policy",
            // Scripts inline são necessários ao Next sem nonce; o resto é travado na própria origem e no Supabase
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              `connect-src 'self' ${supabase}`,
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ]
  },
}

export default nextConfig
