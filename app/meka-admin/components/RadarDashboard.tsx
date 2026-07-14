'use client';

import { useOptimistic, useTransition, useRef, useEffect, useState } from 'react';
import { Terminal, Send, ShieldAlert, User, Clock, AlertCircle } from 'lucide-react';
import { toggleHumanOverrideAction, sendAdminReply } from '../actions';

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

  // 1. Motor de Polling (Tiempo Real)
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
        
        // Ordenamos por actividad más reciente (como WhatsApp)
        const sortedData = freshData.sort((a: any, b: any) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        
        setLiveSessions(sortedData);
        
        if (!activeSessionId && sortedData.length > 0) {
          setActiveSessionId(sortedData[0].id);
        }
      } catch (error) {
        console.error("Fallo de escaneo del radar:", error);
      }
    };

    scanRadar();
    const radarInterval = setInterval(scanRadar, 3000); 
    return () => clearInterval(radarInterval);
  }, [activeSessionId]);

  // 2. Auto-scroll fluido al cambiar de chat o recibir mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveSessions, activeSessionId]);

  const activeSession = liveSessions.find(s => s.id === activeSessionId);

  // 3. Manejadores de Acción
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

    // Inyección optimista para sensación de cero-latencia
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
      console.error("Error al transmitir:", error);
    } finally {
      setIsTransmitting(false);
    }
  };

  return (
    <div className="flex h-[80vh] bg-black/40 border border-green-900/50 rounded-xl overflow-hidden mt-8 font-mono shadow-[0_0_40px_rgba(34,197,94,0.05)]">
      
      {/* SIDEBAR - Lista de Chats */}
      <div className="w-1/3 min-w-[300px] border-r border-green-900/50 flex flex-col bg-black/60">
        <div className="p-4 border-b border-green-900/50 bg-green-950/20">
          <h2 className="flex items-center gap-2 font-bold text-green-400 tracking-widest text-sm">
            <ShieldAlert className="w-4 h-4" /> INTERCEPCIONES
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-green-900 scrollbar-track-transparent">
          {liveSessions.map((session) => {
            const lastMessage = session.messages[session.messages.length - 1];
            const isActive = activeSessionId === session.id;
            
            return (
              <button
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={`w-full text-left p-4 border-b border-green-900/30 transition-all ${
                  isActive ? 'bg-green-900/20 border-l-4 border-l-green-500' : 'hover:bg-green-950/30 border-l-4 border-l-transparent'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-xs truncate flex-1 font-bold ${isActive ? 'text-green-400' : 'text-green-600'}`}>
                    ID: {session.id.substring(0, 8)}...
                  </span>
                  <span className="text-[10px] text-green-700 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(session.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-xs text-green-500/70 truncate">
                  {lastMessage ? `${lastMessage.role === 'USER' ? 'Usuario' : 'Tú'}: ${lastMessage.content}` : 'Conexión iniciada'}
                </div>
                {session.humanOverride && (
                  <div className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold bg-red-950/40 text-red-500 px-2 py-1 rounded">
                    <AlertCircle className="w-3 h-3" /> CONTROL MANUAL
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ÁREA PRINCIPAL - Chat Activo */}
      <div className="flex-1 flex flex-col bg-black/20 relative">
        {activeSession ? (
          <>
            {/* Cabecera del Chat */}
            <div className="p-4 border-b border-green-900/50 bg-black/60 flex justify-between items-center z-10 shadow-md">
              <div>
                <h3 className="text-green-400 font-bold tracking-wider text-xs flex items-center gap-2">
                  <Terminal className="w-4 h-4" /> NODO: {activeSession.id}
                </h3>
              </div>
              <button
                onClick={() => handleOverrideToggle(activeSession.id, activeSession.humanOverride)}
                className={`px-4 py-1.5 rounded text-[10px] font-bold tracking-widest transition-all ${
                  activeSession.humanOverride 
                    ? 'bg-red-900/20 text-red-500 border border-red-500/50 hover:bg-red-900/40 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                    : 'bg-green-900/20 text-green-500 border border-green-500/50 hover:bg-green-900/40'
                }`}
              >
                {activeSession.humanOverride ? '[ LIBERAR IA ]' : '[ TOMAR CONTROL ]'}
              </button>
            </div>

            {/* Historial de Mensajes */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-green-900 scrollbar-track-transparent">
              {activeSession.messages.map((msg, i) => (
                <div key={msg.id || i} className={`flex flex-col ${msg.role === 'USER' ? 'items-start' : 'items-end'}`}>
                  <span className={`text-[10px] mb-1 font-bold tracking-widest ${msg.role === 'USER' ? 'text-blue-500/70' : msg.role === 'ADMIN' ? 'text-red-500/70' : 'text-green-600/70'}`}>
                    [{msg.role}]
                  </span>
                  <div className={`max-w-[75%] p-3 text-sm leading-relaxed shadow-sm ${
                    msg.role === 'USER' 
                      ? 'bg-blue-950/20 text-blue-100 border border-blue-900/50 rounded-r-xl rounded-bl-xl' 
                      : msg.role === 'ADMIN'
                        ? 'bg-red-950/20 text-red-100 border border-red-900/50 rounded-l-xl rounded-br-xl'
                        : 'bg-green-950/10 text-green-300 border border-green-900/30 rounded-l-xl rounded-br-xl'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Formulario */}
            <form onSubmit={handleSendReply} className="p-4 bg-black/80 border-t border-green-900/50 z-10 relative">
              {!activeSession.humanOverride && (
                 <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center z-20">
                   <span className="text-xs text-green-500/70 font-bold tracking-widest">TOMA EL CONTROL PARA RESPONDER</span>
                 </div>
              )}
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500 font-bold text-sm">{'>'}</span>
                  <input
                    type="text"
                    value={adminInput}
                    onChange={(e) => setAdminInput(e.target.value)}
                    disabled={!activeSession.humanOverride || isTransmitting}
                    placeholder="Escribe la transmisión al usuario..."
                    className="w-full bg-red-950/10 border border-red-900/30 text-red-100 placeholder-red-900/50 rounded-lg p-3 pl-10 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isTransmitting || !adminInput.trim() || !activeSession.humanOverride}
                  className="px-6 bg-red-900/20 text-red-500 border border-red-900/50 rounded-lg hover:bg-red-900/40 disabled:opacity-30 disabled:cursor-not-allowed font-bold tracking-widest flex items-center gap-2 transition-colors text-xs"
                >
                  <Send className="w-4 h-4" /> ENVIAR
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-green-900/50">
            <ShieldAlert className="w-16 h-16 mb-4" />
            <p className="tracking-widest font-bold text-sm">ESPERANDO CONEXIÓN DE NODO...</p>
          </div>
        )}
      </div>
    </div>
  );
}