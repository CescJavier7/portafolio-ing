'use client';

import { useOptimistic, useTransition, useRef } from 'react';
import { toggleHumanOverrideAction, sendAdminReply } from '../actions';

// ─── DEFINICIÓN ESTRICTA DE TIPOS (Solución a los errores) ──────────────
export type MessagePreview = {
  id: string;
  role: 'USER' | 'AI' | 'ADMIN';
  content: string;
};

export type ChatSessionPreview = {
  id: string;
  humanOverride: boolean;
  status: 'ACTIVE' | 'PENDING_REVIEW' | 'CLOSED';
  updatedAt: Date | string; // Soporte para hidratación SSR (Date -> string)
  messages: MessagePreview[];
};

// ─── COMPONENTE PRINCIPAL ───────────────────────────────────────────────
export function RadarDashboard({ initialSessions }: { initialSessions: ChatSessionPreview[] }) {
  const [isPending, startTransition] = useTransition();
  const formRefs = useRef<{ [key: string]: HTMLFormElement | null }>({});

  const [optimisticSessions, addOptimisticAction] = useOptimistic(
    initialSessions,
    (
      state,
      action: 
        | { type: 'TOGGLE_OVERRIDE'; id: string; humanOverride: boolean }
        | { type: 'ADD_MESSAGE'; id: string; message: MessagePreview }
    ) => {
      if (action.type === 'TOGGLE_OVERRIDE') {
        return state.map(s => s.id === action.id ? { ...s, humanOverride: action.humanOverride } : s);
      }
      if (action.type === 'ADD_MESSAGE') {
        return state.map(s => s.id === action.id ? { ...s, messages: [...(s.messages || []), action.message] } : s);
      }
      return state;
    }
  );

  const handleOverrideToggle = async (id: string, currentStatus: boolean) => {
    const newState = !currentStatus;
    startTransition(async () => {
      addOptimisticAction({ type: 'TOGGLE_OVERRIDE', id, humanOverride: newState });
      await toggleHumanOverrideAction(id, newState);
    });
  };

  const handleSendReply = async (e: React.FormEvent<HTMLFormElement>, sessionId: string) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const replyContent = formData.get('reply') as string;
    
    if (!replyContent || replyContent.trim() === '') return;

    // Reseteo inmediato del formulario
    if (formRefs.current[sessionId]) {
      formRefs.current[sessionId]!.reset();
    }

    // Objeto temporal que cumple estrictamente con MessagePreview
    const tempMessage: MessagePreview = {
      id: `temp-${Date.now()}`,
      role: 'ADMIN',
      content: replyContent
    };

    startTransition(async () => {
      addOptimisticAction({ type: 'ADD_MESSAGE', id: sessionId, message: tempMessage });
      await sendAdminReply(sessionId, replyContent);
    });
  };

  return (
    <div className="mt-8 space-y-6 font-mono">
      {!optimisticSessions || optimisticSessions.length === 0 ? (
        <p className="text-gray-500 animate-pulse">[+] NO INCOMING SIGNALS DETECTED...</p>
      ) : (
        optimisticSessions.map((session) => (
          <div key={session.id} className="border border-green-800/50 p-4 bg-black/60 relative flex flex-col md:flex-row gap-4">
            
            {/* Visualizador de Logs */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar mb-4">
                <p className="text-xs text-green-600 border-b border-green-900 pb-1 mb-2 sticky top-0 bg-black/90 z-10">
                  SESSION_ID: {session.id} | STATUS: {session.status}
                </p>
                {/* 🔴 Defensa: session.messages?.map previene colapsos si no hay array */}
                {session.messages?.map((msg) => (
                  <div key={msg.id} className={`text-sm flex gap-2 ${msg.role === 'USER' ? 'text-blue-400' : msg.role === 'ADMIN' ? 'text-red-400 font-bold' : 'text-green-300'}`}>
                    <span className="opacity-50 shrink-0">[{msg.role}]</span>
                    <span className="break-words">{msg.content}</span>
                  </div>
                ))}
              </div>

              {/* Input de Comando */}
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

            {/* Panel Lateral */}
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
                LAST_PING:<br/>{new Date(session.updatedAt).toLocaleTimeString()}
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