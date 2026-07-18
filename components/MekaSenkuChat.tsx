"use client";

import { useState, useRef, useEffect } from 'react';
import { Send, X, Terminal, Atom } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sentraGetAccessToken } from '@/lib/sentra/api';

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

type MessageRole = 'user' | 'ai' | 'admin';

interface LocalMessage {
  serverId?: string; 
  role: MessageRole;
  text: string;
}

const STORAGE_KEY = 'meka_javier_os_history';
const SESSION_STORAGE_KEY = 'meka_javier_os_session_id';
const ACTIVITY_STORAGE_KEY = 'meka_javier_os_last_activity';
const SYNC_INTERVAL_MS = 3000;
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const GREETING_DELAY_MS = 2000; 

// ─── AVATAR UX: Cara Hacker SVG Dinámica ───
function HackerFace({ size = 32, isLive = false }: { size?: number; isLive?: boolean }) {
  const primaryColor = isLive ? '#ef4444' : '#22c55e';
  const eyeColor = isLive ? '#f87171' : '#4ade80';

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="10" width="52" height="44" rx="10" stroke={primaryColor} strokeWidth="2.5" fill="#020617" className="transition-colors duration-500" />
      <line x1="32" y1="10" x2="32" y2="3" stroke={primaryColor} strokeWidth="2.5" className="transition-colors duration-500" />
      <circle cx="32" cy="3" r="2.5" fill={primaryColor} className="transition-colors duration-500">
        <animate attributeName="opacity" values="1;0.3;1" dur={isLive ? "0.8s" : "1.6s"} repeatCount="indefinite" />
      </circle>
      <rect x="8" y="10" width="48" height="2" fill={primaryColor} opacity="0.35" className="transition-colors duration-500">
        <animate attributeName="y" values="14;50;14" dur="3.2s" repeatCount="indefinite" />
      </rect>
      <g>
        <rect x="18" y="26" width="9" height="9" rx="2" fill={eyeColor} className="transition-colors duration-500">
          <animate attributeName="height" values="9;9;1;9;9" keyTimes="0;0.85;0.9;0.95;1" dur="4s" repeatCount="indefinite" />
          <animate attributeName="y" values="26;26;30;26;26" keyTimes="0;0.85;0.9;0.95;1" dur="4s" repeatCount="indefinite" />
        </rect>
        <rect x="37" y="26" width="9" height="9" rx="2" fill={eyeColor} className="transition-colors duration-500">
          <animate attributeName="height" values="9;9;1;9;9" keyTimes="0;0.85;0.9;0.95;1" dur="4s" repeatCount="indefinite" />
          <animate attributeName="y" values="26;26;30;26;26" keyTimes="0;0.85;0.9;0.95;1" dur="4s" repeatCount="indefinite" />
        </rect>
      </g>
      <rect x="24" y="42" width="16" height="3" fill={primaryColor} className="transition-colors duration-500">
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
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isHumanLive, setIsHumanLive] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const initialWelcomeMessage: LocalMessage = {
    serverId: 'sys-init',
    role: 'ai',
    text: lang === 'en' 
      ? "INITIALIZING KERNEL...\nMEKA_OS v2.0 ONLINE.\n\nGreetings. I am the AI architected by Cesc Javier. I am authorized to discuss his tech stack or establish a secure contact line.\n\nSpecify your query to begin. E=mc²"
      : "INICIANDO KERNEL...\nMEKA_OS v2.0 EN LÍNEA.\n\nSaludos. Soy la IA diseñada por Cesc Javier. Estoy autorizada para analizar su stack tecnológico o establecer contacto directo.\n\nIngresa tu consulta para comenzar. E=mc²"
  };

  const updateActivity = () => {
    localStorage.setItem(ACTIVITY_STORAGE_KEY, Date.now().toString());
  };

  // Lógica de Saludo Flotante
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

  // TTL & Sesión
  useEffect(() => {
    let currentSessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    const lastActivity = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    const now = Date.now();

    if (currentSessionId && lastActivity && (now - parseInt(lastActivity, 10) > SESSION_TIMEOUT_MS)) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
      currentSessionId = null;
    }

    if (!currentSessionId) {
      currentSessionId = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : `os-node-${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem(SESSION_STORAGE_KEY, currentSessionId);
      updateActivity();
    }

    setSessionId(currentSessionId);

    const savedHistory = localStorage.getItem(STORAGE_KEY);
    if (savedHistory) {
      try { 
        setMessages(JSON.parse(savedHistory));
      } catch (e) {
        setMessages([initialWelcomeMessage]);
      }
    } else {
      setMessages([initialWelcomeMessage]);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([initialWelcomeMessage]));
    }
  }, [lang]);

  useEffect(() => {
    if (messages.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, isOpen, isHumanLive]);

  // Radar invulnerable
  useEffect(() => {
    if (!isOpen || !sessionId) return;

    const syncMessages = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/chat/sync?sessionId=${encodeURIComponent(sessionId)}&t=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
          headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
        });
        if (!res.ok) return;

        const data = await res.json();
        
        if (typeof data.humanOverride === 'boolean') {
          setIsHumanLive(data.humanOverride);
        }

        if (data.messages && data.messages.length > 0) {
          setMessages((prev) => {
            const incomingNew = data.messages.filter((serverMsg: any) => 
              !prev.some(localMsg => 
                localMsg.serverId === serverMsg.id || 
                (localMsg.text === serverMsg.content && !localMsg.serverId)
              )
            );

            if (incomingNew.length === 0) return prev;

            const formattedNew = incomingNew.map((m: any) => ({
              serverId: m.id,
              role: m.role === 'ADMIN' ? 'admin' : 'ai',
              text: m.content
            }));
            
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
  }, [isOpen, sessionId]);

  const openChat = () => {
    setIsOpen(true);
    setShowGreeting(false);
    setGreetingDismissed(true);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sessionId) return; 

    updateActivity();
    const userText = input.trim();
    
    if (userText === 'sudo rm -rf /' || userText === 'clear') {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(ACTIVITY_STORAGE_KEY);
      
      const newIdentity = crypto.randomUUID();
      setSessionId(newIdentity);
      localStorage.setItem(SESSION_STORAGE_KEY, newIdentity);
      
      setMessages([initialWelcomeMessage]);
      setIsHumanLive(false);
      setInput('');
      return;
    }

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    const historyForApi = messages.slice(-12).map((m) => ({
      role: m.role === 'ai' || m.role === 'admin' ? 'assistant' : 'user',
      content: m.text,
    }));

    try {
      // Si hay sesión de Sentra activa, mandamos el token: el server la
      // valida y vincula esta conversación a la cuenta del usuario.
      const sentraToken = sentraGetAccessToken();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sentraToken ? { Authorization: `Bearer ${sentraToken}` } : {}),
        },
        body: JSON.stringify({ message: userText, lang, history: historyForApi, sessionId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error("Colapso de comunicación");

      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
        localStorage.setItem(SESSION_STORAGE_KEY, data.sessionId);
      }

      if (data.awaitingHuman) {
        setIsHumanLive(true);
        setIsLoading(false);
        return;
      }

      setIsHumanLive(false);

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
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 blur-[100px] pointer-events-none transition-colors duration-500 ${isHumanLive ? 'bg-red-500/10' : 'bg-green-500/10'}`} />

            <div className={`flex items-center justify-between p-3.5 sm:p-4 bg-black/70 border-b z-10 shrink-0 transition-colors duration-500 ${isHumanLive ? 'border-red-500/30' : 'border-green-500/30'}`}>
              <div className="flex items-center gap-2.5">
                <div className={`p-1 rounded-lg border shrink-0 transition-colors duration-500 ${isHumanLive ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                  <HackerFace size={26} isLive={isHumanLive} />
                </div>
                <span className={`font-bold tracking-widest text-xs sm:text-sm transition-colors duration-500 ${isHumanLive ? 'text-red-400' : 'text-green-400'}`}>
                  {isHumanLive ? 'SYS_ADMIN // JAVIER' : 'MEKA_JAVIER_OS'}
                </span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <AnimatePresence>
              {isHumanLive && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-red-950/60 border-b border-red-900/50 flex items-center justify-center py-2 shrink-0 shadow-inner"
                >
                  <span className="text-[10px] text-red-400 font-bold tracking-widest uppercase flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    {lang === 'en' ? 'Direct connection secured' : 'Conexión directa establecida'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            <div
              ref={scrollRef}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-4 space-y-3.5 sm:space-y-4 scroll-smooth z-10 scrollbar-thin"
              style={{ scrollbarWidth: 'thin', scrollbarColor: isHumanLive ? 'rgba(239,68,68,0.3) transparent' : 'rgba(34,197,94,0.3) transparent' }}
            >
              {messages.length === 0 && (
                <div className="text-center text-green-500/50 text-sm mt-10 space-y-2">
                  <p>{dict.ready}</p>
                  <p>{dict.analyzing}</p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-zinc-800/50 text-zinc-100 border border-zinc-700/50 rounded-br-sm'
                      : msg.role === 'admin'
                        ? 'bg-red-950/40 text-red-100 border border-red-500/40 rounded-bl-sm shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                        : 'bg-black/60 text-green-300 border border-green-900/50 rounded-bl-sm shadow-inner'
                  }`}>
                    {msg.role === 'admin' && (
                        <span className="block text-[10px] text-red-500/80 mb-1 font-bold tracking-widest uppercase">
                          SYS_ADMIN
                        </span>
                    )}
                    {msg.text}
                  </div>
                </div>
              ))}

              {isLoading && !isHumanLive && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 bg-black/60 text-green-500/70 p-3 rounded-2xl rounded-bl-sm text-sm border border-zinc-800">
                    <Atom className="w-4 h-4 animate-spin" />
                    {dict.calculating}
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={sendMessage} className={`p-2.5 sm:p-3 bg-black/70 border-t z-10 shrink-0 transition-colors duration-500 ${isHumanLive ? 'border-red-500/30' : 'border-green-500/30'}`}>
              <div className="flex relative group">
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm transition-colors duration-500 ${isHumanLive ? 'text-red-500' : 'text-green-500'}`}>~/$</span>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={dict.placeholder}
                  className={`w-full bg-zinc-900/50 border rounded-xl py-2.5 pl-10 pr-10 text-zinc-100 text-sm focus:outline-none focus:ring-1 transition-all ${
                    isHumanLive 
                      ? 'border-red-900/50 placeholder-red-700/40 focus:border-red-500/50 focus:ring-red-500/50' 
                      : 'border-zinc-800 placeholder-green-700/40 focus:border-green-500/50 focus:ring-green-500/50'
                  }`}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-all ${
                    isHumanLive
                      ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-300'
                      : 'bg-green-500/10 text-green-500 hover:bg-green-500/20 hover:text-green-300'
                  }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔴 CONTENEDOR RELATIVO PARA EL CTA Y EL AVATAR */}
      <div className="relative flex flex-col items-end">
        
        {/* Globo de Diálogo (CTA Reclutadores) */}
        <AnimatePresence>
          {!isOpen && showGreeting && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 15 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              onClick={openChat}
              className="absolute bottom-full right-0 mb-5 w-64 sm:w-72 cursor-pointer bg-zinc-950/95 border border-green-500/50 rounded-2xl p-4 shadow-[0_0_40px_rgba(34,197,94,0.2)] group z-50 origin-bottom-right"
            >
              <div className="absolute inset-0 bg-green-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <button
                onClick={(e) => { e.stopPropagation(); setShowGreeting(false); setGreetingDismissed(true); }}
                className="absolute -top-2 -right-2 bg-zinc-900 border border-green-500/50 rounded-full p-1 text-green-500/70 hover:text-white transition-colors z-10 hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="relative z-0 flex items-start gap-3">
                <span className="text-2xl animate-bounce mt-1">👋</span>
                <div>
                  <h4 className="text-green-400 font-bold text-xs sm:text-sm tracking-widest uppercase mb-1">
                    {lang === 'en' ? 'Incoming Signal' : 'Señal Entrante'}
                  </h4>
                  <p className="text-zinc-200 text-xs sm:text-sm leading-relaxed font-medium">
                    {lang === 'en' 
                      ? "Hi! I'm Javier's AI. Looking for a Fullstack & Cybersecurity Engineer? Let's chat!" 
                      : "¡Hola! Soy la IA de Javier. ¿Buscas un Ingeniero Fullstack y Ciberseguridad? ¡Hablemos!"}
                  </p>
                </div>
              </div>

              {/* Cola del globo apuntando al avatar */}
              <div className="absolute -bottom-2 right-5 w-4 h-4 bg-zinc-950 border-b border-r border-green-500/50 transform rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botón Avatar Principal */}
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={openChat}
              className="relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-[#020617] border border-green-500/50 rounded-2xl shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_40px_rgba(34,197,94,0.6)] transition-shadow z-40"
            >
              <HackerFace size={34} isLive={false} />
              <span className="absolute top-1 right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 shadow-[0_0_10px_#22c55e]"></span>
              </span>
            </motion.button>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}