import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Users,
  Star,
  ArrowLeft,
  Sparkles,
  MapPin,
  Compass,
} from 'lucide-react';
import type { Character } from '../../types';
import type { WorldPreset } from '../../data/worldPresets';
import { useChatStore } from '../../stores/useChatStore';

export type CharacterSourceMode = 'all' | 'favorites';

export interface ChooseCharacterSourceModalProps {
  world: WorldPreset | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectCharacterAndLaunch: (character: Character, world: WorldPreset) => void;
}

export const ChooseCharacterSourceModal: React.FC<ChooseCharacterSourceModalProps> = ({
  world,
  isOpen,
  onClose,
  onSelectCharacterAndLaunch,
}) => {
  const characters = useChatStore((state) => state.characters);
  const [step, setStep] = useState<'decision' | 'picker'>('decision');
  const [sourceMode, setSourceMode] = useState<CharacterSourceMode>('all');
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  // Synchronous render-phase state reset when modal transitions from closed to open
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

  const nonHiddenCharacters = useMemo(() => {
    return characters.filter((c) => !c.is_hidden);
  }, [characters]);

  const favoriteCharacters = useMemo(() => {
    return nonHiddenCharacters.filter((c) => Boolean(c.is_favorite));
  }, [nonHiddenCharacters]);

  const displayedCharacters = useMemo(() => {
    return sourceMode === 'favorites' ? favoriteCharacters : nonHiddenCharacters;
  }, [sourceMode, favoriteCharacters, nonHiddenCharacters]);

  if (!isOpen || !world) {
    return null;
  }

  const handleChooseSource = (mode: CharacterSourceMode) => {
    setSourceMode(mode);
    setStep('picker');
  };

  const spawnLocation =
    world.starter_locations.find((l) => l.id === world.default_location_id) ||
    world.starter_locations[0];

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
                  {step === 'decision'
                    ? 'Choose a Character'
                    : sourceMode === 'favorites'
                    ? 'Favorite Characters'
                    : 'Browse Characters'}
                </span>
                {step === 'picker' && (
                  <span className="text-xs font-normal text-zinc-400">
                    ({displayedCharacters.length})
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                <span className="font-medium text-indigo-300 truncate max-w-50">
                  {world.name}
                </span>
                {spawnLocation && (
                  <>
                    <span className="text-zinc-600">•</span>
                    <span className="flex items-center gap-1 text-zinc-400 truncate max-w-45">
                      <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
                      {spawnLocation.name}
                    </span>
                  </>
                )}
              </div>
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
              How would you like to choose your character for this Universe?
            </p>

            <div className="space-y-3">
              {/* Option 1: Browse Characters */}
              <button
                type="button"
                onClick={() => handleChooseSource('all')}
                className="w-full text-left p-4 rounded-xl bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 transition-all flex items-start gap-4 group cursor-pointer shadow-sm hover:shadow-indigo-500/10"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                      Browse Characters
                    </h3>
                    <span className="text-xs font-semibold text-zinc-500">
                      {nonHiddenCharacters.length} Available
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Choose from your full library of characters.
                  </p>
                </div>
              </button>

              {/* Option 2: Favorite Characters */}
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
                      Favorite Characters
                    </h3>
                    <span className="text-xs font-semibold text-zinc-500">
                      {favoriteCharacters.length} Starred
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Choose from characters you have marked as favorites.
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DEDICATED CHARACTER SELECTION LIST */}
        {step === 'picker' && (
          <div className="p-5 overflow-y-auto space-y-3">
            {displayedCharacters.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <Star className="w-8 h-8 text-zinc-600 mx-auto" />
                <p className="text-xs font-semibold text-zinc-300">
                  No favorite characters found
                </p>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                  You haven't added any characters to your favorites yet.
                </p>
                <button
                  type="button"
                  onClick={() => setSourceMode('all')}
                  className="mt-2 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                >
                  Browse All Characters Instead
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {displayedCharacters.map((character) => (
                  <div
                    key={character.id}
                    className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-indigo-500/40 transition-all flex items-center justify-between gap-3 group"
                  >
                    {/* Character Card Profile */}
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={character.avatar_url}
                        alt={character.name}
                        className="w-11 h-11 rounded-xl object-cover ring-1 ring-white/10 shrink-0 bg-zinc-800"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-white truncate">
                            {character.name}
                          </h4>
                          {character.is_favorite && (
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                          {character.tagline || character.description || 'AI Companion'}
                        </p>
                      </div>
                    </div>

                    {/* Genesis Trigger Button */}
                    <button
                      type="button"
                      onClick={() => onSelectCharacterAndLaunch(character, world)}
                      className="shrink-0 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                      <span>Start Universe ➔</span>
                    </button>
                  </div>
                ))}
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
