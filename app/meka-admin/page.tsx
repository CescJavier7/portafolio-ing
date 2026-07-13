import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getActiveSessions } from './actions';
import { RadarDashboard } from './components/RadarDashboard';

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user) {
    redirect('/meka-admin/login');
  }

  // Ejecución segura en el servidor
  const activeSessions = await getActiveSessions();

  // El componente renderiza la estructura HTML de la página de administración[cite: 3]
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-green-500 p-4 md:p-10 font-mono">
      <header className="border-b border-green-900 pb-4 mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-widest text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.3)]">
          MEKA_JAVIER_OS // Centro de Mando
        </h1>
        <p className="text-xs md:text-sm text-green-700 mt-2">
          Root access granted. Authenticated as: {session.user.email}
        </p>
      </header>

      <main className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end border-b border-green-900/50 pb-2">
          <h2 className="text-xl text-gray-300">Radar de Intercepción de Nodos</h2>
          <span className="text-xs text-green-600 animate-pulse">● LIVE_MONITORING</span>
        </div>
        
        {/* Pasamos los tipos fuertemente validados al cliente */}
        <RadarDashboard initialSessions={activeSessions as any} />
      </main>
    </div>
  );
}