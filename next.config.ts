import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Autorización de red para pruebas en dispositivos locales
  allowedDevOrigins: ["192.168.0.108", "localhost:3000"],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cescjavier.dev', // Ejemplo de dominio autorizado
      },
    ],
  },
  // 2. Hardening de cabeceras HTTP de seguridad
  async headers() {
    // CSP pragmática: 'unsafe-inline' en script/style es necesario por los
    // scripts inline de Next (hidratación, JSON-LD, restauración de scroll)
    // sin migrar a nonces. connect-src incluye la API de Sentra y el beacon
    // de Cloudflare. frame-ancestors 'none' refuerza el anti-clickjacking.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.cescjavier.dev https://cloudflareinsights.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
        ],
      },
    ];
  },
};

export default nextConfig;