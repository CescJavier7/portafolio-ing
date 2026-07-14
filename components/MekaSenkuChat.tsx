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

export default function MekaSenkuChat({ lang, dict }: ChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [awaitingHuman, setAwaitingHuman] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

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
        const parsed = JSON.parse(savedHistory);
        setMessages(parsed.length > 0 ? parsed : [initialWelcomeMessage]);
      } catch (e) {
        setMessages([initialWelcomeMessage]);
      }
    } else {
      setMessages([initialWelcomeMessage]);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([initialWelcomeMessage]));
    }
  }, [lang]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (!isOpen || !sessionId) return;

    const syncMessages = async () => {
      if (document.hidden) return; 
      
      try {
        // 🔴 FIX: Cache-Buster inyectado para forzar la actualización en tiempo real
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

            if (incomingNew.length === 0) return prev;

            const formattedNew: LocalMessage[] = incomingNew.map((m: any) => ({
              serverId: m.id,
              role: m.role === 'ADMIN' ? 'admin' : 'ai',
              text: m.content
            }));
            
            updateActivity();
            // Si llega mensaje nuevo del server, apagamos el indicador
            setAwaitingHuman(false); 
            setIsLoading(false);
            
            return [...prev, ...formattedNew];
          });
        }
      } catch (error) {
        console.error("Fallo de telemetría de sincronización:", error);
      }
    };

    syncMessages(); 
    const radarInterval = setInterval(syncMessages, SYNC_INTERVAL_MS);
    return () => clearInterval(radarInterval);
  }, [isOpen, sessionId]);

  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, isOpen, awaitingHuman]);

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
      setAwaitingHuman(false);
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
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, lang, history: historyForApi, sessionId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error("Colapso de comunicación");

      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
        localStorage.setItem(SESSION_STORAGE_KEY, data.sessionId);
      }

      if (data.awaitingHuman) {
        setAwaitingHuman(true);
        setIsLoading(false);
        return;
      }

      // 🔴 FIX MÁQUINA DE ESTADOS: Si la IA contesta normalmente, 
      // destruimos el estado "Un humano está revisando".
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
            <div className="absolute top-0 right-1/2 -translate-x-1/2 w-64 h-32 bg-green-500/10 blur-[100px] pointer-events-none" />

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
                <button onClick={() => setIsOpen(false)} className="text-green-500/60 hover:text-green-400 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div 
              ref={scrollRef} 
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4 scroll-smooth z-10 scrollbar-thin"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(34,197,94,0.3) transparent' }}
            >
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div 
                    key={msg.serverId || `local-${i}`}
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
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
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                  <div className="flex items-center gap-2 bg-black/60 text-green-500/70 p-3 rounded-2xl rounded-bl-sm text-sm border border-zinc-800">
                    <Atom className="w-4 h-4 animate-spin" />
                    {dict.calculating}
                  </div>
                </motion.div>
              )}

              {awaitingHuman && !isLoading && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex justify-start">
                  <div className="flex items-center gap-2 bg-amber-950/30 text-amber-400 p-3 rounded-2xl rounded-bl-sm text-sm border border-amber-800/50">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    Un humano está revisando tu mensaje. Un momento...
                  </div>
                </motion.div>
              )}
            </div>

            <form onSubmit={sendMessage} className="p-3 bg-black/60 border-t border-green-500/30 z-10 shrink-0">
              <div className="flex relative group">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 font-bold text-sm">~/$</span>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={dict.placeholder}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-10 text-green-100 text-sm placeholder-green-700/40 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all"
                  disabled={!sessionId}
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