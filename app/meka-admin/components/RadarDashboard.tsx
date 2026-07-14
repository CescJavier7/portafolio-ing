'use client';

import { useOptimistic, useTransition, useRef, useEffect, useState } from 'react';
import { toggleHumanOverrideAction, sendAdminReply, getActiveSessions } from '../actions';

export type MessagePreview = {
  id: string;
  role: 'USER' | 'AI' | 'ADMIN';
  content: string;
};

export type ChatSessionPreview = {
  id: string;
  humanOverride: boolean;
  status: 'ACTIVE' | 'PENDING_REVIEW' | 'CLOSED';
  updatedAt: Date | string;
  messages: MessagePreview[];
};

export function RadarDashboard({ initialSessions }: { initialSessions: ChatSessionPreview[] }) {
  const [isPending, startTransition] = useTransition();
  const formRefs = useRef<{ [key: string]: HTMLFormElement | null }>({});
  
  const chatScrollRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [liveSessions, setLiveSessions] = useState<ChatSessionPreview[]>(initialSessions);

  // MOTOR DE POLLING DEL RADAR ADMIN
  // 🔴 FIX ARCHITECTURE: MOTOR DE POLLING OPTIMIZADO
  useEffect(() => {
    const scanRadar = async () => {
      // PRO-TIP: Si el admin minimiza la pestaña, detenemos el martilleo a la Base de Datos
      if (document.hidden) return; 

      try {
        const res = await fetch('/api/admin/radar', {
          method: 'GET',
          cache: 'no-store',
          headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
        });
        
        if (!res.ok) return;
        const freshData = await res.json();
        setLiveSessions(freshData);
      } catch (error) {
        console.error("Fallo de escaneo del radar:", error);
      }
    };

    scanRadar(); // Ping Inicial
    const radarInterval = setInterval(scanRadar, 4000); 
    
    return () => clearInterval(radarInterval);
  }, []);

  // AUTO-SCROLL AL FINAL DE LA CONVERSACIÓN
  useEffect(() => {
    liveSessions.forEach(session => {
      const scrollContainer = chatScrollRefs.current[session.id];
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    });
  }, [liveSessions]); 

  const handleOverrideToggle = async (id: string, currentStatus: boolean) => {
    const newState = !currentStatus;
    startTransition(async () => {
      setLiveSessions(prev => prev.map(s => s.id === id ? { ...s, humanOverride: newState } : s));
      await toggleHumanOverrideAction(id, newState);
    });
  };

  const handleSendReply = async (e: React.FormEvent<HTMLFormElement>, sessionId: string) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const replyContent = formData.get('reply') as string;
    
    if (!replyContent || replyContent.trim() === '') return;
    if (formRefs.current[sessionId]) formRefs.current[sessionId]!.reset();

    const tempMessage: MessagePreview = {
      id: `temp-${Date.now()}`,
      role: 'ADMIN',
      content: replyContent
    };

    startTransition(async () => {
      setLiveSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: [...(s.messages || []), tempMessage] } : s));
      await sendAdminReply(sessionId, replyContent);
    });
  };

  return (
    <div className="mt-8 space-y-6 font-mono">
      {!liveSessions || liveSessions.length === 0 ? (
        <p className="text-gray-500 animate-pulse">[+] NO INCOMING SIGNALS DETECTED...</p>
      ) : (
        liveSessions.map((session) => (
          <div key={session.id} className="border border-green-800/50 p-4 bg-black/60 relative flex flex-col md:flex-row gap-4">
            
            <div className="flex-1 flex flex-col min-w-0">
              <div 
                ref={el => { chatScrollRefs.current[session.id] = el; }}
                className="space-y-2 h-48 max-h-48 overflow-y-auto pr-2 custom-scrollbar mb-4 scroll-smooth"
              >
                <p className="text-xs text-green-600 border-b border-green-900 pb-1 mb-2 sticky top-0 bg-black/90 z-10">
                  SESSION_ID: {session.id} | STATUS: {session.status}
                </p>
                {session.messages?.map((msg) => (
                  <div key={msg.id} className={`text-sm flex gap-2 ${msg.role === 'USER' ? 'text-blue-400' : msg.role === 'ADMIN' ? 'text-red-400 font-bold' : 'text-green-300'}`}>
                    <span className="opacity-50 shrink-0">[{msg.role}]</span>
                    <span className="break-words">{msg.content}</span>
                  </div>
                ))}
              </div>

              {session.humanOverride && (
                <form 
                  ref={el => { formRefs.current[session.id] = el; }}
                  onSubmit={(e) => handleSendReply(e, session.id)} 
                  className="flex gap-2 mt-auto pt-2 border-t border-green-900/50"
                >
                  <span className="text-red-500 self-center text-sm">{'>'}</span>
                  <input 
                    type="text" 
                    name="reply"
                    autoComplete="off"
                    placeholder="Enter payload transmission..."
                    className="flex-1 bg-transparent border-b border-zinc-800 focus:border-red-500 outline-none text-red-100 text-sm py-1 placeholder-zinc-700 transition-colors"
                  />
                  <button type="submit" className="text-xs border border-red-900 text-red-500 px-3 hover:bg-red-900/30 transition-colors">
                    TRANSMIT
                  </button>
                </form>
              )}
            </div>

            <div className="flex flex-col justify-start items-end border-l border-green-900/50 pl-4 w-40 shrink-0">
              <button 
                onClick={() => handleOverrideToggle(session.id, session.humanOverride)}
                className={`w-full px-2 py-2 text-[10px] font-bold border transition-all ${
                  session.humanOverride 
                    ? 'border-red-500 text-red-500 hover:bg-red-900/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                    : 'border-cyan-500 text-cyan-500 hover:bg-cyan-900/20'
                }`}
              >
                {session.humanOverride ? '[ ENGAGE_AI ]' : '[ SYS_OVERRIDE ]'}
              </button>
              <p className="text-[9px] text-gray-600 mt-2 text-right w-full">
                LAST_PING:<br/>
                {new Date(session.updatedAt).toLocaleTimeString('es-EC', { timeZone: 'America/Guayaquil' })}
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