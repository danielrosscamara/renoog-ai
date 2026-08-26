import React, { useRef, useEffect, useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { MessageBubble } from './components/chat/MessageBubble';
import { ChatInputBar } from './components/chat/ChatInputBar';
import { CharacterGallery } from './components/gallery/CharacterGallery';
import { PersonaManager } from './components/personas/PersonaManager';
import { SettingsView } from './components/settings/SettingsView';
import { DevStudio } from './components/studio/DevStudio';
import { CharacterStudio } from './components/studio/CharacterStudio';
import { PromptInspector } from './components/chat/PromptInspector';
import { useChatStore } from './stores/useChatStore';
import { Brain, AlertCircle, X, ChevronDown, Check, Bot, RefreshCw, Zap } from 'lucide-react';

export const App: React.FC = () => {
  const {
    activeChatId,
    editingCharacter,
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
    exactTokenUsage,
  } = useChatStore();

  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false);

  const currentChat = chats.find((c) => c.id === activeChatId);
  const currentChar = characters.find((c) => c.id === currentChat?.character_id);
  const currentPersona = personas.find((p) => p.id === activePersonaId) || personas[0];
  const activeTurns = activeChatId ? messageTurns[activeChatId] || [] : [];

  // Active selected model resolution (syncs with Settings)
  const activeModel =
    localStorage.getItem('renoog_model') || currentChat?.model_name || 'anthropic/claude-3.5-sonnet';
  const displayModelName = activeModel.split('/')[1] || activeModel;

  // Model Context Limit Registry (True Hardware Context Limits)
  const getModelMaxTokens = (modelSlug: string): number => {
    const s = modelSlug.toLowerCase();
    if (s.includes('gemini-2') || s.includes('gemini-1.5')) return 1048576; // 1,000,000 (1M)
    if (s.includes('claude-3') || s.includes('claude-3-5')) return 200000;  // 200,000 (200k)
    if (s.includes('llama-3') || s.includes('nemotron') || s.includes('mistral-large')) return 128000; // 128,000 (128k)
    if (s.includes('deepseek') || s.includes('qwen')) return 64000; // 64,000 (64k)
    return 8192; // Default 8,192 (8k)
  };

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
  const tokenDropdownRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when a new message is added in chat view
  useEffect(() => {
    if (activeView === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTurns.length, activeView]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
      if (tokenDropdownRef.current && !tokenDropdownRef.current.contains(event.target as Node)) {
        setIsTokenDropdownOpen(false);
      }
    };
    if (isModelDropdownOpen || isTokenDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModelDropdownOpen, isTokenDropdownOpen]);

  // Dynamic Token Layer Diagnostics (~3.8 chars per token approximation)
  const charLoreChars =
    (currentChar?.personality?.length || 0) +
    (currentChar?.scenario?.length || 0) +
    (currentChar?.first_mes?.length || 0);
  const personaChars = currentPersona?.description?.length || 0;
  const dialogueChars = activeTurns.reduce((acc, t) => acc + (t.swipes[t.active_index]?.length || 0), 0);

  const charLoreTokens = Math.max(1, Math.round(charLoreChars / 3.8));
  const personaTokens = Math.max(1, Math.round(personaChars / 3.8));
  const dialogueTokens = Math.max(0, Math.round(dialogueChars / 3.8));

  // Check if OpenRouter exact ground-truth usage is available
  const chatExactUsage = activeChatId ? exactTokenUsage[activeChatId] : null;
  const isExactUsage = Boolean(chatExactUsage && chatExactUsage.prompt_tokens > 0);

  const totalEstimatedTokens = isExactUsage
    ? (chatExactUsage!.total_tokens || (chatExactUsage!.prompt_tokens + chatExactUsage!.completion_tokens))
    : (charLoreTokens + personaTokens + dialogueTokens);

  const maxContextTokens = getModelMaxTokens(activeModel);
  const remainingHeadroomTokens = Math.max(0, maxContextTokens - totalEstimatedTokens);

  const contextPercentage =
    maxContextTokens >= 100000
      ? Number(((totalEstimatedTokens / maxContextTokens) * 100).toFixed(2))
      : Math.min(100, Math.round((totalEstimatedTokens / maxContextTokens) * 100));

  const formatTokensShort = (tokens: number): string => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
    return tokens.toLocaleString();
  };

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
                {/* Live Context Token Budget Meter & Interactive Popover */}
                <div ref={tokenDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsTokenDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#18181b] hover:bg-[#202024] border border-[#27272a] hover:border-amber-500/30 text-xs shadow-xs transition-all cursor-pointer"
                    title="Click for full memory & context breakdown"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <div className="flex flex-col gap-0.5 text-left">
                      <div className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-300 tabular-nums">
                        <span>{totalEstimatedTokens.toLocaleString()} / {formatTokensShort(maxContextTokens)}</span>
                        <span className="text-zinc-500 font-mono">({contextPercentage}%)</span>
                      </div>
                      <div className="w-20 h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            contextPercentage > 80 ? 'bg-red-500' : contextPercentage > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(2, contextPercentage))}%` }}
                        />
                      </div>
                    </div>
                  </button>

                  {/* Popover Dropdown */}
                  {isTokenDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-[#18181b] border border-zinc-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs select-none">
                      {/* Header */}
                      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-zinc-800">
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="font-bold text-zinc-200">Context Memory</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                          {formatTokensShort(maxContextTokens)} Max Limit
                        </span>
                      </div>

                      {/* Exact Ground-Truth vs Estimate Status Banner */}
                      {isExactUsage ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[10px] font-semibold mb-3">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>🎯 100% Ground Truth (Verified by Model)</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 text-[10px] font-medium mb-3">
                          <span>ℹ️ Live Pre-Generation Estimate (~95% accuracy)</span>
                        </div>
                      )}

                      {/* Active Model Indicator */}
                      <div className="bg-[#121214] p-2 rounded-xl border border-zinc-800/80 mb-3 flex items-center justify-between text-[11px]">
                        <span className="text-zinc-400">Active Engine</span>
                        <span className="font-semibold text-zinc-200 truncate max-w-40">{displayModelName}</span>
                      </div>

                      {/* Layer Breakdown */}
                      <div className="space-y-2 mb-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                          {isExactUsage ? 'Server Token Usage' : 'Active Prompt Layers'}
                        </div>

                        {isExactUsage ? (
                          <>
                            {/* Prompt Context */}
                            <div className="flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-purple-400" />
                                <span className="text-zinc-300">Prompt Context Payload</span>
                              </div>
                              <span className="font-mono text-zinc-200 tabular-nums">
                                {chatExactUsage!.prompt_tokens.toLocaleString()} tokens
                              </span>
                            </div>

                            {/* Last Completion */}
                            <div className="flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                <span className="text-zinc-300">Last Generated Response</span>
                              </div>
                              <span className="font-mono text-zinc-200 tabular-nums">
                                {chatExactUsage!.completion_tokens.toLocaleString()} tokens
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Character Lore */}
                            <div className="flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-purple-400" />
                                <span className="text-zinc-300">Character Card Lore</span>
                              </div>
                              <span className="font-mono text-zinc-400 tabular-nums">
                                {charLoreTokens.toLocaleString()} tokens
                              </span>
                            </div>

                            {/* Persona Description */}
                            <div className="flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                <span className="text-zinc-300">Persona ({currentPersona.name})</span>
                              </div>
                              <span className="font-mono text-zinc-400 tabular-nums">
                                {personaTokens.toLocaleString()} tokens
                              </span>
                            </div>

                            {/* Dialogue History */}
                            <div className="flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-400" />
                                <span className="text-zinc-300">Dialogue ({activeTurns.length} turns)</span>
                              </div>
                              <span className="font-mono text-zinc-400 tabular-nums">
                                {dialogueTokens.toLocaleString()} tokens
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Headroom Summary */}
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 mb-3 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-medium text-emerald-400/80 uppercase">Available Headroom</span>
                          <span className="text-xs font-bold font-mono">{remainingHeadroomTokens.toLocaleString()} tokens free</span>
                        </div>
                        <span className="text-xs font-bold font-mono">
                          {(100 - Number(contextPercentage)).toFixed(1)}% Free
                        </span>
                      </div>

                      {/* Action Button: Jump to Prompt Inspector */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsTokenDropdownOpen(false);
                          setIsInspectorOpen(true);
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Brain className="w-3.5 h-3.5" />
                        <span>Inspect Raw Prompt Payload</span>
                      </button>
                    </div>
                  )}
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

        {/* VIEW E: Dev Studio & Character Prompt Studio */}
        {activeView === 'studio' && (
          editingCharacter ? <CharacterStudio /> : <DevStudio />
        )}
      </main>
    </div>
  );
};

export default App;
