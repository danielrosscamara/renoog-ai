import React from 'react';
import { 
  Users, 
  Globe, 
  Sparkles, 
  Star, 
  ChevronRight 
} from 'lucide-react';
import type { HomeDestination, PersonaPreset } from '../../types/universe';

interface HomeHubProps {
  onNavigate: (destination: HomeDestination) => void;
  characterCount?: number;
  worldCount?: number;
  universeCount?: number;
  activePersona?: PersonaPreset;
  onSelectPersona?: (persona: PersonaPreset) => void;
  userEmail?: string;
}

export const HomeHub: React.FC<HomeHubProps> = ({
  onNavigate,
  characterCount = 6,
  worldCount = 4,
  universeCount = 0
}) => {
  return (
    <div className="relative flex flex-col flex-1 h-full overflow-y-auto bg-zinc-950 text-zinc-100 p-6 md:p-10">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Clean Welcome Header */}
      <div className="relative z-10 pb-8 border-b border-zinc-800/80">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-100">
          Welcome to Renoog AI
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Choose a destination to continue your story.
        </p>
      </div>

      {/* Primary 3-Way Navigation Row */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-5 my-8">
        {/* Card 1: Characters */}
        <button
          onClick={() => onNavigate('characters')}
          className="flex flex-col text-left p-6 bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-indigo-500/50 rounded-2xl transition-all duration-200 hover:scale-[1.015] shadow-lg group backdrop-blur-sm cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-105 transition-transform shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors">
            Characters & Companions
          </h3>
          <p className="text-xs text-zinc-400 mt-2">
            Browse and create AI companion cards.
          </p>
          <div className="mt-6 flex items-center justify-between text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">
            <span>{characterCount} Available</span>
            <ChevronRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />
          </div>
        </button>

        {/* Card 2: Worlds & Lore */}
        <button
          onClick={() => onNavigate('worlds')}
          className="flex flex-col text-left p-6 bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-emerald-500/50 rounded-2xl transition-all duration-200 hover:scale-[1.015] shadow-lg group backdrop-blur-sm cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-105 transition-transform shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-zinc-100 group-hover:text-emerald-300 transition-colors">
            Worlds & Lorebooks
          </h3>
          <p className="text-xs text-zinc-400 mt-2">
            Explore settings, lore, and factions.
          </p>
          <div className="mt-6 flex items-center justify-between text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">
            <span>{worldCount} Settings</span>
            <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform shrink-0" />
          </div>
        </button>

        {/* Card 3: Favorites & Saved (Swapped from Row 2) */}
        <button
          onClick={() => onNavigate('favorites')}
          className="flex flex-col text-left p-6 bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-amber-500/50 rounded-2xl transition-all duration-200 hover:scale-[1.015] shadow-lg group backdrop-blur-sm cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-105 transition-transform shrink-0">
            <Star className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-zinc-100 group-hover:text-amber-300 transition-colors">
            Favorites & Saved
          </h3>
          <p className="text-xs text-zinc-400 mt-2">
            Pinned characters and worlds.
          </p>
          <div className="mt-6 flex items-center justify-between text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">
            <span>Quick Access</span>
            <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform shrink-0" />
          </div>
        </button>
      </div>

      {/* Secondary Row: Simulation Pillars */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 4: Create Universe */}
        <button
          onClick={() => onNavigate('create-universe')}
          className="flex items-center gap-5 p-6 bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-800/80 hover:border-indigo-500/50 rounded-2xl transition-all duration-200 hover:scale-[1.01] shadow-md group text-left cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 group-hover:scale-105 transition-transform">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors">
              Create Universe
            </h4>
            <p className="text-xs text-zinc-400 mt-1">
              Choose characters & world
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all shrink-0" />
        </button>

        {/* Card 5: Continue Universe */}
        <button
          onClick={() => onNavigate('continue-universe')}
          className="flex items-center gap-5 p-6 bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-800/80 hover:border-violet-500/50 rounded-2xl transition-all duration-200 hover:scale-[1.01] shadow-md group text-left cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0 group-hover:scale-105 transition-transform">
            <Globe className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-base font-semibold text-zinc-100 group-hover:text-violet-300 transition-colors">
                Continue Universe
              </h4>
              {universeCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/30">
                  {universeCount} saved
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Resume a saved universe
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-violet-400 group-hover:translate-x-1 transition-all shrink-0" />
        </button>
      </div>
    </div>
  );
};
