// app/meka-admin/login/page.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false, 
    });

    if (result?.error) {
      setError("ACCESO DENEGADO. Credenciales inválidas o no autorizadas.");
      setIsLoading(false);
    } else {
      // Redirección directa a tu panel fuera de la carpeta de idiomas
      router.push("/meka-admin");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full border border-green-500/30 p-8 shadow-[0_0_15px_rgba(34,197,94,0.15)] relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-green-500/50"></div>
        <div className="text-center mb-10 mt-2">
          <h1 className="text-2xl font-bold tracking-widest text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
            MEKA_JAVIER_OS
          </h1>
          <p className="text-xs mt-2 opacity-70 border-b border-green-500/20 pb-4">
            // PROTOCOLO DE IDENTIFICACIÓN REQUERIDO
          </p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm mb-2 text-green-400 tracking-wider">EMAIL_</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/50 border border-green-500/50 text-green-400 p-3 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all placeholder-green-900"
              placeholder="admin@dominio.com"
              required
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-sm mb-2 text-green-400 tracking-wider">PASSWORD_</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/50 border border-green-500/50 text-green-400 p-3 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all placeholder-green-900"
              placeholder="••••••••••••"
              required
            />
          </div>
          {error && (
            <div className="text-red-500 text-sm border border-red-500/50 p-3 bg-red-950/20 font-bold">
              [CRITICAL]: {error}
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full border border-green-500 p-4 mt-6 font-bold tracking-widest hover:bg-green-500 hover:text-black transition-colors disabled:opacity-50 disabled:cursor-wait"
          >
            {isLoading ? "AUTENTICANDO..." : "INICIAR SESIÓN"}
          </button>
        </form>
      </div>
    </div>
  );
}