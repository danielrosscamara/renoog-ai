import React, { useState } from 'react';
import { 
  Users, 
  Globe, 
  Sparkles, 
  Star, 
  Cpu, 
  ChevronRight, 
  Check, 
  UserCircle,
  Compass,
  BookOpen,
  Zap,
  Mail,
  LogOut,
  User,
  RefreshCw
} from 'lucide-react';
import type { HomeDestination, PersonaPreset } from '../../types/universe';
import { PERSONA_PRESETS, DEFAULT_PERSONA_PRESET } from '../../data/personaPresets';

interface HomeHubProps {
  onNavigate: (destination: HomeDestination) => void;
  activePersona?: PersonaPreset;
  onSelectPersona?: (persona: PersonaPreset) => void;
  userEmail?: string;
  onSignOut?: () => void;
  onManageAccount?: () => void;
  characterCount?: number;
  worldCount?: number;
  universeCount?: number;
}

export const HomeHub: React.FC<HomeHubProps> = ({
  onNavigate,
  activePersona = DEFAULT_PERSONA_PRESET,
  onSelectPersona,
  userEmail = 'dale@renoog.ai',
  onSignOut,
  onManageAccount,
  characterCount = 12,
  worldCount = 4,
  universeCount = 2
}) => {
  const [isPersonaMenuOpen, setIsPersonaMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const getPersonaIcon = (iconName: string) => {
    switch (iconName) {
      case 'Compass':
        return <Compass className="w-4 h-4 text-emerald-400" />;
      case 'BookOpen':
        return <BookOpen className="w-4 h-4 text-amber-400" />;
      case 'Zap':
        return <Zap className="w-4 h-4 text-cyan-400" />;
      default:
        return <UserCircle className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="relative flex flex-col flex-1 h-full overflow-y-auto bg-zinc-950 text-zinc-100 p-6 md:p-10">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-8 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
              Living Story Engine
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-100">
            Renoog AI Command Deck
          </h1>
        </div>

        {/* Dual Control Buttons: Persona & Email Account */}
        <div className="flex items-center gap-3">
          {/* 1. Persona Quick-Select Popover */}
          <div className="relative">
            <button
              onClick={() => {
                setIsPersonaMenuOpen(!isPersonaMenuOpen);
                setIsAccountMenuOpen(false);
              }}
              className="flex items-center gap-3 px-3.5 py-2 bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800 rounded-xl transition-all shadow-sm group"
              title="Switch In-Game Roleplay Persona"
            >
              <img 
                src={activePersona.avatar_url} 
                alt={activePersona.name}
                className="w-7 h-7 rounded-full object-cover ring-1 ring-indigo-500/50" 
              />
              <div className="text-left hidden sm:block">
                <div className="text-xs font-medium text-zinc-200 group-hover:text-indigo-300 transition-colors">
                  {activePersona.name}
                </div>
                <div className="text-[10px] text-zinc-400">
                  {activePersona.title}
                </div>
              </div>
              {getPersonaIcon(activePersona.icon)}
            </button>

            {/* Persona Dropdown Menu */}
            {isPersonaMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-2 py-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Active Persona Preset
                </div>
                <div className="space-y-1">
                  {PERSONA_PRESETS.map(preset => {
                    const isSelected = preset.id === activePersona.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => {
                          onSelectPersona?.(preset);
                          setIsPersonaMenuOpen(false);
                        }}
                        className={`w-full flex items-start gap-3 p-2 rounded-lg text-left transition-all ${
                          isSelected 
                            ? 'bg-indigo-950/50 border border-indigo-500/30' 
                            : 'hover:bg-zinc-800/60'
                        }`}
                      >
                        <img 
                          src={preset.avatar_url} 
                          alt={preset.name}
                          className="w-8 h-8 rounded-full object-cover mt-0.5" 
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-medium truncate ${isSelected ? 'text-indigo-300' : 'text-zinc-200'}`}>
                              {preset.name}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                          </div>
                          <div className="text-[10px] text-zinc-400 truncate">
                            {preset.title}
                          </div>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {preset.traits.slice(0, 2).map(trait => (
                              <span key={trait} className="text-[9px] px-1.5 py-0.5 bg-zinc-800/80 text-zinc-400 rounded">
                                {trait}
                              </span>
                            ))}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 2. User Email Account Popover */}
          <div className="relative">
            <button
              onClick={() => {
                setIsAccountMenuOpen(!isAccountMenuOpen);
                setIsPersonaMenuOpen(false);
              }}
              className="flex items-center gap-2.5 px-3.5 py-2 bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800 rounded-xl transition-all shadow-sm group"
              title="Manage Platform Account"
            >
              <div className="w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                <Mail className="w-3.5 h-3.5" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-medium text-zinc-200 group-hover:text-indigo-300 transition-colors truncate max-w-35">
                  {userEmail}
                </div>
                <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  Local Account
                </div>
              </div>
            </button>

            {/* Account Dropdown Menu */}
            {isAccountMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-2.5 py-2 mb-1 bg-zinc-950/60 rounded-lg border border-zinc-800/60">
                  <div className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
                    Logged In As
                  </div>
                  <div className="text-xs font-medium text-zinc-100 truncate mt-0.5">
                    {userEmail}
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Local Workspace Session
                  </div>
                </div>

                <div className="space-y-0.5 text-xs">
                  <button
                    onClick={() => {
                      onManageAccount?.();
                      setIsAccountMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60 rounded-lg transition-colors"
                  >
                    <User className="w-4 h-4 text-zinc-400" />
                    <span>View Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      onNavigate('settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60 rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 text-zinc-400" />
                    <span>Account Settings</span>
                  </button>

                  <div className="my-1 border-t border-zinc-800" />

                  <button
                    onClick={() => {
                      onSignOut?.();
                      setIsAccountMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hero Welcome Message */}
      <div className="relative z-10 my-8">
        <h2 className="text-xl md:text-2xl font-semibold text-zinc-100">
          Welcome back, {activePersona.name}
        </h2>
        <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
          Account: <span className="text-zinc-300">{userEmail}</span> • Your local world simulation state is preserved. Explore companion cards, configure world lorebooks, or step directly into an active Universe.
        </p>
      </div>

      {/* 5-Way Destination Grid */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        {/* Card 1: Characters */}
        <button
          onClick={() => onNavigate('characters')}
          className="flex flex-col text-left p-6 bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-indigo-500/50 rounded-2xl transition-all duration-200 hover:scale-[1.015] shadow-lg group backdrop-blur-sm"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-105 transition-transform">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors">
            Characters & Companions
          </h3>
          <p className="text-xs text-zinc-400 mt-2 line-clamp-2">
            Browse, inspect, and roleplay with companions. Build custom cards with local LLM prompt blocks.
          </p>
          <div className="mt-auto pt-6 flex items-center justify-between text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">
            <span>{characterCount} Companions</span>
            <ChevronRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />
          </div>
        </button>

        {/* Card 2: Worlds & Lore */}
        <button
          onClick={() => onNavigate('worlds')}
          className="flex flex-col text-left p-6 bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-emerald-500/50 rounded-2xl transition-all duration-200 hover:scale-[1.015] shadow-lg group backdrop-blur-sm"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-105 transition-transform">
            <Globe className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-zinc-100 group-hover:text-emerald-300 transition-colors">
            Worlds & Lorebooks
          </h3>
          <p className="text-xs text-zinc-400 mt-2 line-clamp-2">
            Explore world settings, factions, and magic/tech rules. Pair lorebooks with companions to spawn Universes.
          </p>
          <div className="mt-auto pt-6 flex items-center justify-between text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">
            <span>{worldCount} World Settings</span>
            <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform shrink-0" />
          </div>
        </button>

        {/* Card 3: Universes */}
        <button
          onClick={() => onNavigate('universes')}
          className="flex flex-col text-left p-6 bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-violet-500/50 rounded-2xl transition-all duration-200 hover:scale-[1.015] shadow-lg group backdrop-blur-sm"
        >
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-4 group-hover:scale-105 transition-transform">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-zinc-100 group-hover:text-violet-300 transition-colors">
            Universe Simulation
          </h3>
          <p className="text-xs text-zinc-400 mt-2 line-clamp-2">
            Step into living, multi-character rooms powered by the 3-Role Trinity (Narrator ➔ Characters ➔ User).
          </p>
          <div className="mt-auto pt-6 flex items-center justify-between text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">
            <span>{universeCount} Active Universes</span>
            <ChevronRight className="w-4 h-4 text-violet-400 group-hover:translate-x-1 transition-transform shrink-0" />
          </div>
        </button>
      </div>

      {/* Bottom Secondary Cards */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 4: Recent & Saved Library */}
        <button
          onClick={() => onNavigate('favorites')}
          className="flex items-center gap-5 p-5 bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-800/80 hover:border-amber-500/50 rounded-2xl transition-all duration-200 hover:scale-[1.01] shadow-md group text-left"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Star className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-zinc-200 group-hover:text-amber-300 transition-colors">
              Favorites & Saved Library
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5 truncate">
              Manage pinned companions, favorite worlds, and story bookmarks.
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all shrink-0" />
        </button>

        {/* Card 5: Local Inference & Settings */}
        <button
          onClick={() => onNavigate('settings')}
          className="flex items-center gap-5 p-5 bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-800/80 hover:border-cyan-500/50 rounded-2xl transition-all duration-200 hover:scale-[1.01] shadow-md group text-left"
        >
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-zinc-200 group-hover:text-cyan-300 transition-colors">
              Local Inference & Samplers
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5 truncate">
              RTX 3050 GPU parameters, Ollama connection, and token budgets.
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all shrink-0" />
        </button>
      </div>
    </div>
  );
};
