import React, { useRef, useEffect, useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { MessageBubble } from './components/chat/MessageBubble';
import { ChatInputBar } from './components/chat/ChatInputBar';
import { CharacterGallery } from './components/gallery/CharacterGallery';
import { PersonaManager } from './components/personas/PersonaManager';
import { SettingsView } from './components/settings/SettingsView';
import { PromptInspector } from './components/chat/PromptInspector';
import { useChatStore } from './stores/useChatStore';
import { Brain } from 'lucide-react';

export const App: React.FC = () => {
  const {
    activeChatId,
    chats,
    characters,
    personas,
    messageTurns,
    activePersonaId,
    activeView,
    isStreaming,
    setSwipeIndex,
    rerollMessage,
    sendMessage,
  } = useChatStore();

  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  const currentChat = chats.find((c) => c.id === activeChatId);
  const currentChar = characters.find((c) => c.id === currentChat?.character_id);
  const currentPersona = personas.find((p) => p.id === activePersonaId) || personas[0];
  const activeTurns = activeChatId ? messageTurns[activeChatId] || [] : [];

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when a new message is added in chat view
  useEffect(() => {
    if (activeView === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTurns.length, activeView]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#121214] text-zinc-100">
      {/* 1. Collapsible Sidebar */}
      <Sidebar />

      {/* 2. Main Dynamic Stage Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#121214]">
        {/* VIEW A: Roleplay Chat Stage */}
        {activeView === 'chat' && currentChat && currentChar && (
          <>
            {/* Chat Header */}
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

              {/* Prompt Inspector Action Trigger */}
              <button
                type="button"
                onClick={() => setIsInspectorOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#202024] hover:bg-[#27272a] border border-[#2e2e36] hover:border-indigo-500/40 text-xs font-semibold text-zinc-300 hover:text-white transition-all shadow-sm"
              >
                <Brain className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline">Inspect Prompt</span>
              </button>
            </header>

            {/* Scrollable Message List */}
            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-4 max-w-4xl w-full mx-auto">
              {activeTurns.map((turn) => {
                const authorPersonaId = turn.persona_id || currentChat?.persona_id || activePersonaId;
                const turnPersona = personas.find((p) => p.id === authorPersonaId) || currentPersona;
                return (
                  <MessageBubble
                    key={turn.id}
                    turn={turn}
                    character={currentChar}
                    persona={turnPersona}
                    onSwipeChange={(turnId, newIndex) => {
                      if (activeChatId) setSwipeIndex(activeChatId, turnId, newIndex);
                    }}
                    onReroll={(turnId) => {
                      if (activeChatId) rerollMessage(activeChatId, turnId);
                    }}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Input Cockpit */}
            <ChatInputBar
              characterName={currentChar.name}
              isStreaming={isStreaming}
              onSendMessage={(text) => {
                if (activeChatId) sendMessage(activeChatId, text);
              }}
            />

            {/* 6-Layer Prompt Inspector Modal */}
            {isInspectorOpen && (
              <PromptInspector
                character={currentChar}
                persona={personas.find((p) => p.id === currentChat.persona_id) || currentPersona}
                turns={activeTurns}
                modelName={currentChat.model_name}
                temperature={currentChat.temperature}
                onClose={() => setIsInspectorOpen(false)}
              />
            )}
          </>
        )}

        {/* VIEW B: Discover / Character Gallery */}
        {activeView === 'gallery' && <CharacterGallery />}

        {/* VIEW C: Personas Manager */}
        {activeView === 'personas' && <PersonaManager />}

        {/* VIEW D: App & Model Settings */}
        {activeView === 'settings' && <SettingsView />}
      </main>
    </div>
  );
};

export default App;
