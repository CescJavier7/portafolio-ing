"use client";

import { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Atom, X, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Definimos la interfaz estricta en TypeScript
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

const STORAGE_KEY = 'meka_javier_os_history';
const SESSION_STORAGE_KEY = 'meka_javier_os_session_id';

export default function MekaSenkuChat({ lang, dict }: ChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Cargar historial y sessionId del localStorage al montar el componente
  //    (Evita errores de hidratación en Next.js)
  useEffect(() => {
    const savedHistory = localStorage.getItem(STORAGE_KEY);
    if (savedHistory) {
      try {
        setMessages(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Error parseando el historial de memoria local.");
      }
    }

    const savedSessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (savedSessionId) {
      setSessionId(savedSessionId);
    }
  }, []);

  // 2. Guardar en localStorage cada vez que el array de mensajes cambia
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // 3. Auto-scroll al fondo cuando hay nuevos mensajes o se abre el chat
  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, isOpen]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // INTERCEPTOR DE COMANDOS (Debe ir aquí arriba)
    if (input.trim() === 'sudo rm -rf /' || input.trim() === 'clear') {
      localStorage.removeItem(STORAGE_KEY); // Limpiamos la memoria del navegador
      localStorage.removeItem(SESSION_STORAGE_KEY); // Limpiamos también la sesión
      setMessages([]); // Limpiamos la pantalla
      setSessionId(undefined); // Reiniciamos la sesión en memoria
      setInput(''); // Limpiamos el input
      return; // Cortamos la ejecución para no llamar a la API
    }

    const userMsg = input;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    // Cuántos turnos previos mandamos al backend. El backend también aplica
    // su propio tope (por si acaso), pero recortamos aquí para no mandar
    // sesiones larguísimas completas en cada request.
    const MAX_HISTORY_MESSAGES = 12;

    // El backend espera { role: 'user' | 'assistant', content: string },
    // pero este componente guarda { role: 'user' | 'ai', text: string } —
    // los traducimos aquí. Usamos el `messages` de ANTES de agregar userMsg
    // (la actualización de arriba es async, así que esta closure todavía ve
    // el estado viejo) — exactamente lo que queremos: el historial previo,
    // sin duplicar el mensaje que ya viaja por separado en `message`.
    const historyForApi = messages.slice(-MAX_HISTORY_MESSAGES).map((m) => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.text,
    }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, lang, history: historyForApi, sessionId }),
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.reply) {
        throw new Error(data.error || "Colapso de comunicación");
      }

      // Guardamos/actualizamos el sessionId para que las próximas peticiones
      // se asocien a la misma ChatSession en vez de crear una nueva cada vez.
      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
        localStorage.setItem(SESSION_STORAGE_KEY, data.sessionId);
      }

      // 1. Mostramos el mensaje de texto en el chat
      setMessages((prev) => [...prev, { role: 'ai', text: data.reply }]);

      // 2. NUEVO: Procesamos las acciones de UI (Tool Calling)
      if (data.action) {
        if (data.action.type === 'download_cv') {
          // Técnica de inyección de enlace invisible para descargas
          const link = document.createElement('a');
          link.href = data.action.url;
          link.download = 'Kevin_Javier_Montatixe_CV.pdf'; // Mismo nombre que usa ContactApple.tsx
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else if (data.action.type === 'open_link') {
          // Abrir repositorios o redes sociales en una nueva pestaña
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
    // Contenedor fijo en la esquina inferior izquierda
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-start font-mono">
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20, transformOrigin: "bottom right" }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20, pointerEvents: "none" }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            // 1. AJUSTE RESPONSIVO: Altura dinámica (h-[75vh]) en móviles y fija en PC.
            className="flex flex-col w-[calc(100vw-3rem)] sm:w-[400px] h-[75vh] max-h-[600px] sm:h-[500px] mb-4 bg-zinc-950/90 backdrop-blur-xl border border-green-500/30 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(34,197,94,0.15)] relative"
          >
            {/* Efecto de brillo de fondo */}
            <div className="absolute top-0 right-1/2 -translate-x-1/2 w-64 h-32 bg-green-500/10 blur-[100px] pointer-events-none" />

            {/* Header UI (Se mantiene igual) */}
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

            {/* 2. EL PARCHE DE SCROLL: min-h-0 y overscroll-contain */}
            <div 
              ref={scrollRef} 
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4 scroll-smooth z-10 scrollbar-thin"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(34,197,94,0.3) transparent' }} // Estilo nativo para la barra
            >
              {messages.length === 0 && (
                <div className="text-center text-green-500/50 text-sm mt-10 space-y-2">
                  <p>{dict.ready}</p>
                  <p>{dict.analyzing}</p>
                </div>
              )}
              
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-green-600/10 text-green-100 border border-green-500/30 rounded-br-sm' 
                      : 'bg-black/60 text-green-300 border border-zinc-800 rounded-bl-sm shadow-inner'
                  }`}>
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

            {/* Input de Comandos (shrink-0 para que no se aplaste) */}
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
                  disabled={isLoading || !input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 hover:text-green-300 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón Flotante (FAB) */}
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
            
            {/* Ping animation para llamar la atención */}
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