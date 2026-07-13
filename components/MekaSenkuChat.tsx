"use client";

import { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Atom, X, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatProps {
  lang: string;
  dict: {
    title: string;
    ready: string;
    analyzing: string;
    placeholder: string;
    calculating: string;
    error: string;
  };
}

// ─── TIPADO ESTRICTO ──────────────────────────────────────────
type MessageRole = 'user' | 'ai' | 'admin';

interface LocalMessage {
  role: MessageRole;
  text: string;
}

const STORAGE_KEY = 'meka_javier_os_history';
const SESSION_STORAGE_KEY = 'meka_javier_os_session_id';

export default function MekaSenkuChat({ lang, dict }: ChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // 🔴 Cursor de tiempo para el Delta Sync (Evita colapsar la base de datos)
  const lastSyncTime = useRef<string | null>(null);

  // 1. INICIALIZACIÓN E IDENTIDAD
  useEffect(() => {
    const savedHistory = localStorage.getItem(STORAGE_KEY);
    if (savedHistory) {
      try { setMessages(JSON.parse(savedHistory)); } catch (e) {}
    }

    let currentSessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!currentSessionId) {
      currentSessionId = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : `os-node-${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem(SESSION_STORAGE_KEY, currentSessionId);
    }
    setSessionId(currentSessionId);
  }, []);

  // 2. MOTOR DE SINCRONIZACIÓN DIFERENCIAL (SHORT POLLING POST)
  useEffect(() => {
    if (!isOpen || !sessionId) return;

    const syncRadar = async () => {
      try {
        const res = await fetch('/api/chat/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            sessionId: sessionId,
            lastMessageAt: lastSyncTime.current 
          })
        });
        
        if (!res.ok) return;
        const data = await res.json();

        // Si recibimos mensajes nuevos desde tu dashboard o de la IA
        if (data.messages && data.messages.length > 0) {
          const newMessages: LocalMessage[] = data.messages.map((m: any) => ({
            role: m.role === 'ADMIN' ? 'admin' : 'ai',
            text: m.content
          }));
          
          setMessages(prev => {
            const updated = [...prev, ...newMessages];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
          });

          // Movemos el cursor de tiempo al último mensaje recibido
          const latestMessage = data.messages[data.messages.length - 1];
          if (latestMessage?.createdAt) {
            lastSyncTime.current = latestMessage.createdAt;
          }
        }
      } catch (error) {
        console.error("Fallo de telemetría diferencial:", error);
      }
    };

    // Establecemos la marca de tiempo base si es la primera carga
    if (!lastSyncTime.current) {
      lastSyncTime.current = new Date().toISOString();
    }

    // Ping inicial
    syncRadar();

    // Loop de radar cada 3 segundos
    const radarInterval = setInterval(syncRadar, 3000);
    return () => clearInterval(radarInterval);
  }, [isOpen, sessionId]);

  // 3. AUTO-SCROLL
  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, isOpen]);

  // 4. ENVÍO DE MENSAJES (COMUNICACIÓN CON LA API)
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sessionId) return; 

    // Interceptor de purgado
    if (input.trim() === 'sudo rm -rf /' || input.trim() === 'clear') {
      localStorage.removeItem(STORAGE_KEY); 
      localStorage.removeItem(SESSION_STORAGE_KEY); 
      setMessages([]); 
      const newIdentity = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() : `os-node-${Math.random().toString(36).substring(2, 15)}`;
      setSessionId(newIdentity); 
      localStorage.setItem(SESSION_STORAGE_KEY, newIdentity);
      setInput(''); 
      lastSyncTime.current = new Date().toISOString(); 
      return; 
    }

    const userMsg = input;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    const historyForApi = messages.slice(-12).map((m) => ({
      role: m.role === 'ai' || m.role === 'admin' ? 'assistant' : 'user',
      content: m.text,
    }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, lang, history: historyForApi, sessionId }),
      });
      
      const data = await res.json();
      
      // Manejamos si el endpoint colapsó
      if (!res.ok) throw new Error("Colapso de comunicación");

      // Si la IA respondió inmediatamente (no está en awaitingHuman)
      if (data.reply) {
         setMessages((prev: LocalMessage[]) => {
           // 1. Tipado explícito para evitar el "widening" de TypeScript
           const aiResponse: LocalMessage = { 
             role: 'ai', 
             text: String(data.reply) // 2. Sanitización a string
           };
           
           const updated: LocalMessage[] = [...prev, aiResponse];
           
           localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
           return updated;
         });
         
         // Actualizamos el cursor para evitar que el Polling duplique esta respuesta
         lastSyncTime.current = new Date().toISOString();
      }

      // Procesador de Acciones (Descargar CV, Abrir Links)
      if (data.action) {
        if (data.action.type === 'download_cv') {
          const link = document.createElement('a');
          link.href = data.action.url;
          link.download = 'Kevin_Javier_Montatixe_CV.pdf'; 
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else if (data.action.type === 'open_link') {
          window.open(data.action.url, '_blank');
        }
      }

    } catch (error) {
      setMessages((prev) => [...prev, { role: 'ai', text: dict.error }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-start font-mono">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20, transformOrigin: "bottom right" }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20, pointerEvents: "none" }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="flex flex-col w-[calc(100vw-3rem)] sm:w-[400px] h-[75vh] max-h-[600px] sm:h-[500px] mb-4 bg-zinc-950/90 backdrop-blur-xl border border-green-500/30 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(34,197,94,0.15)] relative"
          >
            {/* Ambient Glow */}
            <div className="absolute top-0 right-1/2 -translate-x-1/2 w-64 h-32 bg-green-500/10 blur-[100px] pointer-events-none" />

            {/* Cabecera */}
            <div className="flex items-center justify-between p-4 bg-black/60 border-b border-green-500/30 z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/30">
                  <Terminal className="text-green-400 w-5 h-5" />
                </div>
                <span className="text-green-400 font-bold tracking-widest text-sm">
                  MEKA_JAVIER_OS
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-green-500/60 text-xs font-semibold mr-2">
                  <Atom className="w-4 h-4 animate-[spin_4s_linear_infinite]" />
                  <span>E=mc²</span>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="text-green-500/60 hover:text-green-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Área de Mensajes */}
            <div 
              ref={scrollRef} 
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4 scroll-smooth z-10 scrollbar-thin"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(34,197,94,0.3) transparent' }}
            >
              {messages.length === 0 && (
                <div className="text-center text-green-500/50 text-sm mt-10 space-y-2">
                  <p>{dict.ready}</p>
                  <p>{dict.analyzing}</p>
                </div>
              )}
              
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {/* Lógica condicional de estilos para Rol Admin vs IA vs Usuario */}
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-green-600/10 text-green-100 border border-green-500/30 rounded-br-sm' 
                      : msg.role === 'admin'
                        ? 'bg-red-950/40 text-red-100 border border-red-500/50 rounded-bl-sm shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                        : 'bg-black/60 text-green-300 border border-zinc-800 rounded-bl-sm shadow-inner'
                  }`}>
                    {msg.role === 'admin' && (
                      <span className="block text-[10px] text-red-500/80 mb-1 font-bold tracking-widest uppercase">
                        MEKA_OS // SYS_ADMIN
                      </span>
                    )}
                    {msg.text}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 bg-black/60 text-green-500/70 p-3 rounded-2xl rounded-bl-sm text-sm border border-zinc-800">
                    <Atom className="w-4 h-4 animate-spin" />
                    {dict.calculating}
                  </div>
                </div>
              )}
            </div>

            {/* Formulario de Entrada */}
            <form onSubmit={sendMessage} className="p-3 bg-black/60 border-t border-green-500/30 z-10 shrink-0">
              <div className="flex relative group">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 font-bold text-sm">~/$</span>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={dict.placeholder}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-10 text-green-100 text-sm placeholder-green-700/40 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all"
                />
                <button 
                  type="submit" 
                  disabled={isLoading || !input.trim() || !sessionId}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 hover:text-green-300 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón Flotante */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="flex items-center justify-center w-14 h-14 bg-black border border-green-500/50 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transition-shadow group"
          >
            <MessageSquare className="w-6 h-6 text-green-400 group-hover:text-green-300" />
            <span className="absolute top-0 right-0 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}