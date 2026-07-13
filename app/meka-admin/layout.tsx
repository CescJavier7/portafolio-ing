// app/meka-admin/layout.tsx
import "@/app/globals.css"; // Importamos tus estilos globales

export const metadata = {
  title: "MEKA_JAVIER_OS // Admin",
  description: "Panel de control de acceso restringido",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      {/* Forzamos el fondo negro para todo el panel de control */}
      <body className="bg-black text-green-500 font-mono antialiased selection:bg-green-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}