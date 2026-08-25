import React, { useRef, useEffect, useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { MessageBubble } from './components/chat/MessageBubble';
import { ChatInputBar } from './components/chat/ChatInputBar';
import { CharacterGallery } from './components/gallery/CharacterGallery';
import { PersonaManager } from './components/personas/PersonaManager';
import { SettingsView } from './components/settings/SettingsView';
import { DevStudio } from './components/studio/DevStudio';
import { PromptInspector } from './components/chat/PromptInspector';
import { useChatStore } from './stores/useChatStore';
import { Brain, AlertCircle, X, ChevronDown, Check, Bot, RefreshCw, Zap } from 'lucide-react';

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
    streamingError,
    setSwipeIndex,
    rerollMessage,
    sendMessage,
    setActiveView,
    editTurnMessage,
    deleteTurn,
    togglePinTurn,
    retryLastMessage,
    rerollUserMessage,
    generateGhostwriterSuggestion,
  } = useChatStore();

  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  const currentChat = chats.find((c) => c.id === activeChatId);
  const currentChar = characters.find((c) => c.id === currentChat?.character_id);
  const currentPersona = personas.find((p) => p.id === activePersonaId) || personas[0];
  const activeTurns = activeChatId ? messageTurns[activeChatId] || [] : [];

  // Active selected model resolution (syncs with Settings)
  const activeModel =
    localStorage.getItem('renoog_model') || currentChat?.model_name || 'anthropic/claude-3.5-sonnet';
  const displayModelName = activeModel.split('/')[1] || activeModel;

  // Available models list for quick switcher (presets + user custom models)
  const defaultPresets = [
    { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)' },
    { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B (Free)' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
    { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1' },
    { id: 'mistralai/mistral-large-2407', name: 'Mistral Large' },
  ];

  let customPresets: Array<{ id: string; name: string }> = [];
  try {
    const raw = localStorage.getItem('renoog_custom_models');
    if (raw) customPresets = JSON.parse(raw);
  } catch {
    // ignore
  }

  const allModels = [...defaultPresets, ...customPresets.filter((c) => !defaultPresets.some((p) => p.id === c.id))];

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when a new message is added in chat view
  useEffect(() => {
    if (activeView === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTurns.length, activeView]);

  // Close model dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    if (isModelDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModelDropdownOpen]);

  // Live Token Budget Diagnostics (~3.8 chars per token)
  const totalContextChars =
    activeTurns.reduce((acc, t) => acc + (t.swipes[t.active_index]?.length || 0), 0) +
    (currentChar?.personality?.length || 0) +
    (currentChar?.scenario?.length || 0) +
    (currentPersona?.description?.length || 0);
  const estimatedContextTokens = Math.max(120, Math.round(totalContextChars / 3.8));
  const maxContextTokens = 8192;
  const contextPercentage = Math.min(100, Math.round((estimatedContextTokens / maxContextTokens) * 100));

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
            <header className="relative z-40 flex items-center justify-between px-6 py-3.5 border-b border-[#27272a] bg-[#18181b]/95 backdrop-blur-md shrink-0 shadow-sm">
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

                    {/* Quick Model Selector Dropdown */}
                    <div className="relative" ref={modelDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                        className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all cursor-pointer truncate max-w-xs shadow-sm"
                      >
                        <Bot className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span className="truncate">{displayModelName}</span>
                        <ChevronDown className="w-3 h-3 opacity-70 shrink-0" />
                      </button>

                      {isModelDropdownOpen && (
                        <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl bg-[#18181b] border border-zinc-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                          <div className="flex items-center justify-between px-2 py-1 mb-1.5 border-b border-zinc-800 pb-1.5">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                              Active Model Engine
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                              1-Click Switch
                            </span>
                          </div>

                          <div className="max-h-56 overflow-y-auto space-y-1 pr-1 [scrollbar-thin] [scrollbar-color:#3f3f46_transparent]">
                            {allModels.map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  localStorage.setItem('renoog_model', m.id);
                                  if (activeChatId) {
                                    useChatStore.setState((state) => ({
                                      chats: state.chats.map((c) =>
                                        c.id === activeChatId ? { ...c, model_name: m.id } : c
                                      ),
                                    }));
                                  }
                                  setIsModelDropdownOpen(false);
                                }}
                                className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                                  activeModel === m.id
                                    ? 'bg-indigo-600/20 text-indigo-200 font-semibold border border-indigo-500/30'
                                    : 'hover:bg-[#27272a] text-zinc-300'
                                }`}
                              >
                                <span className="truncate font-medium">{m.name || m.id}</span>
                                {activeModel === m.id && (
                                  <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                )}
                              </button>
                            ))}
                          </div>

                          <div className="mt-2 pt-2 border-t border-zinc-800/80">
                            <button
                              type="button"
                              onClick={() => {
                                setIsModelDropdownOpen(false);
                                setActiveView('settings');
                              }}
                              className="w-full text-center px-2 py-1.5 rounded-xl text-[11px] font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <span>⚙️ Manage Models in Settings</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 truncate max-w-md">{currentChar.tagline}</p>
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-2.5">
                {/* Live Context Token Budget Meter */}
                <div
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#18181b] border border-[#27272a] text-xs shadow-xs"
                  title="Estimated active prompt token consumption"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-300 tabular-nums">
                      <span>{estimatedContextTokens.toLocaleString()} / {maxContextTokens.toLocaleString()}</span>
                      <span className="text-zinc-500 font-mono">({contextPercentage}%)</span>
                    </div>
                    <div className="w-20 h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          contextPercentage > 80 ? 'bg-red-500' : contextPercentage > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${contextPercentage}%` }}
                      />
                    </div>
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
              </div>
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
                      if (activeChatId) {
                        if (turn.role === 'user') {
                          rerollUserMessage(activeChatId, turnId);
                        } else {
                          rerollMessage(activeChatId, turnId);
                        }
                      }
                    }}
                    onEdit={(turnId, newText) => {
                      if (activeChatId) editTurnMessage(activeChatId, turnId, newText);
                    }}
                    onPin={(turnId) => {
                      if (activeChatId) togglePinTurn(activeChatId, turnId);
                    }}
                    onDelete={(turnId) => {
                      if (activeChatId) deleteTurn(activeChatId, turnId);
                    }}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Streaming Error Alert Banner */}
            {streamingError && (
              <div className="md:mx-8 mb-2 max-w-4xl w-full mx-auto p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5 min-w-0">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="truncate">{streamingError}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* 1-Click Retry Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (activeChatId) retryLastMessage(activeChatId);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>

                  {streamingError.toLowerCase().includes('key') && (
                    <button
                      type="button"
                      onClick={() => setActiveView('settings')}
                      className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 font-semibold text-[11px] transition-colors"
                    >
                      Open Settings
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => useChatStore.setState({ streamingError: null })}
                    className="p-1 rounded-md hover:bg-red-500/20 text-red-400 hover:text-red-200 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Input Cockpit */}
            <ChatInputBar
              characterName={currentChar.name}
              isStreaming={isStreaming}
              onSendMessage={(text) => {
                if (activeChatId) sendMessage(activeChatId, text);
              }}
              onGhostwrite={
                activeChatId ? () => generateGhostwriterSuggestion(activeChatId) : undefined
              }
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

        {/* VIEW E: Dev Studio & Character Manager */}
        {activeView === 'studio' && <DevStudio />}
      </main>
    </div>
  );
};

export default App;
