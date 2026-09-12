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
import { RightSidebar } from '../layout/RightSidebar';

export interface UniverseCockpitProps {
  onBackToHub?: () => void;
}

/**
 * UniverseCockpit
 *
 * Central simulation hub of Renoog AI V2.
 * Integrates the spatial room feed, remote surveillance feeds, zero-turn scene
 * continuation, dual-channel input console, active persona switcher, and modular
 * expandable RightSidebar HUD.
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
    isRightSidebarOpen,
    toggleRightSidebar,
  } = useChatStore();

  // Local UI state
  const [isLocationDrawerOpen, setIsLocationDrawerOpen] = useState(false);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [spectatorDirective, setSpectatorDirective] = useState('');
  const [isAdvancingScene, setIsAdvancingScene] = useState(false);
  const [isGhostwriting, setIsGhostwriting] = useState(false);

  // Inspector state
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<'layers' | 'raw'>('raw');

  // Refs for occupants popover & scroll anchor
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const occupantsPopoverRef = useRef<HTMLDivElement | null>(null);
  const [isOccupantsPopoverOpen, setIsOccupantsPopoverOpen] = useState(false);

  // Click-outside listener for occupants popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        occupantsPopoverRef.current &&
        !occupantsPopoverRef.current.contains(e.target as Node)
      ) {
        setIsOccupantsPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  // Active Model & Provider for status display in bottom bar
  const activeProvider = localStorage.getItem('renoog_llm_provider') || 'openrouter';
  const ollamaModel = localStorage.getItem('renoog_ollama_model') || 'llama3.2:3b';
  const openRouterModel = localStorage.getItem('renoog_model') || 'anthropic/claude-3.5-sonnet';
  const customModel = localStorage.getItem('renoog_custom_endpoint_url') ? 'custom-model' : 'local-model';

  const activeModel =
    activeProvider === 'ollama'
      ? ollamaModel
      : activeProvider === 'custom'
      ? customModel
      : openRouterModel;

  const displayModelName =
    activeProvider === 'ollama'
      ? `🦙 ${ollamaModel.replace(':latest', '')}`
      : activeProvider === 'custom'
      ? `⚡ ${customModel}`
      : (activeModel.split('/')[1] || activeModel);

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
      {/* ─── 1. SIMULATION HEADER (Spacious & Decluttered) ────────────────────── */}
      <header className="h-16 px-4 md:px-6 border-b border-[#202026] bg-[#121216]/95 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
        {/* Left: Room Identity & Ambience */}
        <div className="flex items-center gap-3 min-w-0 pr-4">
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
              <h1 className="text-sm font-bold text-white truncate max-w-44 sm:max-w-xs md:max-w-md">
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
            <p className="text-[11px] text-zinc-400 truncate max-w-sm sm:max-w-md hidden sm:block">
              {currentViewedRoom?.description || activeUniverse?.title}
            </p>
          </div>
        </div>

        {/* Right: Quick Tools & HUD Controls Trigger */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Active Persona Trigger Pill */}
          <button
            type="button"
            onClick={() => setIsPersonaModalOpen(true)}
            className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl bg-[#181820] hover:bg-[#202028] border border-emerald-500/25 hover:border-emerald-500/40 text-xs text-zinc-200 transition-colors cursor-pointer shadow-xs"
            title="Click to switch player roleplay persona"
          >
            <img
              src={activePersona.avatar_url}
              alt={activePersona.name}
              className="w-5 h-5 rounded-full object-cover ring-1 ring-emerald-500/50 shrink-0"
            />
            <span className="font-semibold text-emerald-300 truncate max-w-20 sm:max-w-28">
              {activePersona.name}
            </span>
            <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0" />
          </button>

          {/* Occupants Stack with Clickable Popover */}
          <div className="relative" ref={occupantsPopoverRef}>
            <button
              type="button"
              onClick={() => setIsOccupantsPopoverOpen(!isOccupantsPopoverOpen)}
              className="hidden sm:flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-xl bg-[#181820] hover:bg-[#202028] border border-white/5 hover:border-white/10 transition-colors cursor-pointer group"
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
            <span className="hidden md:inline">Rooms ({locations.length})</span>
          </button>

          {/* Modular HUD & Controls Trigger Button (Matching Image 2) */}
          <button
            type="button"
            onClick={toggleRightSidebar}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs ${
              isRightSidebarOpen
                ? 'bg-amber-500 text-black font-bold shadow-amber-500/20'
                : 'bg-[#1a1a22] hover:bg-[#22222d] text-zinc-300 border border-white/10 hover:border-amber-500/40'
            }`}
            title={isRightSidebarOpen ? 'Close HUD Controls' : 'Open Simulation HUD & Controls'}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{isRightSidebarOpen ? 'HUD Open' : 'HUD'}</span>
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

      {/* ─── 3. SIMULATION STAGE + DOCKED RIGHT SIDEBAR CONTAINER ─────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Center Simulation Column (Feed + Bottom Console) */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
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

        {/* ─── 4. ADAPTIVE CONSOLE (BOTTOM INPUT BAR) ───────────────────────── */}
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
        </div>

        {/* ─── 5. DOCKED MODULAR RIGHT SIDEBAR / RAIL ───────────────────────── */}
        <RightSidebar
          character={synthesizedCharacter}
          persona={activePersona}
          roomOccupants={roomOccupants}
          currentRoom={currentViewedRoom}
          roomMessages={currentRoomMessages}
          worldName={activeUniverse?.world_name || activeUniverse?.title}
          onOpenInspector={(tab) => {
            setInspectorTab(tab || 'raw');
            setIsInspectorOpen(true);
          }}
        />
      </div>

      {/* ─── 6. MODAL DRAWERS & INSPECTORS ──────────────────────────────────── */}
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
          initialTab={inspectorTab}
          onClose={() => setIsInspectorOpen(false)}
        />
      )}
    </div>
  );
};
