import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Globe,
  Star,
  ArrowLeft,
  Sparkles,
  MapPin,
  Compass,
} from 'lucide-react';
import type { Character } from '../../types';
import type { WorldPreset } from '../../data/worldPresets';
import { WORLD_PRESETS } from '../../data/worldPresets';
import { useWorldStore } from '../../stores/useWorldStore';

export type WorldSourceMode = 'all' | 'favorites';

export interface ChooseWorldSourceModalProps {
  character?: Character | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectWorld?: (world: WorldPreset, character?: Character | null) => void;
  onSelectWorldAndLaunch?: (character: Character, world: WorldPreset) => void;
  title?: string;
}

const FAVORITES_STORAGE_KEY = 'renoog_favorite_worlds';

export const ChooseWorldSourceModal: React.FC<ChooseWorldSourceModalProps> = ({
  character,
  isOpen,
  onClose,
  onSelectWorld,
  onSelectWorldAndLaunch,
  title,
}) => {
  const storeWorlds = useWorldStore((state) => state.worlds);
  const storeFavIds = useWorldStore((state) => state.favoriteWorldIds);
  const allWorlds = storeWorlds.length > 0 ? storeWorlds : WORLD_PRESETS;

  const [step, setStep] = useState<'decision' | 'picker'>('decision');
  const [sourceMode, setSourceMode] = useState<WorldSourceMode>('all');
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  // Synchronous render-phase state adjustment when modal transitions from closed to open
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setStep('decision');
      setSourceMode('all');
    }
  }

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

  const effectiveFavIds = useMemo(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      const legacyIds = stored ? (JSON.parse(stored) as string[]) : [];
      return Array.from(new Set([...storeFavIds, ...legacyIds]));
    } catch {
      return storeFavIds;
    }
  }, [storeFavIds]);

  const favoriteWorlds = useMemo(() => {
    return allWorlds.filter((w) => effectiveFavIds.includes(w.id));
  }, [allWorlds, effectiveFavIds]);

  const displayedWorlds = useMemo(() => {
    return sourceMode === 'favorites' ? favoriteWorlds : allWorlds;
  }, [sourceMode, favoriteWorlds, allWorlds]);

  const handleSelectWorld = (world: WorldPreset) => {
    if (onSelectWorldAndLaunch && character) {
      onSelectWorldAndLaunch(character, world);
    } else if (onSelectWorld) {
      onSelectWorld(world, character);
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  const handleChooseSource = (mode: WorldSourceMode) => {
    setSourceMode(mode);
    setStep('picker');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      {/* Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity cursor-pointer animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog Shell */}
      <div className="relative w-full max-w-xl bg-[#111115] border border-zinc-800 rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        {/* HEADER BAR */}
        <header className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {step === 'picker' && (
              <button
                type="button"
                onClick={() => setStep('decision')}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
                aria-label="Back to choices"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>
                  {title ||
                    (step === 'decision'
                      ? 'Choose a World Setting'
                      : sourceMode === 'favorites'
                      ? 'Favorite Worlds'
                      : 'Browse Worlds')}
                </span>
                {step === 'picker' && (
                  <span className="text-xs font-normal text-zinc-400">
                    ({displayedWorlds.length})
                  </span>
                )}
              </h2>
              {character && (
                <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                  <span>Companion:</span>
                  <span className="font-medium text-indigo-300 truncate max-w-50">
                    {character.name}
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* STEP 1: DECISION SCREEN (THE FLOWCHART DIAMOND) */}
        {step === 'decision' && (
          <div className="p-6 space-y-4 overflow-y-auto">
            <p className="text-xs text-zinc-400">
              Where would you like to choose your world setting for this Universe?
            </p>

            <div className="space-y-3">
              {/* Option 1: Browse Worlds */}
              <button
                type="button"
                onClick={() => handleChooseSource('all')}
                className="w-full text-left p-4 rounded-xl bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 transition-all flex items-start gap-4 group cursor-pointer shadow-sm hover:shadow-indigo-500/10"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform shrink-0">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                      Browse Worlds
                    </h3>
                    <span className="text-xs font-semibold text-zinc-500">
                      {WORLD_PRESETS.length} Available
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Explore your full catalog of world lorebooks and physical settings.
                  </p>
                </div>
              </button>

              {/* Option 2: Favorite Worlds */}
              <button
                type="button"
                onClick={() => handleChooseSource('favorites')}
                className="w-full text-left p-4 rounded-xl bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 transition-all flex items-start gap-4 group cursor-pointer shadow-sm hover:shadow-amber-500/10"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform shrink-0">
                  <Star className="w-5 h-5 fill-amber-400/20" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                      Favorite Worlds
                    </h3>
                    <span className="text-xs font-semibold text-zinc-500">
                      {favoriteWorlds.length} Starred
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Choose from world settings you have marked as favorites.
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DEDICATED WORLD SELECTION LIST */}
        {step === 'picker' && (
          <div className="p-5 overflow-y-auto space-y-3">
            {displayedWorlds.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <Star className="w-8 h-8 text-zinc-600 mx-auto" />
                <p className="text-xs font-semibold text-zinc-300">
                  No favorite worlds found
                </p>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                  You haven't added any world settings to your favorites yet.
                </p>
                <button
                  type="button"
                  onClick={() => setSourceMode('all')}
                  className="mt-2 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                >
                  Browse All Worlds Instead
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedWorlds.map((world) => {
                  const isFav = effectiveFavIds.includes(world.id);
                  const spawnLocation =
                    world.starter_locations.find((l) => l.id === world.default_location_id) ||
                    world.starter_locations[0];

                  return (
                    <div
                      key={world.id}
                      className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-indigo-500/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
                    >
                      {/* World Card Information */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={world.banner_url}
                          alt={world.name}
                          className="w-16 h-14 rounded-xl object-cover ring-1 ring-white/10 shrink-0 bg-zinc-800"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-black/60 text-indigo-300 border border-indigo-500/20">
                              {world.genre}
                            </span>
                            <h4 className="text-xs font-bold text-white truncate">
                              {world.name}
                            </h4>
                            {isFav && (
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400 truncate mt-1">
                            {world.tagline}
                          </p>
                          {spawnLocation && (
                            <div className="flex items-center gap-1 text-[10px] text-zinc-500 mt-1">
                              <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
                              <span className="truncate">Spawn: {spawnLocation.name}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Genesis / Selection Trigger Button */}
                      <button
                        type="button"
                        onClick={() => handleSelectWorld(world)}
                        className="w-full sm:w-auto shrink-0 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer active:scale-[0.99]"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                        <span>
                          {onSelectWorldAndLaunch && character
                            ? 'Start Universe ➔'
                            : 'Select World ➔'}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* BOTTOM CANCEL FOOTER */}
        <footer className="p-4 border-t border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md shrink-0 flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-indigo-400" />
            <span>Multi-entity roleplay simulation</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
};
