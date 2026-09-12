import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Brain,
  Sparkles,
  Compass,
  X,
  Copy,
  Check,
  Clock,
  Gauge,
  Zap,
  Bot,
  Search,
  HardDrive,
  Globe,
  Code2,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useChatStore } from '../../stores/useChatStore';
import { api } from '../../services/api';
import type { Character, Persona, MessageTurn } from '../../types';
import type { UniverseMember, UniverseLocation, UniverseMessage } from '../../types/universe';

export type RightSidebarTab = 'engine' | 'tokens' | 'thoughts' | 'occupants' | 'prompt' | 'world';

export interface RightSidebarProps {
  /** Optional 1-on-1 Chat character */
  character?: Character;
  /** Active player persona */
  persona?: Persona;
  /** Active turns in 1-on-1 chat */
  turns?: MessageTurn[];
  /** Room occupants in Universe mode */
  roomOccupants?: UniverseMember[];
  /** Current room location in Universe mode */
  currentRoom?: UniverseLocation | null;
  /** Room messages in Universe mode */
  roomMessages?: UniverseMessage[];
  /** World title */
  worldName?: string;
  /** Initial active tab */
  initialTab?: RightSidebarTab;
  /** Callback when user selects a model inside the Engine tab */
  onSelectModel?: (modelId: string, category: 'local' | 'cloud') => void;
  /** Callback to open full prompt inspector modal */
  onOpenInspector?: (tab?: 'layers' | 'raw') => void;
  /** Callback to close the sidebar/drawer */
  onClose?: () => void;
}

interface QuickModelItem {
  id: string;
  name: string;
  category: 'local' | 'cloud';
  badge: string;
  tagline: string;
  isFree: boolean;
}

const CLOUD_MODELS: QuickModelItem[] = [
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', category: 'cloud', badge: 'Cloud', tagline: 'Anthropic · Supreme Prose', isFree: false },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', category: 'cloud', badge: 'Cloud', tagline: 'Meta · High Immersion', isFree: false },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', category: 'cloud', badge: 'Cloud', tagline: 'DeepSeek · Deep Reasoning', isFree: false },
  { id: 'mistralai/mistral-large-2407', name: 'Mistral Large', category: 'cloud', badge: 'Cloud', tagline: 'Mistral · Creative Flow', isFree: false },
  { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash', category: 'cloud', badge: 'Free', tagline: 'Google · 1M Context Free', isFree: true },
  { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B', category: 'cloud', badge: 'Free', tagline: 'Meta · Fast Free Tier', isFree: true },
];

export const RightSidebar: React.FC<RightSidebarProps> = ({
  character,
  persona,
  turns = [],
  roomOccupants = [],
  currentRoom = null,
  roomMessages = [],
  worldName = 'Simulated Realm',
  initialTab = 'engine',
  onSelectModel,
  onOpenInspector,
  onClose,
}) => {
  const {
    activeChatId,
    isRightSidebarOpen,
    toggleRightSidebar,
    latestThoughtTrace,
  } = useChatStore();

  const [activeTab, setActiveTab] = useState<RightSidebarTab>(initialTab);
  const [modelSearch, setModelSearch] = useState('');
  const [modelCategoryTab, setModelCategoryTab] = useState<'all' | 'local' | 'cloud' | 'free'>('all');
  const [installedOllamaModels, setInstalledOllamaModels] = useState<string[]>(() => {
    const stored = localStorage.getItem('renoog_ollama_model');
    return stored ? [stored] : [];
  });
  const [copied, setCopied] = useState(false);
  const thoughtBoxRef = useRef<HTMLDivElement>(null);

  // Active selected provider & model resolution
  const activeProvider = (localStorage.getItem('renoog_llm_provider') || 'openrouter') as
    | 'openrouter'
    | 'ollama'
    | 'custom';
  const ollamaModel = localStorage.getItem('renoog_ollama_model') || 'llama3.2:3b';
  const openRouterModel = localStorage.getItem('renoog_model') || 'anthropic/claude-3.5-sonnet';
  const customModel = localStorage.getItem('renoog_custom_endpoint_url')
    ? 'custom-model'
    : 'local-model';

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

  // Auto-discover Ollama models when Engine tab is open
  useEffect(() => {
    if (activeTab === 'engine') {
      const ollamaUrl = localStorage.getItem('renoog_ollama_url') || 'http://localhost:11434';
      api.testOllamaConnection(ollamaUrl).then((res) => {
        if (res.ok && res.models) {
          setInstalledOllamaModels(res.models);
        }
      });
    }
  }, [activeTab]);

  // Context token limits calculation
  const getModelMaxTokens = (modelSlug: string): number => {
    const s = modelSlug.toLowerCase();
    if (s.includes('gemini-2') || s.includes('gemini-1.5')) return 1000000;
    if (s.includes('claude-3') || s.includes('claude-3-5')) return 200000;
    if (s.includes('llama-3') || s.includes('llama3') || s.includes('mistral-large')) return 128000;
    if (s.includes('deepseek') || s.includes('qwen')) return 64000;
    return 8192;
  };

  const maxContextTokens = getModelMaxTokens(activeModel);

  // Derive estimated tokens across chat turns or room messages
  const dialogueTokens = useMemo(() => {
    if (roomMessages.length > 0) {
      return roomMessages.reduce((acc, m) => acc + Math.round(m.content.split(/\s+/).length * 1.3), 0);
    }
    if (turns.length > 0) {
      return turns.reduce((acc, t) => {
        const text = t.swipes[t.active_index] || '';
        return acc + Math.round(text.split(/\s+/).length * 1.3);
      }, 0);
    }
    return 120;
  }, [roomMessages, turns]);

  const loreTokens = currentRoom ? 350 : character ? 400 : 250;
  const personaTokens = persona ? 200 : 150;
  const totalEstimatedTokens = loreTokens + personaTokens + dialogueTokens;
  const remainingTokens = Math.max(0, maxContextTokens - totalEstimatedTokens);
  const contextPercentage = Math.min(100, Math.round((totalEstimatedTokens / maxContextTokens) * 100));

  // Dynamic list of Ollama and Cloud models
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

  const allModels: QuickModelItem[] = [...dynamicLocalModels, ...CLOUD_MODELS];

  const filteredModels = allModels.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
      m.id.toLowerCase().includes(modelSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (modelCategoryTab === 'local') return m.category === 'local';
    if (modelCategoryTab === 'cloud') return m.category === 'cloud';
    if (modelCategoryTab === 'free') return m.isFree;
    return true;
  });

  const handleSelectModelItem = (m: QuickModelItem) => {
    if (m.category === 'local') {
      localStorage.setItem('renoog_llm_provider', 'ollama');
      localStorage.setItem('renoog_ollama_model', m.id);
    } else {
      localStorage.setItem('renoog_llm_provider', 'openrouter');
      localStorage.setItem('renoog_model', m.id);
    }
    if (onSelectModel) {
      onSelectModel(m.id, m.category);
    }
  };

  const handleDismiss = useCallback(() => {
    if (onClose) onClose();
    else toggleRightSidebar();
  }, [onClose, toggleRightSidebar]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    if (isRightSidebarOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRightSidebarOpen, handleDismiss]);

  const thoughtData = (activeChatId ? latestThoughtTrace[activeChatId] : undefined) || {
    thought: '',
    isThinking: false,
  };

  useEffect(() => {
    if (thoughtData.isThinking && thoughtBoxRef.current) {
      thoughtBoxRef.current.scrollTop = thoughtBoxRef.current.scrollHeight;
    }
  }, [thoughtData.thought, thoughtData.isThinking]);

  // Define tab navigation pills matching Image 2
  const TABS = useMemo(
    () => [
      { id: 'engine' as const, label: 'Engine', icon: <Bot className="w-3.5 h-3.5" /> },
      { id: 'tokens' as const, label: 'Tokens', icon: <Zap className="w-3.5 h-3.5" /> },
      { id: 'thoughts' as const, label: 'Thoughts', icon: <Brain className="w-3.5 h-3.5" /> },
      { id: 'occupants' as const, label: 'Cast', icon: <Users className="w-3.5 h-3.5" /> },
      { id: 'prompt' as const, label: 'Prompt', icon: <Code2 className="w-3.5 h-3.5" /> },
      { id: 'world' as const, label: 'World', icon: <Globe className="w-3.5 h-3.5" /> },
    ],
    []
  );

  const handleCopyThought = () => {
    if (!thoughtData.thought) return;
    navigator.clipboard.writeText(thoughtData.thought);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── DOCKED COLLAPSED RAIL (When isRightSidebarOpen is false on Desktop/Laptop >= 1024px) ───
  if (!isRightSidebarOpen) {
    return (
      <aside
        className="hidden lg:flex flex-col items-center py-3 px-1.5 w-14 bg-[#121216] border-l border-[#202026] h-full shrink-0 select-none z-20 animate-in slide-in-from-right-2 duration-150"
        aria-label="Simulation HUD Collapsed Rail"
      >
        {/* Expand Trigger Button */}
        <button
          type="button"
          onClick={toggleRightSidebar}
          className="p-2 rounded-xl bg-[#1a1a22] hover:bg-amber-500 hover:text-black text-amber-400 border border-amber-500/25 hover:border-amber-500 transition-all cursor-pointer mb-2 shadow-xs group"
          title="Expand Simulation HUD & Controls"
          aria-label="Expand Simulation HUD"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
        </button>

        <div className="w-6 h-px bg-white/10 my-1" />

        {/* Quick Tab Jump Tool Icons */}
        <div className="flex flex-col items-center gap-2 flex-1 w-full mt-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setActiveTab(t.id);
                toggleRightSidebar();
              }}
              className="p-2 rounded-xl text-zinc-400 hover:text-amber-400 hover:bg-[#1a1a22] transition-all cursor-pointer relative group"
              title={`Open ${t.label} tab`}
            >
              {t.icon}
              {/* Floating Tooltip */}
              <span className="absolute right-full mr-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[#1a1a22] text-xs font-semibold text-zinc-100 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity border border-white/10 shadow-xl z-50">
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </aside>
    );
  }

  return (
    <>
      {/* Responsive Backdrop Overlay on Mobile (< 1024px) */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 lg:hidden transition-opacity cursor-pointer"
        onClick={handleDismiss}
        aria-hidden="true"
      />

      <aside className="fixed inset-y-0 right-0 z-40 w-80 sm:w-96 lg:static lg:z-10 lg:w-88 xl:w-96 flex flex-col h-full bg-[#121216] border-l border-[#202026] shrink-0 animate-in slide-in-from-right-4 duration-200 shadow-2xl lg:shadow-none select-text">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#202026] bg-[#16161c]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white tracking-wide block">
                Simulation HUD & Diagnostics
              </span>
              <span className="text-[10px] text-zinc-400 block truncate max-w-48">
                {currentRoom?.name || character?.name || 'Modular Controls'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Collapse sidebar"
            title="Collapse sidebar to rail"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* ─── MODULAR TABS NAVIGATION (Matching Image 2 with Gold/Amber Accent) ─── */}
        <div className="flex items-center gap-1.5 p-2.5 bg-[#141418] border-b border-[#202026] overflow-x-auto scrollbar-none">
          {TABS.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20'
                    : 'bg-[#1a1a22] hover:bg-[#242430] text-zinc-400 hover:text-zinc-200 border border-white/5'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* ─── DYNAMIC TAB CONTENT ─── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: ENGINE & MODEL SWITCHER */}
          {activeTab === 'engine' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              {/* Active Engine Card */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                    Current AI Engine
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300">
                    {activeProvider === 'ollama' ? '🦙 GPU Local' : '🌐 Cloud API'}
                  </span>
                </div>
                <div className="font-bold text-sm text-white truncate">{displayModelName}</div>
                <div className="text-[11px] text-zinc-400 truncate">
                  Max Context: {maxContextTokens.toLocaleString()} tokens
                </div>
              </div>

              {/* Model Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  placeholder="Search models (llama, claude, deepseek)..."
                  className="w-full pl-9 pr-7 py-2 rounded-xl bg-[#181820] border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:border-amber-500/60 focus:outline-none"
                />
                {modelSearch && (
                  <button
                    type="button"
                    onClick={() => setModelSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 pb-1 overflow-x-auto scrollbar-none">
                {(
                  [
                    { id: 'all', label: 'All Models' },
                    { id: 'local', label: '🦙 Local GPU' },
                    { id: 'cloud', label: '🌐 Cloud' },
                    { id: 'free', label: '✨ Free' },
                  ] as const
                ).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setModelCategoryTab(c.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all shrink-0 cursor-pointer ${
                      modelCategoryTab === c.id
                        ? 'bg-zinc-700 text-white shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200 bg-[#181820] hover:bg-[#202028]'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Scrollable Model Cards List */}
              <div className="space-y-1.5">
                {filteredModels.map((m) => {
                  const isSelected = activeModel === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelectModelItem(m)}
                      className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-2.5 cursor-pointer border ${
                        isSelected
                          ? m.category === 'local'
                            ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/40 shadow-xs'
                            : 'bg-amber-500/15 text-amber-200 border-amber-500/40 shadow-xs'
                          : 'bg-[#181820] hover:bg-[#202028] border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`p-1.5 rounded-lg shrink-0 ${
                            m.category === 'local'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {m.category === 'local' ? (
                            <HardDrive className="w-4 h-4" />
                          ) : (
                            <Globe className="w-4 h-4" />
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
                          <span className="text-[10px] text-zinc-400 truncate block">
                            {m.tagline}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                    </button>
                  );
                })}

                {filteredModels.length === 0 && (
                  <div className="text-center py-6 text-zinc-500 text-xs">
                    No models found matching &quot;{modelSearch}&quot;.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: LIVE CONTEXT TOKENS */}
          {activeTab === 'tokens' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-[#181820] border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-xs text-zinc-200">Context Memory Gauge</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                    {maxContextTokens.toLocaleString()} Max Limit
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-300 mb-1">
                    <span>{totalEstimatedTokens.toLocaleString()} tokens used</span>
                    <span>{contextPercentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        contextPercentage > 80
                          ? 'bg-red-500'
                          : contextPercentage > 50
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(3, contextPercentage))}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-zinc-800 text-xs">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                      <span>Room Lore & World</span>
                    </span>
                    <span className="font-mono text-zinc-200">{loreTokens.toLocaleString()} tokens</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>Player Persona</span>
                    </span>
                    <span className="font-mono text-zinc-200">{personaTokens.toLocaleString()} tokens</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      <span>Dialogue History</span>
                    </span>
                    <span className="font-mono text-zinc-200">{dialogueTokens.toLocaleString()} tokens</span>
                  </div>
                </div>
              </div>

              {/* Headroom Card */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400/80 block">
                    Available Headroom
                  </span>
                  <span className="font-mono font-bold text-emerald-300">
                    {remainingTokens.toLocaleString()} tokens free
                  </span>
                </div>
                <span className="font-mono font-bold text-emerald-400">
                  {(100 - contextPercentage).toFixed(0)}% Free
                </span>
              </div>

              {/* Inspect Button */}
              {onOpenInspector && (
                <button
                  type="button"
                  onClick={() => onOpenInspector('raw')}
                  className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Inspect Raw Prompt Payload</span>
                </button>
              )}
            </div>
          )}

          {/* TAB 3: THOUGHTS & REASONING MONOLOGUE */}
          {activeTab === 'thoughts' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-[#181820] border border-zinc-800 flex flex-col">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[10px]">
                    <Gauge className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Speed</span>
                  </div>
                  <span className="text-xs font-bold font-mono text-zinc-100 mt-1">
                    {thoughtData.speedTokS ? `${thoughtData.speedTokS} tok/s` : '-- tok/s'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#181820] border border-zinc-800 flex flex-col">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[10px]">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Latency</span>
                  </div>
                  <span className="text-xs font-bold font-mono text-zinc-100 mt-1">
                    {thoughtData.latencyMs ? `${thoughtData.latencyMs} ms` : '-- ms'}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#181820] border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        thoughtData.isThinking ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                      }`}
                    />
                    <span className="text-xs font-bold text-zinc-200">
                      {thoughtData.isThinking ? 'AI Reasoning in Progress...' : 'Reasoning Monologue'}
                    </span>
                  </div>
                  {thoughtData.thought && (
                    <button
                      type="button"
                      onClick={handleCopyThought}
                      className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-[10px] flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>

                <div
                  ref={thoughtBoxRef}
                  className="p-3 rounded-xl bg-[#121216] border border-zinc-800/80 text-xs font-mono text-zinc-300 leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap"
                >
                  {thoughtData.thought ? (
                    thoughtData.thought
                  ) : (
                    <div className="text-zinc-500 text-center py-6">
                      <Brain className="w-6 h-6 mx-auto mb-2 opacity-40" />
                      <span>Send a message to see the model&apos;s internal chain of thought here in real time.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ROOM OCCUPANTS & COMPANION CAST */}
          {activeTab === 'occupants' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Active Room Cast ({roomOccupants.length > 0 ? roomOccupants.length : character ? 1 : 0})
                </span>
                <span className="text-[10px] text-zinc-500">
                  {currentRoom?.name || 'In Scene'}
                </span>
              </div>

              {roomOccupants.length > 0 ? (
                <div className="space-y-2">
                  {roomOccupants.map((member) => (
                    <div
                      key={member.id}
                      className="p-3 rounded-2xl bg-[#181820] border border-zinc-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={
                            member.avatar_url ||
                            (member.entity_type === 'user'
                              ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
                              : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100')
                          }
                          alt={member.display_name}
                          className="w-10 h-10 rounded-xl object-cover ring-1 ring-zinc-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white block truncate">
                            {member.display_name}
                          </span>
                          <span className="text-[10px] text-zinc-400 block truncate">
                            {member.entity_type === 'user'
                              ? 'Your Player Identity'
                              : 'Active Room Companion'}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                          member.entity_type === 'user'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                        }`}
                      >
                        {member.entity_type === 'user' ? 'Player' : 'NPC'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : character ? (
                <div className="p-3 rounded-2xl bg-[#181820] border border-zinc-800 space-y-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={character.avatar_url}
                      alt={character.name}
                      className="w-12 h-12 rounded-xl object-cover ring-1 ring-indigo-500/50 shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{character.name}</h4>
                      <p className="text-[11px] text-zinc-400 line-clamp-2">{character.tagline}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-zinc-800/80 text-xs text-zinc-300 leading-relaxed">
                    <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Personality</div>
                    <p className="text-zinc-400 text-[11px] line-clamp-4">{character.personality}</p>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-zinc-500 text-xs">
                  No active occupants in this room.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PROMPT INSPECTOR PAYLOAD */}
          {activeTab === 'prompt' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-2xl bg-[#181820] border border-zinc-800 space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <span className="font-bold text-zinc-200">Compiled Scene Prompt</span>
                  <span className="text-[10px] text-zinc-500">6-Layer Model</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Renoog AI compiles room lore, active companion cards, player persona, and conversation history into a structured prompt payload.
                </p>

                {onOpenInspector && (
                  <button
                    type="button"
                    onClick={() => onOpenInspector('raw')}
                    className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm mt-2"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Open Full 6-Layer Inspector</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: WORLD & AMBIANCE */}
          {activeTab === 'world' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-2xl bg-[#181820] border border-zinc-800 space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <div className="flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-zinc-200">{worldName}</span>
                  </div>
                  <span className="text-[10px] text-emerald-400">Active Realm</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-0.5">
                    Current Location
                  </span>
                  <span className="font-semibold text-white block">
                    {currentRoom?.name || 'Simulation Chamber'}
                  </span>
                  <p className="text-zinc-400 text-[11px] mt-1 leading-relaxed">
                    {currentRoom?.description || 'A simulated space within the universe.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
