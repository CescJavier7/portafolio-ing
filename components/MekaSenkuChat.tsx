"use client";

import { useState, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';
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
    greeting?: string;
  };
}

const STORAGE_KEY = 'meka_javier_os_history';
const SESSION_STORAGE_KEY = 'meka_javier_os_session_id';
const SYNC_INTERVAL_MS = 3000;
const GREETING_DELAY_MS = 1800; 

function HackerFace({ size = 32, awaitingHuman = false }: { size?: number; awaitingHuman?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="10" width="52" height="44" rx="10" stroke="#22c55e" strokeWidth="2.5" fill="#020617" />
      <line x1="32" y1="10" x2="32" y2="3" stroke="#22c55e" strokeWidth="2.5" />
      <circle cx="32" cy="3" r="2.5" fill={awaitingHuman ? '#f59e0b' : '#22c55e'}>
        <animate attributeName="opacity" values="1;0.3;1" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <rect x="8" y="10" width="48" height="2" fill="#22c55e" opacity="0.35">
        <animate attributeName="y" values="14;50;14" dur="3.2s" repeatCount="indefinite" />
      </rect>
      <g>
        <rect x="18" y="26" width="9" height="9" rx="2" fill="#4ade80">
          <animate attributeName="height" values="9;9;1;9;9" keyTimes="0;0.85;0.9;0.95;1" dur="4s" repeatCount="indefinite" />
          <animate attributeName="y" values="26;26;30;26;26" keyTimes="0;0.85;0.9;0.95;1" dur="4s" repeatCount="indefinite" />
        </rect>
        <rect x="37" y="26" width="9" height="9" rx="2" fill="#4ade80">
          <animate attributeName="height" values="9;9;1;9;9" keyTimes="0;0.85;0.9;0.95;1" dur="4s" repeatCount="indefinite" />
          <animate attributeName="y" values="26;26;30;26;26" keyTimes="0;0.85;0.9;0.95;1" dur="4s" repeatCount="indefinite" />
        </rect>
      </g>
      <rect x="24" y="42" width="16" height="3" fill="#22c55e">
        <animate attributeName="opacity" values="1;1;0;0;1" keyTimes="0;0.5;0.51;0.99;1" dur="1.2s" repeatCount="indefinite" />
      </rect>
    </svg>
  );
}

export default function MekaSenkuChat({ lang, dict }: ChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [greetingDismissed, setGreetingDismissed] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai' | 'admin', text: string, serverId?: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [awaitingHuman, setAwaitingHuman] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const greetingText = dict.greeting || (lang === 'en' ? "Hi, I'm Javier's AI" : "Hola, soy la IA de Javier");

  useEffect(() => {
    if (isOpen || greetingDismissed) return;
    const alreadyGreeted = sessionStorage.getItem('meka_greeted');
    if (alreadyGreeted) return;

    const timer = setTimeout(() => {
      setShowGreeting(true);
      sessionStorage.setItem('meka_greeted', '1');
    }, GREETING_DELAY_MS);

    return () => clearTimeout(timer);
  }, [isOpen, greetingDismissed]);

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
    if (savedSessionId) setSessionId(savedSessionId);
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, isOpen, awaitingHuman]);

  useEffect(() => {
    if (!isOpen || !sessionId) return;

    const syncMessages = async () => {
      if (document.hidden) return;
      try {
        // 🔴 FIX: Cache-buster inyectado para forzar la actualización en tiempo real
        const res = await fetch(`/api/chat/sync?sessionId=${encodeURIComponent(sessionId)}&t=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
          headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
        });
        if (!res.ok) return;

        const data = await res.json();
        
        if (data.messages && data.messages.length > 0) {
          setMessages((prev) => {
            const incomingNew = data.messages.filter((serverMsg: any) => 
              !prev.some(localMsg => 
                localMsg.serverId === serverMsg.id || 
                (localMsg.text === serverMsg.content && !localMsg.serverId)
              )
            );

            if (incomingNew.length === 0) {
               // Si no hay mensajes nuevos, revisamos si el admin liberó la IA
               if (data.humanOverride === false && awaitingHuman) {
                 setAwaitingHuman(false);
               }
               return prev;
            }

            const formattedNew = incomingNew.map((m: any) => ({
              serverId: m.id,
              role: m.role === 'ADMIN' ? 'admin' : 'ai',
              text: m.content
            }));
            
            setAwaitingHuman(false); 
            setIsLoading(false);
            
            return [...prev, ...formattedNew];
          });
        }
      } catch (error) {
        console.error("Error sincronizando mensajes:", error);
      }
    };

    syncMessages();
    syncIntervalRef.current = setInterval(syncMessages, SYNC_INTERVAL_MS);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [isOpen, sessionId, awaitingHuman]);

  const openChat = () => {
    setIsOpen(true);
    setShowGreeting(false);
    setGreetingDismissed(true);
  };

  const dismissGreeting = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowGreeting(false);
    setGreetingDismissed(true);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (input.trim() === 'sudo rm -rf /' || input.trim() === 'clear') {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SESSION_STORAGE_KEY);
      setMessages([]);
      setSessionId(undefined);
      setAwaitingHuman(false);
      setInput('');
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
      if (!res.ok) throw new Error(data.error || "Colapso de comunicación");

      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
        localStorage.setItem(SESSION_STORAGE_KEY, data.sessionId);
      }

      if (data.awaitingHuman) {
        setAwaitingHuman(true);
        setIsLoading(false);
        return;
      }

      // 🔴 FIX: Destruimos el estado "humano revisando" si la IA contesta
      setAwaitingHuman(false);

      if (data.reply) {
        setMessages((prev) => [...prev, { role: 'ai', text: data.reply }]);
      }

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
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end font-mono">

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 24, transformOrigin: "bottom right" }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 24, pointerEvents: "none" }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="flex flex-col w-[calc(100vw-2rem)] sm:w-[400px] h-[70vh] max-h-[600px] sm:h-[520px] mb-3 bg-zinc-950/95 backdrop-blur-xl border border-green-500/30 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(34,197,94,0.18)] relative"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-green-500/10 blur-[100px] pointer-events-none" />

            <div className="flex items-center justify-between p-3.5 sm:p-4 bg-black/70 border-b border-green-500/30 z-10 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1 bg-green-500/10 rounded-lg border border-green-500/30 shrink-0">
                  <HackerFace size={26} awaitingHuman={awaitingHuman} />
                </div>
                <span className="text-green-400 font-bold tracking-widest text-xs sm:text-sm">
                  MEKA_JAVIER_OS
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-green-500/60 hover:text-green-400 transition-colors p-1"
                aria-label="Cerrar chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-4 space-y-3.5 sm:space-y-4 scroll-smooth z-10 scrollbar-thin"
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
                    <HackerFace size={16} />
                    {dict.calculating}
                  </div>
                </div>
              )}

              {awaitingHuman && !isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 bg-amber-950/30 text-amber-400 p-3 rounded-2xl rounded-bl-sm text-sm border border-amber-800/50">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    {lang === 'en' ? 'A human is reviewing your message. One moment...' : 'Un humano está revisando tu mensaje. Un momento...'}
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={sendMessage} className="p-2.5 sm:p-3 bg-black/70 border-t border-green-500/30 z-10 shrink-0">
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
                  aria-label="Enviar mensaje"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isOpen && showGreeting && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            onClick={openChat}
            className="mb-3 max-w-[210px] sm:max-w-[240px] cursor-pointer bg-zinc-950/95 border border-green-500/40 rounded-2xl rounded-br-sm px-4 py-3 shadow-[0_0_30px_rgba(34,197,94,0.15)] relative"
          >
            <button
              onClick={dismissGreeting}
              className="absolute -top-2 -right-2 bg-zinc-900 border border-green-500/40 rounded-full p-0.5 text-green-500/70 hover:text-green-300 transition-colors"
              aria-label="Cerrar mensaje"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <p className="text-green-300 text-xs sm:text-sm leading-snug">{greetingText}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={openChat}
            className="relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-black border border-green-500/50 rounded-2xl shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_32px_rgba(34,197,94,0.5)] transition-shadow"
            aria-label="Abrir chat con la IA de Javier"
          >
            <HackerFace size={34} />
            <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}