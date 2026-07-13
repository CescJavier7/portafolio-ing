'use client';

import { useOptimistic, useTransition } from 'react';
import { toggleHumanOverrideAction } from '../actions';

// DTO inferido de tu esquema Prisma
type MessagePreview = {
  id: string;
  role: 'USER' | 'AI' | 'ADMIN';
  content: string;
};

type ChatSessionPreview = {
  id: string;
  humanOverride: boolean;
  status: 'ACTIVE' | 'PENDING_REVIEW' | 'CLOSED';
  updatedAt: Date;
  messages: MessagePreview[];
};

export function RadarDashboard({ initialSessions }: { initialSessions: ChatSessionPreview[] }) {
  const [isPending, startTransition] = useTransition();
  const [optimisticSessions, addOptimisticSession] = useOptimistic(
    initialSessions,
    (state, { id, humanOverride }: { id: string; humanOverride: boolean }) => 
      state.map(s => s.id === id ? { ...s, humanOverride } : s)
  );

  const handleOverrideToggle = async (id: string, currentOverrideStatus: boolean) => {
    const newState = !currentOverrideStatus;
    
    startTransition(async () => {
      addOptimisticSession({ id, humanOverride: newState });
      await toggleHumanOverrideAction(id, newState);
    });
  };

  return (
    <div className="mt-8 space-y-6 font-mono">
      {optimisticSessions.length === 0 ? (
        <p className="text-gray-500 animate-pulse">[+] NO INCOMING SIGNALS DETECTED...</p>
      ) : (
        optimisticSessions.map((session) => (
          <div key={session.id} className="border border-green-800/50 p-4 bg-black/60 relative overflow-hidden flex flex-col md:flex-row gap-4">
            
            {/* Visualizador de Logs del Chat */}
            <div className="flex-1 space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              <p className="text-xs text-green-600 border-b border-green-900 pb-1 mb-2 sticky top-0 bg-black/90">
                SESSION_ID: {session.id} | STATUS: {session.status}
              </p>
              
              {session.messages.length === 0 ? (
                <p className="text-xs text-gray-500 italic">Empty buffer...</p>
              ) : (
                session.messages.map((msg) => (
                  <div key={msg.id} className={`text-sm flex gap-2 ${msg.role === 'USER' ? 'text-blue-400' : msg.role === 'ADMIN' ? 'text-red-400' : 'text-green-300'}`}>
                    <span className="opacity-50">[{msg.role}]</span>
                    <span>{msg.content}</span>
                  </div>
                ))
              )}
            </div>

            {/* Panel de Control */}
            <div className="flex flex-col justify-between items-end border-l border-green-900/50 pl-4 min-w-[200px]">
              <button 
                onClick={() => handleOverrideToggle(session.id, session.humanOverride)}
                className={`w-full px-4 py-2 text-xs font-bold border transition-all ${
                  session.humanOverride 
                    ? 'border-red-500 text-red-500 hover:bg-red-900/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                    : 'border-cyan-500 text-cyan-500 hover:bg-cyan-900/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                }`}
              >
                {session.humanOverride ? '[ ENGAGE_AI ]' : '[ SYS_OVERRIDE ]'}
              </button>
              
              <p className="text-[10px] text-gray-600 mt-4 text-right">
                LAST_PING: {new Date(session.updatedAt).toLocaleTimeString()}
              </p>
            </div>

            {session.humanOverride && (
               <div className="absolute top-0 left-0 w-1 h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
            )}
          </div>
        ))
      )}
    </div>
  );
}