import React, { useEffect, useState } from 'react';
import {
  X,
  Sparkles,
  MapPin,
  CheckCircle2,
  Circle,
  Globe,
  Layers,
  User,
} from 'lucide-react';
import type { Character } from '../../types';
import {
  WORLD_PRESETS,
  type WorldPreset,
  DEFAULT_WORLD_PRESET,
} from '../../data/worldPresets';

export interface WorldPairingDrawerProps {
  character: Character | null;
  isOpen: boolean;
  onClose: () => void;
  onPairAndLaunch: (character: Character, world: WorldPreset, title: string) => void;
}

export const WorldPairingDrawer: React.FC<WorldPairingDrawerProps> = ({
  character,
  isOpen,
  onClose,
  onPairAndLaunch,
}) => {
  const [selectedWorldId, setSelectedWorldId] = useState<string>(DEFAULT_WORLD_PRESET.id);
  const [titleOverride, setTitleOverride] = useState<string | null>(null);
  const [prevCharId, setPrevCharId] = useState<string | null>(null);

  // Derive active world
  const selectedWorld =
    WORLD_PRESETS.find((w) => w.id === selectedWorldId) ?? DEFAULT_WORLD_PRESET;

  // Reset title override when character prop changes
  if (character && character.id !== prevCharId) {
    setPrevCharId(character.id);
    setTitleOverride(null);
  }

  const defaultTitle = character
    ? `${character.name} in ${selectedWorld.name}`
    : `New Universe in ${selectedWorld.name}`;
  const displayTitle = titleOverride !== null ? titleOverride : defaultTitle;

  // Handle escape key and body scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !character) {
    return null;
  }

  const handleLaunchClick = () => {
    onPairAndLaunch(character, selectedWorld, displayTitle.trim() || defaultTitle);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden" role="dialog" aria-modal="true">
      {/* Dimmed Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity cursor-pointer animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-Over Holo-Drawer Container */}
      <aside className="relative w-full max-w-xl bg-[#111114] border-l border-[#222228] h-full shadow-2xl flex flex-col z-10 overflow-hidden animate-in slide-in-from-right duration-300">
        {/* DRAWER HEADER */}
        <div className="p-6 border-b border-[#202026] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Pair with World Lorebook
              </h2>
              <p className="text-xs text-zinc-400">
                Ground the Narrator and seed the initial physical rooms.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close World Pairing Drawer"
            className="p-2 rounded-xl bg-[#18181f] text-zinc-400 hover:text-white border border-white/5 hover:border-white/10 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ACTIVE COMPANION PREVIEW CHIP */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
              Companion Being Paired
            </label>
            <div className="p-3.5 rounded-2xl bg-[#16161c] border border-white/5 flex items-center gap-3.5">
              <img
                src={character.avatar_url}
                alt={character.name}
                className="w-12 h-12 rounded-xl object-cover ring-2 ring-indigo-500/30 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white truncate">
                    {character.name}
                  </h3>
                  {character.tags[0] && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {character.tags[0]}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 truncate mt-0.5">
                  {character.tagline}
                </p>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-zinc-400 bg-black/40 px-2.5 py-1 rounded-lg border border-white/5 shrink-0">
                <User className="w-3 h-3 text-indigo-400" />
                <span>1 / 1</span>
              </div>
            </div>
          </div>

          {/* WORLD LOREBOOK SELECTION LIST */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                Choose a World Setting
              </label>
              <span className="text-[11px] text-indigo-400 font-medium">
                {WORLD_PRESETS.length} Starter Worlds
              </span>
            </div>

            <div className="space-y-3">
              {WORLD_PRESETS.map((world) => {
                const isSelected = world.id === selectedWorldId;
                return (
                  <div
                    key={world.id}
                    onClick={() => {
                      setSelectedWorldId(world.id);
                      setTitleOverride(null); // Recalculate title with newly selected world
                    }}
                    className={`group relative rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer ${
                      isSelected
                        ? 'bg-[#151522] border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg shadow-indigo-500/5'
                        : 'bg-[#15151a] border-[#22222a] hover:border-zinc-700 hover:bg-[#181820]'
                    }`}
                  >
                    {/* Widescreen Banner Thumbnail */}
                    <div className="relative h-20 w-full overflow-hidden bg-zinc-900">
                      <img
                        src={world.banner_url}
                        alt={world.name}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-[#151522] via-[#151522]/60 to-transparent" />

                      {/* Genre Tag Pill */}
                      <span className="absolute top-2.5 left-3 px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/60 backdrop-blur-md text-zinc-300 border border-white/10">
                        {world.genre}
                      </span>

                      {/* Selection Radio / Check Indicator */}
                      <div className="absolute top-2.5 right-3">
                        {isSelected ? (
                          <CheckCircle2 className="w-5 h-5 text-indigo-400 fill-indigo-500/20" />
                        ) : (
                          <Circle className="w-5 h-5 text-zinc-500 group-hover:text-zinc-400" />
                        )}
                      </div>
                    </div>

                    {/* World Content Body */}
                    <div className="p-4 -mt-3 relative z-10 space-y-2">
                      <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {world.name}
                      </h4>
                      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                        {world.tagline}
                      </p>

                      {/* Starter Spatial Rooms */}
                      <div className="pt-2 border-t border-white/5 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          <Layers className="w-3 h-3 text-zinc-400" />
                          <span>Starter Spatial Rooms:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {world.starter_locations.map((loc) => {
                            const isSpawnRoom = loc.id === world.default_location_id;
                            return (
                              <span
                                key={loc.id}
                                className={`px-2 py-1 rounded-md text-[10px] font-medium flex items-center gap-1 ${
                                  isSpawnRoom
                                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                                    : 'bg-[#1a1a24] text-zinc-400 border border-white/5'
                                }`}
                              >
                                <MapPin className="w-2.5 h-2.5" />
                                <span>{loc.name}</span>
                                {isSpawnRoom && <span className="text-[9px] text-indigo-400">(Spawn)</span>}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* UNIVERSE SIMULATION TITLE INPUT */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
              Universe Simulation Title
            </label>
            <input
              type="text"
              value={displayTitle}
              onChange={(e) => setTitleOverride(e.target.value)}
              placeholder="Enter a title for this simulation..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#16161c] border border-[#262630] focus:border-indigo-500 text-xs text-white outline-none transition-colors"
            />
            <p className="text-[10px] text-zinc-400 mt-1.5">
              Initializes 3 simulation members: <strong className="text-zinc-300">Narrator</strong>, <strong className="text-zinc-300">{character.name}</strong>, and <strong className="text-zinc-300">You</strong>.
            </p>
          </div>
        </div>

        {/* PINNED STICKY GENESIS LAUNCHPAD */}
        <div className="p-5 border-t border-[#202026] bg-[#111114]/95 backdrop-blur-md shrink-0">
          <button
            type="button"
            onClick={handleLaunchClick}
            className="w-full py-3.5 px-5 rounded-xl bg-linear-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            <span>Initialize Universe & Begin Simulation</span>
          </button>
          <p className="text-[10px] text-zinc-400 text-center mt-2">
            Spawns {selectedWorld.starter_locations.length} rooms and generates initial Narrator scene prose.
          </p>
        </div>
      </aside>
    </div>
  );
};
