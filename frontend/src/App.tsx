import React, { useRef, useEffect, useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { RightSidebar } from './components/layout/RightSidebar';
import { MessageBubble } from './components/chat/MessageBubble';
import { ChatInputBar } from './components/chat/ChatInputBar';
import { CharacterGallery } from './components/gallery/CharacterGallery';
import { PersonaManager } from './components/personas/PersonaManager';
import { SettingsView } from './components/settings/SettingsView';
import { DevStudio } from './components/studio/DevStudio';
import { CharacterStudio } from './components/studio/CharacterStudio';
import { PromptInspector } from './components/chat/PromptInspector';
import { ChatTurnSkeleton } from './components/common/Skeleton';
import { useChatStore } from './stores/useChatStore';
import { api } from './services/api';
import { Brain, AlertCircle, X, ChevronDown, Check, Bot, RefreshCw, Zap, Search, HardDrive, Globe, Sparkles, Code2 } from 'lucide-react';

export const App: React.FC = () => {
  const {
    activeChatId,
    isLoading,
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
    isRightSidebarOpen,
    toggleRightSidebar,
    stopStreaming,
  } = useChatStore();

  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<'layers' | 'raw'>('layers');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [modelTab, setModelTab] = useState<'all' | 'local' | 'cloud' | 'free'>('all');
  const currentChat = chats.find((c) => c.id === activeChatId);
  const currentChar = characters.find((c) => c.id === currentChat?.character_id);
  const currentPersona = personas.find((p) => p.id === activePersonaId) || personas[0];
  const activeTurns = activeChatId ? messageTurns[activeChatId] || [] : [];

  // Active selected provider & model resolution (syncs with Settings)
  const activeProvider = (localStorage.getItem('renoog_llm_provider') || 'openrouter') as 'openrouter' | 'ollama' | 'custom';
  const ollamaModel = localStorage.getItem('renoog_ollama_model') || 'llama3.2:3b';
  const customModel = localStorage.getItem('renoog_custom_endpoint_url') ? 'custom-model' : 'local-model';
  const openRouterModel = localStorage.getItem('renoog_model') || currentChat?.model_name || 'anthropic/claude-3.5-sonnet';

  const activeModel =
    activeProvider === 'ollama'
      ? ollamaModel
      : activeProvider === 'custom'
      ? customModel
      : openRouterModel;

  const displayModelName =
    activeProvider === 'ollama'
      ? `🦙 ${ollamaModel}`
      : activeProvider === 'custom'
      ? `⚡ ${customModel}`
      : (activeModel.split('/')[1] || activeModel);

  const [installedOllamaModels, setInstalledOllamaModels] = useState<string[]>(() => {
    const stored = localStorage.getItem('renoog_ollama_model');
    return stored ? [stored] : [];
  });

  // Live auto-discovery of locally installed Ollama models
  useEffect(() => {
    if (isModelDropdownOpen || activeProvider === 'ollama') {
      const ollamaUrl = localStorage.getItem('renoog_ollama_url') || 'http://localhost:11434';
      api.testOllamaConnection(ollamaUrl).then((res) => {
        if (res.ok && res.models) {
          setInstalledOllamaModels(res.models);
        }
      });
    }
  }, [isModelDropdownOpen, activeProvider]);

  // Model Context Limit Registry (True Hardware Context Limits)
  const getModelMaxTokens = (modelSlug: string): number => {
    const s = modelSlug.toLowerCase();
    if (s.includes('gemini-2') || s.includes('gemini-1.5')) return 1048576; // 1,000,000 (1M)
    if (s.includes('claude-3') || s.includes('claude-3-5')) return 200000;  // 200,000 (200k)
    if (s.includes('llama-3') || s.includes('llama3') || s.includes('nemotron') || s.includes('mistral-large') || s.includes('hermes3') || s.includes('hermes-3')) return 128000; // 128,000 (128k)
    if (s.includes('deepseek') || s.includes('qwen')) return 64000; // 64,000 (64k)
    if (s.includes('phi') || s.includes('dolphin')) return 8192; // 8,192 (8k)
    return 8192; // Default 8,192 (8k)
  };

  // Available models list for quick switcher (Categorized Local & Cloud)
  interface QuickModelItem {
    id: string;
    name: string;
    category: 'local' | 'cloud';
    badge: string;
    tagline: string;
    isFree: boolean;
  }

  // Dynamically constructed Local GPU models from live Ollama detection
  const dynamicLocalModels: QuickModelItem[] = installedOllamaModels.map((modelTag) => {
    const cleanName = modelTag.replace(':latest', '');
    return {
      id: modelTag,
      name: cleanName,
      category: 'local' as const,
      badge: 'GPU',
      tagline: `Installed Local Model (${cleanName})`,
      isFree: true,
    };
  });

  // Ensure active local model is present even before first ping
  if (activeProvider === 'ollama' && ollamaModel && !dynamicLocalModels.some((m) => m.id === ollamaModel)) {
    const cleanName = ollamaModel.replace(':latest', '');
    dynamicLocalModels.unshift({
      id: ollamaModel,
      name: cleanName,
      category: 'local' as const,
      badge: 'GPU',
      tagline: `Active Local Model (${cleanName})`,
      isFree: true,
    });
  }

  // Cloud OpenRouter Models
  const CLOUD_MODELS: QuickModelItem[] = [
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', category: 'cloud', badge: 'Cloud', tagline: 'Anthropic · Supreme Prose', isFree: false },
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', category: 'cloud', badge: 'Cloud', tagline: 'Meta · High Immersion', isFree: false },
    { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', category: 'cloud', badge: 'Cloud', tagline: 'DeepSeek · Deep Reasoning', isFree: false },
    { id: 'mistralai/mistral-large-2407', name: 'Mistral Large', category: 'cloud', badge: 'Cloud', tagline: 'Mistral · Creative Flow', isFree: false },
    { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash', category: 'cloud', badge: 'Free', tagline: 'Google · 1M Context Free', isFree: true },
    { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B', category: 'cloud', badge: 'Free', tagline: 'Meta · Fast Free Tier', isFree: true },
  ];

  let customModelPresets: Array<{ id: string; name: string }> = [];
  try {
    const raw = localStorage.getItem('renoog_custom_models');
    if (raw) customModelPresets = JSON.parse(raw);
  } catch {
    // ignore
  }

  const allAvailableModels: QuickModelItem[] = [
    ...dynamicLocalModels,
    ...CLOUD_MODELS,
    ...customModelPresets
      .filter((c) => !CLOUD_MODELS.some((p) => p.id === c.id) && !dynamicLocalModels.some((m) => m.id === c.id))
      .map((c) => ({
        id: c.id,
        name: c.name || c.id,
        category: 'cloud' as const,
        badge: 'Custom',
        tagline: 'Custom User Added',
        isFree: false,
      })),
  ];

  const filteredQuickModels = allAvailableModels.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
      m.id.toLowerCase().includes(modelSearch.toLowerCase()) ||
      m.tagline.toLowerCase().includes(modelSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (modelTab === 'local') return m.category === 'local';
    if (modelTab === 'cloud') return m.category === 'cloud';
    if (modelTab === 'free') return m.isFree;
    return true;
  });

  const handleSelectQuickModel = (model: QuickModelItem) => {
    if (model.category === 'local') {
      localStorage.setItem('renoog_llm_provider', 'ollama');
      localStorage.setItem('renoog_ollama_model', model.id);
    } else {
      localStorage.setItem('renoog_llm_provider', 'openrouter');
      localStorage.setItem('renoog_model', model.id);
    }
    if (activeChatId) {
      useChatStore.setState((state) => ({
        chats: state.chats.map((c) => (c.id === activeChatId ? { ...c, model_name: model.id } : c)),
      }));
    }
    setIsModelDropdownOpen(false);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const tokenDropdownRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);

  // Checks if user is near bottom of chat; pauses auto-follow if user scrolled up
  const handleChatScroll = () => {
    const el = chatScrollRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceToBottom < 120;
    setIsAtBottom(atBottom);
    setShowJumpToBottom(!atBottom && distanceToBottom > 200);
  };

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    setIsAtBottom(true);
    setShowJumpToBottom(false);
  };

  // Follow tokens dynamically while streaming ONLY if the user is already at the bottom
  const lastTurnSwipes = activeTurns.length > 0 ? activeTurns[activeTurns.length - 1]?.swipes : undefined;
  const lastTurnText = lastTurnSwipes?.[lastTurnSwipes.length - 1] || '';

  useEffect(() => {
    if (activeView === 'chat' && isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth' });
    }
  }, [activeTurns.length, lastTurnText, isStreaming, activeView, isAtBottom]);

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
                        className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full transition-all cursor-pointer truncate max-w-xs shadow-xs ${
                          activeProvider === 'ollama'
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : activeProvider === 'custom'
                            ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}
                      >
                        <Bot className="w-3 h-3 shrink-0" />
                        <span className="truncate">{displayModelName}</span>
                        <ChevronDown className="w-3 h-3 opacity-70 shrink-0" />
                      </button>

                      {isModelDropdownOpen && (
                        <div className="absolute left-0 top-full mt-2 w-84 rounded-2xl bg-[#18181b] border border-zinc-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-3 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs">
                          {/* Header */}
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800">
                            <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                              Active Engine Switcher
                            </span>
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                activeProvider === 'ollama'
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                              }`}
                            >
                              {activeProvider === 'ollama' ? '🦙 GPU Local' : '🌐 Cloud API'}
                            </span>
                          </div>

                          {/* Search Input */}
                          <div className="relative mb-2">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                              type="text"
                              value={modelSearch}
                              onChange={(e) => setModelSearch(e.target.value)}
                              placeholder="Search models (e.g. llama, claude, qwen)..."
                              className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-[#121214] border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:border-indigo-500/60 outline-none"
                            />
                            {modelSearch && (
                              <button
                                type="button"
                                onClick={() => setModelSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Category Filter Tabs */}
                          <div className="flex items-center gap-1 pb-2 mb-2 border-b border-zinc-800 overflow-x-auto scrollbar-none">
                            {(
                              [
                                { id: 'all', label: 'All' },
                                { id: 'local', label: '🦙 Local GPU' },
                                { id: 'cloud', label: '🌐 Cloud' },
                                { id: 'free', label: '✨ Free' },
                              ] as const
                            ).map((tab) => (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => setModelTab(tab.id)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all shrink-0 ${
                                  modelTab === tab.id
                                    ? 'bg-zinc-700 text-white shadow-xs'
                                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                                }`}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>

                          {/* Filtered Models List */}
                          <div className="max-h-60 overflow-y-auto space-y-1 pr-0.5 [scrollbar-thin] [scrollbar-color:#3f3f46_transparent]">
                            {filteredQuickModels.length > 0 ? (
                              filteredQuickModels.map((m) => {
                                const isSelected = activeModel === m.id;
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => handleSelectQuickModel(m)}
                                    className={`w-full text-left p-2 rounded-xl transition-all flex items-center justify-between gap-2 cursor-pointer ${
                                      isSelected
                                        ? m.category === 'local'
                                          ? 'bg-emerald-600/20 text-emerald-200 border border-emerald-500/40 shadow-xs'
                                          : 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/40 shadow-xs'
                                        : 'hover:bg-[#202024] text-zinc-300 border border-transparent'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <div
                                        className={`p-1.5 rounded-lg shrink-0 ${
                                          m.category === 'local'
                                            ? 'bg-emerald-500/10 text-emerald-400'
                                            : 'bg-indigo-500/10 text-indigo-400'
                                        }`}
                                      >
                                        {m.category === 'local' ? (
                                          <HardDrive className="w-3.5 h-3.5" />
                                        ) : (
                                          <Globe className="w-3.5 h-3.5" />
                                        )}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-semibold text-xs text-white truncate">
                                            {m.name}
                                          </span>
                                          <span
                                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold font-mono ${
                                              m.badge === 'GPU'
                                                ? 'bg-emerald-500/20 text-emerald-300'
                                                : m.badge === 'Free'
                                                ? 'bg-blue-500/20 text-blue-300'
                                                : 'bg-purple-500/20 text-purple-300'
                                            }`}
                                          >
                                            {m.badge}
                                          </span>
                                        </div>
                                        <span className="text-[10px] text-zinc-500 truncate block">
                                          {m.tagline}
                                        </span>
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <Check
                                        className={`w-4 h-4 shrink-0 ${
                                          m.category === 'local' ? 'text-emerald-400' : 'text-indigo-400'
                                        }`}
                                      />
                                    )}
                                  </button>
                                );
                              })
                            ) : (
                              <div className="text-center py-6 text-zinc-500 text-[11px]">
                                No models matching &quot;{modelSearch}&quot;
                              </div>
                            )}
                          </div>

                          {/* Footer link to full settings */}
                          <div className="mt-2 pt-2 border-t border-zinc-800">
                            <button
                              type="button"
                              onClick={() => {
                                setIsModelDropdownOpen(false);
                                setActiveView('settings');
                              }}
                              className="w-full text-center px-2 py-1.5 rounded-xl text-[11px] font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <span>⚙️ Open Full Settings & Providers</span>
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
                          setInspectorTab('raw');
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

                {/* Prompt Inspector Action Trigger: Raw JSON Payload */}
                <button
                  type="button"
                  onClick={() => {
                    setInspectorTab('raw');
                    setIsInspectorOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#202024] hover:bg-[#27272a] border border-[#2e2e36] hover:border-indigo-500/40 text-xs font-semibold text-zinc-300 hover:text-white transition-all shadow-sm cursor-pointer"
                  title="Quick inspect & copy raw compiled JSON payload"
                >
                  <Code2 className="w-4 h-4 text-indigo-400" />
                  <span className="hidden sm:inline">Raw Prompt</span>
                </button>

                {/* 3rd Column Companion HUD Toggle Button */}
                <button
                  type="button"
                  onClick={toggleRightSidebar}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    isRightSidebarOpen
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                      : 'bg-[#202024] hover:bg-[#27272a] border-[#2e2e36] text-zinc-400 hover:text-zinc-200'
                  }`}
                  title={isRightSidebarOpen ? 'Close Companion HUD' : 'Open Companion HUD (AI Thoughts & Memory)'}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{isRightSidebarOpen ? 'HUD Open' : 'HUD'}</span>
                </button>
              </div>
            </header>

            {/* Center Chat + Right Sidebar Layout Container */}
            <div className="flex-1 flex overflow-hidden min-h-0">
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {/* Scrollable Message List */}
                <div
                  ref={chatScrollRef}
                  onScroll={handleChatScroll}
                  className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-4 max-w-4xl w-full mx-auto"
                >
                  {isLoading && activeTurns.length === 0 ? (
                    <ChatTurnSkeleton />
                  ) : activeTurns.map((turn) => {
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

                {/* Floating Jump to Bottom Pill */}
                {showJumpToBottom && (
                  <div className="flex justify-center mb-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <button
                      type="button"
                      onClick={() => scrollToBottom(true)}
                      className="px-3.5 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all cursor-pointer border border-indigo-400/40 backdrop-blur-sm"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Jump to bottom</span>
                      {isStreaming && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping ml-0.5" />
                      )}
                    </button>
                  </div>
                )}

                {/* Bottom Input Cockpit */}
                <ChatInputBar
                  characterName={currentChar.name}
                  isStreaming={isStreaming}
                  onStopStreaming={stopStreaming}
                  onSendMessage={(text) => {
                    if (activeChatId) sendMessage(activeChatId, text);
                  }}
                  onGhostwrite={
                    activeChatId ? () => generateGhostwriterSuggestion(activeChatId) : undefined
                  }
                />
              </div>

              {/* 3rd Column Companion HUD */}
              <RightSidebar
                character={currentChar}
                persona={personas.find((p) => p.id === currentChat.persona_id) || currentPersona}
                turns={activeTurns}
                onOpenInspector={(tab = 'layers') => {
                  setInspectorTab(tab);
                  setIsInspectorOpen(true);
                }}
              />
            </div>

            {/* 6-Layer Prompt Inspector Modal */}
            {isInspectorOpen && (
              <PromptInspector
                character={currentChar}
                persona={personas.find((p) => p.id === currentChat.persona_id) || currentPersona}
                turns={activeTurns}
                modelName={currentChat.model_name}
                temperature={currentChat.temperature}
                initialTab={inspectorTab}
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

        {/* VIEW E: Dev Studio (Admin & Moderation Console) */}
        {activeView === 'studio' && <DevStudio />}

        {/* VIEW F: TavernAI Prompt Manager & Character Studio */}
        {activeView === 'character-studio' && <CharacterStudio />}
      </main>
    </div>
  );
};

export default App;
