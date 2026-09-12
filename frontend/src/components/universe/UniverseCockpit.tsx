import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Compass,
  MapPin,
  Users,
  Send,
  ArrowRight,
  Sparkles,
  Radio,
  RefreshCw,
  ArrowLeft,
  Tv,
  ChevronDown,
  ChevronUp,
  Bot,
  Zap,
  Code2,
  Check,
  Search,
  X,
  HardDrive,
  Globe,
  Wand2,
} from 'lucide-react';
import type { UniverseMessage, UniverseMember } from '../../types/universe';
import type { Persona, Character, MessageTurn } from '../../types';
import { useUniverseStore } from '../../stores/useUniverseStore';
import { useChatStore } from '../../stores/useChatStore';
import { UniverseMessageBubble, UniverseTurnDivider } from './UniverseMessageBubble';
import { LocationDrawer } from './LocationDrawer';
import { TravelConfirmationModal } from './TravelConfirmationModal';
import { PersonaSelectorModal } from '../personas/PersonaSelectorModal';
import { PromptInspector } from '../chat/PromptInspector';
import { api } from '../../services/api';

export interface UniverseCockpitProps {
  onBackToHub?: () => void;
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

/**
 * UniverseCockpit
 *
 * Central simulation hub of Renoog AI V2.
 * Integrates the spatial room feed, remote surveillance feeds, zero-turn scene
 * continuation, dual-channel input console, active persona switcher, quick model
 * selector, context memory meter, and prompt inspector.
 */
export const UniverseCockpit: React.FC<UniverseCockpitProps> = ({ onBackToHub }) => {
  // Store selectors — Universe Simulation
  const activeUniverse = useUniverseStore((state) => state.activeUniverse);
  const locations = useUniverseStore((state) => state.locations);
  const members = useUniverseStore((state) => state.members);
  const messagesByLocation = useUniverseStore((state) => state.messagesByLocation);
  const physicalLocationId = useUniverseStore((state) => state.physicalLocationId);
  const viewedLocationId = useUniverseStore((state) => state.viewedLocationId);
  const activeLocationId = useUniverseStore((state) => state.activeLocationId);
  const activeInputChannel = useUniverseStore((state) => state.activeInputChannel);
  const isStreaming = useUniverseStore((state) => state.isStreaming);

  // Store actions — Universe Simulation
  const addUserMessage = useUniverseStore((state) => state.addUserMessage);
  const directNarratorScene = useUniverseStore((state) => state.directNarratorScene);
  const continueRoomScene = useUniverseStore((state) => state.continueRoomScene);
  const openTravelConfirmation = useUniverseStore((state) => state.openTravelConfirmation);
  const returnToPhysicalLocation = useUniverseStore((state) => state.returnToPhysicalLocation);
  const setUserInputChannel = useUniverseStore((state) => state.setUserInputChannel);
  const getLocationOccupants = useUniverseStore((state) => state.getLocationOccupants);

  // Store selectors & actions — Chat & Personas
  const {
    personas,
    activePersonaId,
    setActivePersona,
    addPersona,
    generateGhostwriterSuggestion,
    activeChatId,
  } = useChatStore();

  // Local UI state
  const [isLocationDrawerOpen, setIsLocationDrawerOpen] = useState(false);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [spectatorDirective, setSpectatorDirective] = useState('');
  const [isAdvancingScene, setIsAdvancingScene] = useState(false);
  const [isGhostwriting, setIsGhostwriting] = useState(false);

  // Power Features UI state (Model Selector, Token Meter, Prompt Inspector)
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<'layers' | 'raw'>('raw');
  const [modelSearch, setModelSearch] = useState('');
  const [modelTab, setModelTab] = useState<'all' | 'local' | 'cloud' | 'free'>('all');
  const [installedOllamaModels, setInstalledOllamaModels] = useState<string[]>(() => {
    const stored = localStorage.getItem('renoog_ollama_model');
    return stored ? [stored] : [];
  });

  // Refs for dropdowns & scroll anchor
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const occupantsPopoverRef = useRef<HTMLDivElement | null>(null);
  const modelDropdownRef = useRef<HTMLDivElement | null>(null);
  const tokenDropdownRef = useRef<HTMLDivElement | null>(null);
  const [isOccupantsPopoverOpen, setIsOccupantsPopoverOpen] = useState(false);

  // Click-outside listener for popovers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        occupantsPopoverRef.current &&
        !occupantsPopoverRef.current.contains(e.target as Node)
      ) {
        setIsOccupantsPopoverOpen(false);
      }
      if (
        modelDropdownRef.current &&
        !modelDropdownRef.current.contains(e.target as Node)
      ) {
        setIsModelDropdownOpen(false);
      }
      if (
        tokenDropdownRef.current &&
        !tokenDropdownRef.current.contains(e.target as Node)
      ) {
        setIsTokenDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Live auto-discovery of locally installed Ollama models
  useEffect(() => {
    if (isModelDropdownOpen) {
      const ollamaUrl = localStorage.getItem('renoog_ollama_url') || 'http://localhost:11434';
      api.testOllamaConnection(ollamaUrl).then((res) => {
        if (res.ok && res.models) {
          setInstalledOllamaModels(res.models);
        }
      });
    }
  }, [isModelDropdownOpen]);

  // Spatial location derivations
  const currentPhysicalId = physicalLocationId || activeLocationId || locations[0]?.id || '';
  const currentViewedId = viewedLocationId || activeLocationId || currentPhysicalId;

  const currentViewedRoom = locations.find((l) => l.id === currentViewedId) || null;
  const currentPhysicalRoom = locations.find((l) => l.id === currentPhysicalId) || null;
  const isSpectating = currentViewedId !== currentPhysicalId;

  const currentRoomMessages = messagesByLocation[currentViewedId] || [];
  const roomOccupants = getLocationOccupants(currentViewedId);

  // Resolve Active Persona
  const activePersona: Persona = useMemo(() => {
    const found = personas.find((p) => p.id === activePersonaId);
    if (found) return found;
    if (personas.length > 0) return personas[0];
    return {
      id: 'default_rowan',
      name: 'Rowan Vance',
      description: 'Investigator exploring arcane anomalies.',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
      is_default: true,
    };
  }, [personas, activePersonaId]);

  // Handle Persona Switching
  const handleSelectPersona = (persona: Persona) => {
    setActivePersona(persona.id);
    localStorage.setItem('renoog_last_persona_id', persona.id);

    // Synchronize the user member in the active universe simulation session
    useUniverseStore.setState((state) => ({
      members: state.members.map((m) =>
        m.entity_type === 'user'
          ? {
              ...m,
              entity_id: persona.id,
              display_name: persona.name,
              avatar_url: persona.avatar_url,
            }
          : m
      ),
    }));
  };

  // Active Model & Provider Resolution
  const activeProvider = (localStorage.getItem('renoog_llm_provider') || 'openrouter') as
    | 'openrouter'
    | 'ollama'
    | 'custom';
  const ollamaModel = localStorage.getItem('renoog_ollama_model') || 'llama3.2:3b';
  const customModel = localStorage.getItem('renoog_custom_endpoint_url')
    ? 'custom-model'
    : 'local-model';
  const openRouterModel =
    localStorage.getItem('renoog_model') || 'anthropic/claude-3.5-sonnet';

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

  const getModelMaxTokens = (modelSlug: string): number => {
    const s = modelSlug.toLowerCase();
    if (s.includes('gemini-2') || s.includes('gemini-1.5')) return 1000000;
    if (s.includes('claude-3') || s.includes('claude-3-5')) return 200000;
    if (s.includes('llama-3') || s.includes('llama3') || s.includes('mistral-large')) return 128000;
    if (s.includes('deepseek') || s.includes('qwen')) return 64000;
    return 8192;
  };

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

  if (
    activeProvider === 'ollama' &&
    ollamaModel &&
    !dynamicLocalModels.some((m) => m.id === ollamaModel)
  ) {
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

  const allAvailableModels: QuickModelItem[] = [...dynamicLocalModels, ...CLOUD_MODELS];

  const filteredQuickModels = allAvailableModels.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
      m.id.toLowerCase().includes(modelSearch.toLowerCase());
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
    setIsModelDropdownOpen(false);
  };

  // Context Token Budget Calculation
  const maxContextTokens = getModelMaxTokens(activeModel);
  const roomLoreEstimate = 350;
  const personaEstimate = 200;
  const dialogueEstimate = currentRoomMessages.reduce(
    (acc, m) => acc + Math.round(m.content.split(/\s+/).length * 1.3),
    0
  );
  const totalEstimatedTokens = roomLoreEstimate + personaEstimate + dialogueEstimate;
  const contextPercentage = Math.min(
    100,
    Math.round((totalEstimatedTokens / maxContextTokens) * 100)
  );

  const formatTokensShort = (tokens: number): string => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
    return tokens.toLocaleString();
  };

  // Auto-scroll feed to bottom when new messages arrive
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [currentViewedId, scrollToBottom]);

  useEffect(() => {
    scrollToBottom(true);
  }, [currentRoomMessages.length, scrollToBottom]);

  // Group messages by turn_number
  const turnGroups: { turnNumber: number; messages: UniverseMessage[] }[] = [];
  currentRoomMessages.forEach((msg) => {
    const existingGroup = turnGroups.find((g) => g.turnNumber === msg.turn_number);
    if (existingGroup) {
      existingGroup.messages.push(msg);
    } else {
      turnGroups.push({ turnNumber: msg.turn_number, messages: [msg] });
    }
  });

  // Handle in-person message submission
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isStreaming) return;

    addUserMessage(inputText.trim());
    setInputText('');
  };

  // Handle spectator director directive submission
  const handleSendSpectatorDirective = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!spectatorDirective.trim() || isStreaming) return;

    directNarratorScene(currentViewedId, spectatorDirective.trim());
    setSpectatorDirective('');
  };

  // Handle zero-turn scene continuation
  const handleContinueScene = async () => {
    if (isStreaming || isAdvancingScene) return;
    setIsAdvancingScene(true);
    try {
      await continueRoomScene(currentViewedId);
    } finally {
      setIsAdvancingScene(false);
    }
  };

  // Handle ghostwriter suggestion
  const handleGhostwrite = async () => {
    if (isStreaming || isGhostwriting) return;
    setIsGhostwriting(true);
    try {
      if (activeChatId) {
        const suggestion = await generateGhostwriterSuggestion(activeChatId);
        if (suggestion) {
          setInputText(suggestion);
          return;
        }
      }
      // Contextual room fallback suggestion
      const suggestions = [
        `*Steps forward, observing the environment with a calm, analytical gaze.* "Let's examine the console carefully before activating anything."`,
        `*Glances toward the corridor entrance, keeping hand close to belt.* "The readouts don't match the historical logs. Stay vigilant."`,
        `*Takes a slow, measured breath as the ambient hum echoes.* "We're making progress. Let's see what else this room is hiding."`,
      ];
      setInputText(suggestions[Math.floor(Math.random() * suggestions.length)]);
    } finally {
      setIsGhostwriting(false);
    }
  };

  // Synthesize inspector character card from lead companion or world
  const leadCompanion = members.find((m) => m.entity_type === 'character');
  const synthesizedCharacter: Character = {
    id: leadCompanion?.entity_id || 'lead_companion',
    name: leadCompanion?.display_name || activeUniverse?.world_name || 'World Simulation',
    tagline: currentViewedRoom?.description || 'Active Universe Scene',
    description: `Current World: ${activeUniverse?.world_name || 'Simulated Realm'}. Room: ${currentViewedRoom?.name || 'Simulation Chamber'}.`,
    personality: 'Adaptive AI companions and world narrator.',
    scenario: currentViewedRoom?.description || 'Exploring the area.',
    first_mes: currentRoomMessages[0]?.content || 'Simulation initialized.',
    avatar_url: leadCompanion?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
    tags: ['Universe', 'Simulation'],
    is_favorite: false,
    creator: 'System',
    created_at: new Date().toISOString(),
  };

  const synthesizedTurns: MessageTurn[] = currentRoomMessages.map((m) => ({
    id: m.id,
    chat_id: activeUniverse?.id || 'sim',
    role: m.sender_type === 'user' ? 'user' : 'assistant',
    active_index: m.active_swipe_index,
    swipes: m.swipes,
    created_at: m.created_at,
  }));

  return (
    <div className="relative flex flex-col h-full w-full bg-[#0d0d10] text-zinc-100 overflow-hidden select-text">
      {/* ─── 1. SIMULATION HEADER ────────────────────────────────────────────── */}
      <header className="h-16 px-4 md:px-6 border-b border-[#202026] bg-[#121216]/95 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
        {/* Left: Identity & Room Info */}
        <div className="flex items-center gap-3 min-w-0">
          {onBackToHub && (
            <button
              type="button"
              onClick={onBackToHub}
              aria-label="Back to Universe Hub"
              className="p-2 rounded-xl bg-[#181820] text-zinc-400 hover:text-white border border-white/5 hover:border-white/10 transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
            <Compass className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white truncate">
                {currentViewedRoom?.name || 'Simulation Chamber'}
              </h1>
              {isSpectating ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 shrink-0">
                  <Tv className="w-3 h-3 text-indigo-400" />
                  SPECTATING
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  PRESENT
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 truncate max-w-md hidden sm:block">
              {currentViewedRoom?.description || activeUniverse?.title}
            </p>
          </div>
        </div>

        {/* Right: Controls & Tools */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Active Persona Trigger Pill */}
          <button
            type="button"
            onClick={() => setIsPersonaModalOpen(true)}
            className="hidden sm:flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl bg-[#181820] hover:bg-[#202028] border border-emerald-500/25 hover:border-emerald-500/40 text-xs text-zinc-200 transition-colors cursor-pointer shadow-xs"
            title="Click to switch player roleplay persona"
          >
            <img
              src={activePersona.avatar_url}
              alt={activePersona.name}
              className="w-5 h-5 rounded-full object-cover ring-1 ring-emerald-500/50 shrink-0"
            />
            <span className="font-semibold text-emerald-300 truncate max-w-28">
              {activePersona.name}
            </span>
            <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0" />
          </button>

          {/* Quick Model Selector Dropdown */}
          <div className="relative" ref={modelDropdownRef}>
            <button
              type="button"
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-xl transition-all cursor-pointer truncate max-w-xs shadow-xs ${
                activeProvider === 'ollama'
                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              }`}
              title="Switch active AI model engine"
            >
              <Bot className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate hidden md:inline">{displayModelName}</span>
              <ChevronDown className="w-3 h-3 opacity-70 shrink-0" />
            </button>

            {isModelDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-[#18181b] border border-zinc-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-3 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800">
                  <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                    Simulation AI Engine
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

                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    placeholder="Search models..."
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

                <div className="max-h-56 overflow-y-auto space-y-1 pr-0.5">
                  {filteredQuickModels.map((m) => {
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
                            className={`p-1 rounded-lg shrink-0 ${
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
                            <span className="font-semibold text-xs text-white truncate block">
                              {m.name}
                            </span>
                            <span className="text-[10px] text-zinc-500 truncate block">
                              {m.tagline}
                            </span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Context Token Budget Meter */}
          <div ref={tokenDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setIsTokenDropdownOpen(!isTokenDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#181820] hover:bg-[#202028] border border-white/5 text-xs text-zinc-300 transition-colors cursor-pointer"
              title="Live context memory token usage"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[10px] font-mono tabular-nums">
                {formatTokensShort(totalEstimatedTokens)}/{formatTokensShort(maxContextTokens)}
              </span>
              <div className="w-12 h-1 bg-zinc-800 rounded-full overflow-hidden hidden md:block">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    contextPercentage > 80
                      ? 'bg-red-500'
                      : contextPercentage > 50
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(4, contextPercentage))}%` }}
                />
              </div>
            </button>

            {isTokenDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-[#18181b] border border-zinc-700 shadow-2xl p-3.5 z-50 text-xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-zinc-200">Context Memory</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                    {formatTokensShort(maxContextTokens)} Max
                  </span>
                </div>

                <div className="space-y-1.5 mb-3 text-[11px]">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Room Lore & World:</span>
                    <span className="font-mono text-zinc-200">{roomLoreEstimate} tokens</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Player Persona:</span>
                    <span className="font-mono text-zinc-200">{personaEstimate} tokens</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Dialogue History:</span>
                    <span className="font-mono text-zinc-200">{dialogueEstimate} tokens</span>
                  </div>
                  <div className="border-t border-zinc-800 pt-1 flex items-center justify-between font-bold">
                    <span className="text-zinc-300">Total Usage:</span>
                    <span className="font-mono text-emerald-400">
                      {totalEstimatedTokens} ({contextPercentage}%)
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsTokenDropdownOpen(false);
                    setInspectorTab('raw');
                    setIsInspectorOpen(true);
                  }}
                  className="w-full py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Inspect Raw Prompt Payload</span>
                </button>
              </div>
            )}
          </div>

          {/* Prompt Inspector Trigger */}
          <button
            type="button"
            onClick={() => {
              setInspectorTab('raw');
              setIsInspectorOpen(true);
            }}
            className="p-2 rounded-xl bg-[#181820] hover:bg-[#202028] border border-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Inspect compiled prompt payload"
          >
            <Code2 className="w-4 h-4 text-indigo-400" />
          </button>

          {/* Occupants Stack with Clickable Popover */}
          <div className="relative" ref={occupantsPopoverRef}>
            <button
              type="button"
              onClick={() => setIsOccupantsPopoverOpen(!isOccupantsPopoverOpen)}
              className="hidden md:flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-xl bg-[#181820] hover:bg-[#202028] border border-white/5 hover:border-white/10 transition-colors cursor-pointer group"
              title="Click to view all occupants in this room"
            >
              <span className="text-[11px] text-zinc-400 group-hover:text-zinc-200 flex items-center gap-1 transition-colors">
                <Users className="w-3.5 h-3.5 text-zinc-500 group-hover:text-amber-400" />
                <span>{roomOccupants.length}</span>
                {isOccupantsPopoverOpen ? (
                  <ChevronUp className="w-3 h-3 text-amber-400" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300" />
                )}
              </span>
              <div className="flex items-center -space-x-1.5">
                {roomOccupants.slice(0, 3).map((member: UniverseMember) => (
                  <img
                    key={member.id}
                    src={
                      member.avatar_url ||
                      (member.entity_type === 'user'
                        ? activePersona.avatar_url
                        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100')
                    }
                    alt={member.display_name}
                    title={`${member.display_name}${member.entity_type === 'user' ? ' (You)' : ''}`}
                    className="w-5 h-5 rounded-full object-cover ring-1 ring-[#181820]"
                  />
                ))}
              </div>
            </button>

            {/* Room Occupants Dropdown Popover */}
            {isOccupantsPopoverOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-[#16161c] border border-white/10 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-2">
                  <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    Room Occupants ({roomOccupants.length})
                  </span>
                  <span className="text-[10px] text-zinc-500 truncate max-w-30">
                    {currentViewedRoom?.name}
                  </span>
                </div>

                {roomOccupants.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic py-2 text-center">
                    No characters currently in this room.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {roomOccupants.map((member: UniverseMember) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-[#1c1c24] border border-white/5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={
                              member.avatar_url ||
                              (member.entity_type === 'user'
                                ? activePersona.avatar_url
                                : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100')
                            }
                            alt={member.display_name}
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10 shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-white block truncate">
                              {member.display_name}
                            </span>
                            <span className="text-[10px] text-zinc-400 block truncate">
                              {member.entity_type === 'user'
                                ? 'Your Player Avatar'
                                : 'Active Companion'}
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
                          {member.entity_type === 'user' ? 'You' : 'Companion'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rooms Drawer Trigger */}
          <button
            type="button"
            onClick={() => setIsLocationDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1a1a22] hover:bg-[#22222d] text-zinc-200 border border-white/10 transition-colors shadow-xs cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Rooms ({locations.length})</span>
          </button>
        </div>
      </header>

      {/* ─── 2. REMOTE SURVEILLANCE BANNER ───────────────────────────────────── */}
      {isSpectating && (
        <div className="bg-indigo-950/40 border-b border-indigo-500/25 px-4 md:px-6 py-2.5 flex items-center justify-between shrink-0 z-10 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <Radio className="w-4 h-4 text-indigo-400 animate-pulse shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-bold text-indigo-200 block truncate">
                Spectating: {currentViewedRoom?.name}
              </span>
              <span className="text-[11px] text-indigo-400/80 block truncate">
                Physical Location: {currentPhysicalRoom?.name || 'Another Room'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={returnToPhysicalLocation}
              className="px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors cursor-pointer hidden sm:inline-block"
            >
              Back to My Room
            </button>
            <button
              type="button"
              onClick={() => openTravelConfirmation(currentViewedId)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black transition-colors shadow-sm cursor-pointer"
            >
              <span>Enter Room in Person</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ─── 3. SIMULATION FEED (MESSAGES) ───────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {turnGroups.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-200">This room is quiet</h3>
            <p className="text-xs text-zinc-500 max-w-sm mt-1 leading-relaxed">
              {isSpectating
                ? 'No active conversations logged in this room yet. Use the director prompt below to initiate an event.'
                : 'Begin by describing an action or speaking to your companions using the console below.'}
            </p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            {turnGroups.map((group) => (
              <div key={group.turnNumber} className="space-y-2">
                {group.messages.map((message) => (
                  <UniverseMessageBubble
                    key={message.id}
                    message={message}
                    locationId={currentViewedId}
                    isStreaming={isStreaming}
                  />
                ))}

                {/* Atomic Turn Scenario & Reroll Divider */}
                <UniverseTurnDivider
                  turnNumber={group.turnNumber}
                  locationId={currentViewedId}
                  isStreaming={isStreaming}
                />
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* ─── 4. ADAPTIVE CONSOLE (BOTTOM INPUT BAR) ─────────────────────────── */}
      <footer className="p-4 border-t border-[#202026] bg-[#121216]/95 backdrop-blur-md shrink-0 z-20">
        <div className="max-w-4xl mx-auto">
          {isSpectating ? (
            /* ── SPECTATOR CONSOLE: Scene Continuation & Director Directive ── */
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleContinueScene}
                  disabled={isStreaming || isAdvancingScene}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#1e1e26] hover:bg-[#272732] text-zinc-200 border border-white/10 disabled:opacity-40 transition-colors cursor-pointer"
                  title="Prompt the characters in this room to speak their next natural response"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      isAdvancingScene ? 'animate-spin text-amber-400' : 'text-zinc-400'
                    }`}
                  />
                  <span>Continue Scene</span>
                </button>

                <span className="text-[11px] text-zinc-500 text-center sm:text-right">
                  Watching remotely. Enter room to participate as player.
                </span>
              </div>

              <form onSubmit={handleSendSpectatorDirective} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={spectatorDirective}
                    onChange={(e) => setSpectatorDirective(e.target.value)}
                    placeholder="✦ Scene Director: Type an environmental event or prompt for the Narrator..."
                    disabled={isStreaming}
                    className="w-full bg-[#181820] text-zinc-100 placeholder:text-zinc-500 text-xs px-3.5 py-2.5 rounded-xl border border-amber-500/20 focus:border-amber-400 focus:outline-none transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!spectatorDirective.trim() || isStreaming}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black disabled:opacity-30 transition-colors shrink-0 cursor-pointer shadow-xs"
                >
                  Enter ➔
                </button>
              </form>
            </div>
          ) : (
            /* ── IN-PERSON CONSOLE: Dual-Channel Roleplay & Director ── */
            <div className="space-y-2">
              {/* Mode Switcher Tabs + Active Identity & Engine Ribbon */}
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUserInputChannel('player')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      activeInputChannel === 'player'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <span>👤 Play as {activePersona.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserInputChannel('director')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      activeInputChannel === 'director'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-serif italic'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <span>✦ Scene Director (God Mode)</span>
                  </button>
                </div>

                <div className="hidden sm:flex items-center gap-2 text-[10px] text-zinc-400">
                  <span className="font-mono">Engine: {displayModelName}</span>
                </div>
              </div>

              {/* Roleplay / Director Input Bar */}
              <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                <div className="relative flex-1">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    rows={2}
                    placeholder={
                      activeInputChannel === 'director'
                        ? '✦ Direct the Narrator: Describe a sudden scene change, hazard, or plot beat...'
                        : `Speak or act as ${activePersona.name} (actions in *asterisks*, e.g., *draws map* "Let's head out")...`
                    }
                    disabled={isStreaming}
                    className={`w-full bg-[#181820] text-zinc-100 placeholder:text-zinc-500 text-xs p-3 rounded-2xl border resize-none focus:outline-none transition-colors ${
                      activeInputChannel === 'director'
                        ? 'border-amber-500/25 focus:border-amber-400 font-serif'
                        : 'border-zinc-800 focus:border-violet-500/60'
                    }`}
                  />
                  <div className="flex items-center justify-between px-2 pb-1 text-[10px] text-zinc-500">
                    <span>
                      Press <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-400">Enter</kbd> to send,{' '}
                      <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-400">Shift+Enter</kbd> for newline
                    </span>
                  </div>
                </div>

                {/* Ghostwriter Action Button */}
                <button
                  type="button"
                  onClick={handleGhostwrite}
                  disabled={isStreaming || isGhostwriting}
                  className="p-3 rounded-2xl bg-[#1f1f28] hover:bg-[#282834] text-amber-300 border border-amber-500/20 hover:border-amber-500/40 transition-all cursor-pointer shadow-xs shrink-0"
                  title="AI Ghostwriter: Suggest player dialogue or action"
                  aria-label="Ghostwriter suggestion"
                >
                  <Wand2 className={`w-4 h-4 ${isGhostwriting ? 'animate-spin text-amber-400' : ''}`} />
                </button>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!inputText.trim() || isStreaming}
                  className={`p-3 rounded-2xl flex items-center justify-center transition-all disabled:opacity-30 cursor-pointer shrink-0 shadow-md ${
                    activeInputChannel === 'director'
                      ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/10'
                      : 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/20'
                  }`}
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      </footer>

      {/* ─── 5. MODAL DRAWERS & INSPECTOR ────────────────────────────────────── */}
      <LocationDrawer
        isOpen={isLocationDrawerOpen}
        onClose={() => setIsLocationDrawerOpen(false)}
      />

      <TravelConfirmationModal />

      {/* Persona Selector Modal */}
      <PersonaSelectorModal
        isOpen={isPersonaModalOpen}
        onClose={() => setIsPersonaModalOpen(false)}
        personas={personas}
        activePersonaId={activePersonaId}
        onSelectPersona={handleSelectPersona}
        onCreatePersona={addPersona}
      />

      {/* 6-Layer Prompt Inspector Modal */}
      {isInspectorOpen && (
        <PromptInspector
          character={synthesizedCharacter}
          persona={activePersona}
          turns={synthesizedTurns}
          modelName={activeModel}
          temperature={0.9}
          maxTokens={maxContextTokens}
          initialTab={inspectorTab}
          onClose={() => setIsInspectorOpen(false)}
        />
      )}
    </div>
  );
};
