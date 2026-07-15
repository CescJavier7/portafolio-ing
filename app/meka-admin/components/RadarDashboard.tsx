'use client';

import { useTransition, useRef, useEffect, useState } from 'react';
import { Terminal, Send, ShieldAlert, Clock, AlertCircle, Activity, ChevronRight, ChevronLeft } from 'lucide-react';
import { toggleHumanOverrideAction, sendAdminReply } from '../actions';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [liveSessions, setLiveSessions] = useState<ChatSessionPreview[]>(initialSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [adminInput, setAdminInput] = useState('');
  const [isTransmitting, setIsTransmitting] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Motor de Telemetría (Polling al router que acabas de actualizar)
  useEffect(() => {
    const scanRadar = async () => {
      if (document.hidden) return; 
      try {
        const res = await fetch(`/api/admin/radar?t=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
          headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
        });
        
        if (!res.ok) return;
        const freshData = await res.json();
        
        const sortedData = freshData.sort((a: any, b: any) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        
        setLiveSessions(sortedData);
      } catch (error) {
        console.error("Fallo de telemetría:", error);
      }
    };

    scanRadar();
    const radarInterval = setInterval(scanRadar, 3000); 
    return () => clearInterval(radarInterval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveSessions, activeSessionId]);

  const activeSession = liveSessions.find(s => s.id === activeSessionId);

  const handleOverrideToggle = async (id: string, currentStatus: boolean) => {
    const newState = !currentStatus;
    startTransition(async () => {
      setLiveSessions(prev => prev.map(s => s.id === id ? { ...s, humanOverride: newState } : s));
      await toggleHumanOverrideAction(id, newState);
    });
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminInput.trim() || !activeSessionId) return;

    setIsTransmitting(true);
    const payload = adminInput;
    setAdminInput('');

    // UI Optimista: Inyectamos el mensaje instantáneamente en la pantalla del admin
    const tempMessage: MessagePreview = {
      id: `temp-${Date.now()}`,
      role: 'ADMIN',
      content: payload
    };

    setLiveSessions(prev => prev.map(s => 
      s.id === activeSessionId ? { ...s, messages: [...s.messages, tempMessage] } : s
    ));

    try {
      await sendAdminReply(activeSessionId, payload);
    } catch (error) {
      console.error("Error de transmisión:", error);
    } finally {
      setIsTransmitting(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[85vh] bg-[#020617] border border-green-500/20 md:rounded-2xl overflow-hidden md:mt-6 font-mono shadow-[0_0_50px_rgba(34,197,94,0.05)] relative">
      
      {/* SIDEBAR: Lista de Intercepciones (Mobile: Se oculta si hay chat activo) */}
      <div className={`w-full md:w-80 border-r border-green-900/40 flex-col bg-black/40 backdrop-blur-md z-10 ${activeSessionId ? 'hidden md:flex' : 'flex'} h-full`}>
        <div className="p-5 border-b border-green-900/40 bg-gradient-to-r from-green-950/20 to-transparent">
          <h2 className="flex items-center gap-2 font-bold text-green-400 tracking-widest text-xs uppercase">
            <Activity className="w-4 h-4 animate-pulse text-green-500" /> 
            Live Monitoring
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-green-900/50 scrollbar-track-transparent p-2 space-y-1">
          {liveSessions.map((session) => {
            const lastMessage = session.messages[session.messages.length - 1];
            const isActive = activeSessionId === session.id;
            
            return (
              <button
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={`w-full text-left p-4 rounded-xl transition-all duration-300 relative group overflow-hidden ${
                  isActive ? 'bg-green-500/10 border border-green-500/30' : 'hover:bg-green-950/30 border border-transparent'
                }`}
              >
                {isActive && (
                  <motion.div layoutId="activeIndicator" className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 shadow-[0_0_10px_#22c55e]" />
                )}
                
                <div className="flex justify-between items-start mb-1.5 pl-1">
                  <span className={`text-[11px] truncate flex-1 font-bold tracking-wider ${isActive ? 'text-green-300' : 'text-green-600'}`}>
                    ID_{session.id.substring(0, 6).toUpperCase()}
                  </span>
                  <span className="text-[10px] text-green-700/80 flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3" />
                    {new Date(session.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <div className="text-[11px] text-green-500/60 truncate pl-1">
                  {lastMessage ? `${lastMessage.role === 'USER' ? 'USR' : 'SYS'}: ${lastMessage.content}` : 'AWAITING_PAYLOAD'}
                </div>
                
                {session.humanOverride && (
                  <div className="mt-2.5 inline-flex items-center gap-1 text-[9px] font-bold bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-1 rounded-md ml-1">
                    <AlertCircle className="w-3 h-3" /> SYS_OVERRIDE
                  </div>
                )}
              </button>
            );
          })}
          {liveSessions.length === 0 && (
            <div className="text-center text-green-900/50 mt-10 text-xs">NO INCOMING SIGNALS</div>
          )}
        </div>
      </div>

      {/* ÁREA PRINCIPAL: Terminal de Chat (Mobile: Se oculta si no hay chat activo) */}
      <div className={`flex-1 flex-col relative bg-zinc-950/50 h-full ${!activeSessionId ? 'hidden md:flex' : 'flex'}`}>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

        {activeSession ? (
          <>
            {/* Header del Nodo Activo */}
            <div className="p-3 md:p-4 border-b border-green-900/40 bg-black/60 backdrop-blur-xl flex justify-between items-center z-10">
              <div className="flex items-center gap-2 md:gap-3">
                {/* Botón Volver (Solo visible en Mobile) */}
                <button 
                  onClick={() => setActiveSessionId(null)}
                  className="md:hidden p-2 bg-zinc-900/80 rounded-lg border border-zinc-800 text-green-500 hover:text-green-300 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className={`hidden md:block p-2 rounded-lg border ${activeSession.humanOverride ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                  <Terminal className={`w-4 h-4 ${activeSession.humanOverride ? 'text-red-400' : 'text-green-400'}`} />
                </div>
                <div>
                  <h3 className="text-zinc-100 font-bold tracking-widest text-[10px] md:text-xs">
                    NODO: {activeSession.id.split('-')[0].toUpperCase()}
                  </h3>
                  <span className={`text-[9px] uppercase font-bold tracking-widest ${activeSession.humanOverride ? 'text-red-500' : 'text-green-500'}`}>
                    {activeSession.humanOverride ? 'Estado: Intervenido' : 'Estado: IA Autónoma'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleOverrideToggle(activeSession.id, activeSession.humanOverride)}
                className={`px-3 md:px-4 py-2 rounded-lg text-[9px] md:text-[10px] font-bold tracking-widest transition-all duration-300 flex items-center gap-1 md:gap-2 ${
                  activeSession.humanOverride 
                    ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                    : 'bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20'
                }`}
              >
                {activeSession.humanOverride ? 'LIBERAR IA' : 'TOMAR CONTROL'}
                <ChevronRight className="w-3 h-3 hidden md:block" />
              </button>
            </div>

            {/* Historial de Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 z-10 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              <AnimatePresence initial={false}>
                {activeSession.messages.map((msg, i) => (
                  <motion.div 
                    key={msg.id || i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col w-full ${msg.role === 'USER' ? 'items-start' : 'items-end'}`}
                  >
                    <span className={`text-[8px] md:text-[9px] mb-1.5 font-bold tracking-widest uppercase ${
                      msg.role === 'USER' ? 'text-cyan-500/70 ml-1' : msg.role === 'ADMIN' ? 'text-red-500/70 mr-1' : 'text-green-500/70 mr-1'
                    }`}>
                      {msg.role === 'USER' ? 'Target_Node' : msg.role === 'ADMIN' ? 'SYS_ADMIN' : 'MEKA_OS'}
                    </span>
                    <div className={`max-w-[85%] md:max-w-[75%] p-3.5 text-[12px] md:text-[13px] leading-relaxed relative ${
                      msg.role === 'USER' 
                        ? 'bg-cyan-950/20 text-cyan-50 border border-cyan-900/40 rounded-2xl rounded-tl-sm' 
                        : msg.role === 'ADMIN'
                          ? 'bg-red-950/20 text-red-50 border border-red-900/40 rounded-2xl rounded-tr-sm shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                          : 'bg-green-950/20 text-green-50 border border-green-900/30 rounded-2xl rounded-tr-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} className="h-2" />
            </div>

            {/* Input de Transmisión */}
            <form onSubmit={handleSendReply} className="p-3 md:p-5 bg-black/80 backdrop-blur-xl border-t border-green-900/30 z-10 relative">
              {!activeSession.humanOverride && (
                 <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-20 md:rounded-b-2xl">
                   <div className="bg-zinc-900/90 border border-zinc-800 px-4 md:px-6 py-2 rounded-full shadow-2xl">
                     <span className="text-[9px] md:text-[11px] text-zinc-400 font-bold tracking-widest uppercase">
                       Control Manual Desactivado
                     </span>
                   </div>
                 </div>
              )}
              <div className="flex gap-2 md:gap-3">
                <div className="flex-1 relative group">
                  <span className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-red-500 font-bold text-sm">{'>'}</span>
                  <input
                    type="text"
                    value={adminInput}
                    onChange={(e) => setAdminInput(e.target.value)}
                    disabled={!activeSession.humanOverride || isTransmitting}
                    placeholder="Payload..."
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-700 rounded-xl p-3 md:p-3.5 pl-8 md:pl-10 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all text-sm shadow-inner"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isTransmitting || !adminInput.trim() || !activeSession.humanOverride}
                  className="px-4 md:px-6 bg-red-500/10 text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/20 hover:text-red-300 disabled:opacity-30 disabled:hover:bg-transparent font-bold tracking-widest flex items-center gap-2 transition-all text-[10px] md:text-[11px] uppercase"
                >
                  <Send className="w-4 h-4 hidden md:block" /> 
                  <span className="md:hidden"><Send className="w-5 h-5"/></span>
                  <span className="hidden md:block">Transmitir</span>
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-green-900/30 z-10">
            <ShieldAlert className="w-20 h-20 mb-6 opacity-50" />
            <p className="tracking-widest font-bold text-xs uppercase animate-pulse text-center px-4">Monitor de Nodos en Espera...</p>
          </div>
        )}
      </div>
    </div>
  );
}