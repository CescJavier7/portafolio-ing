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
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default nextConfig;