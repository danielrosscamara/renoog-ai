import React from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { MessageBubble } from './components/chat/MessageBubble';
import { useChatStore } from './stores/useChatStore';
import { Bot } from 'lucide-react';

export const App: React.FC = () => {
  const {
    activeChatId,
    chats,
    characters,
    personas,
    messageTurns,
    activePersonaId,
    activeView,
    setSwipeIndex,
    rerollMessage,
  } = useChatStore();

  const currentChat = chats.find((c) => c.id === activeChatId);
  const currentChar = characters.find((c) => c.id === currentChat?.character_id);
  const currentPersona = personas.find((p) => p.id === activePersonaId) || personas[0];
  const activeTurns = activeChatId ? messageTurns[activeChatId] || [] : [];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#121214] text-zinc-100">
      {/* 1. Collapsible Sidebar */}
      <Sidebar />

      {/* 2. Chat Stage Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#121214]">
        {activeView === 'chat' && currentChat && currentChar ? (
          <>
            {/* Chat Top Header */}
            <header className="flex items-center justify-between px-6 py-3.5 border-b border-[#27272a] bg-[#18181b]/80 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={currentChar.avatar_url}
                    alt={currentChar.name}
                    className="w-10 h-10 rounded-full object-cover ring-1 ring-zinc-700"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#18181b]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base text-white">{currentChar.name}</h2>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {currentChat.model_name.split('/')[1] || 'Claude 3.5'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 truncate max-w-md">{currentChar.tagline}</p>
                </div>
              </div>
            </header>

            {/* Scrollable Message List */}
            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-4 max-w-4xl w-full mx-auto">
              {activeTurns.map((turn) => (
                <MessageBubble
                  key={turn.id}
                  turn={turn}
                  character={currentChar}
                  persona={currentPersona}
                  onSwipeChange={(turnId, newIndex) => {
                    if (activeChatId) setSwipeIndex(activeChatId, turnId, newIndex);
                  }}
                  onReroll={(turnId) => {
                    if (activeChatId) rerollMessage(activeChatId, turnId);
                  }}
                />
              ))}
            </div>
          </>
        ) : (
          /* Placeholder View for Discover / Personas / Settings */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="max-w-md p-6 rounded-2xl bg-[#18181b] border border-[#27272a] shadow-xl">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                <Bot className="w-6 h-6" />
              </div>
              <span className="inline-block px-3 py-1 mb-2 text-xs font-semibold text-blue-400 bg-blue-500/10 rounded-full border border-blue-500/20">
                VIEW: {activeView.toUpperCase()}
              </span>
              <h2 className="text-lg font-bold text-white mb-2">View under construction</h2>
              <p className="text-xs text-zinc-400 mb-4">
                Click any chat in the sidebar to return to the interactive conversation stage!
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
