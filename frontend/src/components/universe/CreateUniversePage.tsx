import React, { useState } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Plus,
  X,
  MapPin,
  CheckCircle2,
  Circle,
  Layers,
  Users,
  Compass,
} from 'lucide-react';
import type { Character } from '../../types';
import { DEFAULT_WORLD_PRESET } from '../../data/worldPresets';
import { useChatStore } from '../../stores/useChatStore';
import { useUniverseStore } from '../../stores/useUniverseStore';
import { useWorldStore } from '../../stores/useWorldStore';
import { ChooseCharacterSourceModal } from '../worlds/ChooseCharacterSourceModal';
import { ChooseWorldSourceModal } from '../worlds/ChooseWorldSourceModal';

export interface CreateUniversePageProps {
  onBack: () => void;
  onLaunch: () => void;
  initialCharacters?: Character[];
  initialWorldId?: string;
}

export const CreateUniversePage: React.FC<CreateUniversePageProps> = ({
  onBack,
  onLaunch,
  initialCharacters,
  initialWorldId,
}) => {
  const characters = useChatStore((state) => state.characters);
  const worlds = useWorldStore((state) => state.worlds);
  const createUniverseFromPairing = useUniverseStore(
    (state) => state.createUniverseFromPairing
  );

  // Initial selection: initialCharacters prop or first non-hidden character
  const [selectedCharacters, setSelectedCharacters] = useState<Character[]>(() => {
    if (initialCharacters && initialCharacters.length > 0) {
      return initialCharacters;
    }
    const first = characters.find((c) => !c.is_hidden);
    return first ? [first] : [];
  });

  const [selectedWorldId, setSelectedWorldId] = useState<string>(() => {
    if (initialWorldId) {
      return initialWorldId;
    }
    return DEFAULT_WORLD_PRESET.id;
  });

  const [titleOverride, setTitleOverride] = useState<string | null>(null);

  // Synchronous render-phase adjustment if initial props change (React standard pattern)
  const [prevInitialChars, setPrevInitialChars] = useState(initialCharacters);
  const [prevInitialWorldId, setPrevInitialWorldId] = useState(initialWorldId);

  if (initialCharacters !== prevInitialChars) {
    setPrevInitialChars(initialCharacters);
    if (initialCharacters && initialCharacters.length > 0) {
      setSelectedCharacters(initialCharacters);
      setTitleOverride(null);
    }
  }

  if (initialWorldId !== prevInitialWorldId) {
    setPrevInitialWorldId(initialWorldId);
    if (initialWorldId) {
      setSelectedWorldId(initialWorldId);
      setTitleOverride(null);
    }
  }

  // Modals state for adding characters & choosing worlds via Flowchart diamond
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false);
  const [isWorldModalOpen, setIsWorldModalOpen] = useState(false);

  // Selected world object (checks useWorldStore first for custom worlds, fallback to default)
  const selectedWorld =
    worlds.find((w) => w.id === selectedWorldId) ?? worlds[0] ?? DEFAULT_WORLD_PRESET;

  // Auto-calculated default universe title
  const deriveDefaultTitle = () => {
    if (selectedCharacters.length === 0) {
      return `New Universe in ${selectedWorld.name}`;
    }
    if (selectedCharacters.length === 1) {
      return `${selectedCharacters[0].name} in ${selectedWorld.name}`;
    }
    if (selectedCharacters.length === 2) {
      return `${selectedCharacters[0].name} & ${selectedCharacters[1].name} in ${selectedWorld.name}`;
    }
    return `${selectedCharacters[0].name}, ${selectedCharacters[1].name} & ${
      selectedCharacters.length - 2
    } more in ${selectedWorld.name}`;
  };

  const defaultTitle = deriveDefaultTitle();
  const displayTitle = titleOverride !== null ? titleOverride : defaultTitle;

  const handleAddCharacter = (charToAdd: Character) => {
    if (!selectedCharacters.some((c) => c.id === charToAdd.id)) {
      setSelectedCharacters((prev) => [...prev, charToAdd]);
      setTitleOverride(null);
    }
  };

  const handleRemoveCharacter = (charIdToRemove: string) => {
    setSelectedCharacters((prev) => prev.filter((c) => c.id !== charIdToRemove));
    setTitleOverride(null);
  };

  const handleStartUniverse = () => {
    if (selectedCharacters.length === 0) return;
    createUniverseFromPairing(
      selectedCharacters,
      selectedWorld,
      displayTitle.trim() || defaultTitle
    );
    onLaunch();
  };

  const spawnLocation =
    selectedWorld.starter_locations.find(
      (loc) => loc.id === selectedWorld.default_location_id
    ) || selectedWorld.starter_locations[0];

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-zinc-950 text-zinc-100">
      {/* TOP APP BAR */}
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-medium transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Hub</span>
          </button>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Create Universe</span>
            </h1>
            <p className="text-xs text-zinc-400">Choose characters & world</p>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT WORKSPACE */}
      <div className="max-w-6xl w-full mx-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: CHARACTERS & WORLD SELECTION */}
        <div className="lg:col-span-2 space-y-8">
          {/* SECTION 1: CHARACTERS ADDED */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Characters in Party ({selectedCharacters.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCharacterModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors cursor-pointer shadow-sm hover:shadow-indigo-500/10"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Character</span>
              </button>
            </div>

            {/* SELECTED CHARACTERS LIST */}
            <div className="space-y-2.5">
              {selectedCharacters.length === 0 ? (
                <div className="p-6 rounded-2xl bg-zinc-900/30 border border-dashed border-zinc-800 text-center space-y-2">
                  <p className="text-xs text-zinc-400">
                    No characters in your party yet. Click{' '}
                    <strong className="text-indigo-400">+ Add Character</strong>{' '}
                    above to choose your companions.
                  </p>
                </div>
              ) : (
                selectedCharacters.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex items-center gap-4 group hover:border-zinc-700 transition-colors"
                  >
                    <img
                      src={c.avatar_url}
                      alt={c.name}
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-indigo-500/30 shrink-0 bg-zinc-800"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white truncate">
                          {c.name}
                        </h3>
                        {c.tags[0] && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            {c.tags[0]}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 truncate mt-0.5">
                        {c.tagline}
                      </p>
                    </div>

                    {/* Remove Action Button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveCharacter(c.id)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      aria-label={`Remove ${c.name}`}
                      title="Remove character"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* SECTION 2: CHOOSE A WORLD */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  World Lorebook Setting ({worlds.length} Available)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsWorldModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-indigo-400" />
                <span>Browse / Favorites</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {worlds.map((world) => {
                const isSelected = world.id === selectedWorldId;
                return (
                  <div
                    key={world.id}
                    onClick={() => {
                      setSelectedWorldId(world.id);
                      setTitleOverride(null);
                    }}
                    className={`group relative rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-900 border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg shadow-indigo-500/5'
                        : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/70'
                    }`}
                  >
                    {/* Widescreen Banner */}
                    <div className="relative h-24 w-full overflow-hidden bg-zinc-900">
                      <img
                        src={world.banner_url}
                        alt={world.name}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-zinc-900 via-zinc-900/60 to-transparent" />

                      {/* Genre Tag */}
                      <span className="absolute top-2.5 left-3 px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/60 backdrop-blur-md text-zinc-300 border border-white/10">
                        {world.genre}
                      </span>

                      {/* Selection Radio Indicator */}
                      <div className="absolute top-2.5 right-3">
                        {isSelected ? (
                          <CheckCircle2 className="w-5 h-5 text-indigo-400 fill-indigo-500/20" />
                        ) : (
                          <Circle className="w-5 h-5 text-zinc-500 group-hover:text-zinc-400" />
                        )}
                      </div>
                    </div>

                    {/* World Body Content */}
                    <div className="p-4 -mt-2 relative z-10 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                          {world.name}
                        </h3>
                        {world.is_custom && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            Custom
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {world.tagline}
                      </p>

                      {/* Spatial Rooms Preview */}
                      <div className="pt-2 border-t border-zinc-800/60 flex flex-wrap gap-1.5">
                        {world.starter_locations.map((loc) => {
                          const isSpawn = loc.id === world.default_location_id;
                          return (
                            <span
                              key={loc.id}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-medium flex items-center gap-1 ${
                                isSpawn
                                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                                  : 'bg-zinc-800/80 text-zinc-400 border border-zinc-700/40'
                              }`}
                            >
                              <MapPin className="w-2.5 h-2.5" />
                              <span className="truncate max-w-28">{loc.name}</span>
                              {isSpawn && (
                                <span className="text-[9px] text-indigo-400">
                                  (Spawn)
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: UNIVERSE DETAILS & LAUNCHPAD (STICKY) */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-5 p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 shadow-xl backdrop-blur-sm">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Universe Details
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Customize your universe settings before starting.
              </p>
            </div>

            {/* UNIVERSE NAME INPUT */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-300 block">
                Universe Name
              </label>
              <input
                type="text"
                value={displayTitle}
                onChange={(e) => setTitleOverride(e.target.value)}
                placeholder="Enter universe name..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-indigo-500 text-xs text-white outline-none transition-colors"
              />
            </div>

            {/* ROSTER SUMMARY */}
            <div className="space-y-2 pt-3 border-t border-zinc-800/60">
              <span className="text-[11px] font-semibold text-zinc-300 block">
                Who is in this universe:
              </span>
              <ul className="space-y-1.5 text-xs text-zinc-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  <span>
                    <strong className="text-zinc-200">Narrator</strong> (Story Guide)
                  </span>
                </li>
                {selectedCharacters.map((c) => (
                  <li key={c.id} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-zinc-200 font-medium">{c.name}</span>
                  </li>
                ))}
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>
                    <strong className="text-zinc-200">You</strong> (Player)
                  </span>
                </li>
              </ul>
            </div>

            {/* STARTING ROOM PREVIEW */}
            <div className="space-y-1 pt-3 border-t border-zinc-800/60 text-xs">
              <span className="text-[11px] font-semibold text-zinc-300 block">
                Starting Room:
              </span>
              <div className="flex items-center gap-2 text-zinc-300">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-semibold truncate">{spawnLocation?.name}</span>
                <span className="text-[10px] text-zinc-500 truncate">
                  in {selectedWorld.name}
                </span>
              </div>
            </div>

            {/* LAUNCH BUTTON */}
            <div className="pt-4 border-t border-zinc-800/60">
              <button
                type="button"
                disabled={selectedCharacters.length === 0}
                onClick={handleStartUniverse}
                className="w-full py-3.5 px-5 rounded-xl bg-linear-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4 text-indigo-200" />
                <span>Start Universe ➔</span>
              </button>
              <p className="text-[10px] text-zinc-500 text-center mt-2">
                Spawns {selectedWorld.starter_locations.length} rooms and begins scene prose.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ADD CHARACTER MODAL (Flowchart Diamond: Browse Characters vs Favorites) */}
      <ChooseCharacterSourceModal
        world={selectedWorld}
        isOpen={isCharacterModalOpen}
        onClose={() => setIsCharacterModalOpen(false)}
        onSelectCharacter={(char) => {
          handleAddCharacter(char);
        }}
        excludeCharacterIds={selectedCharacters.map((c) => c.id)}
        title="Add Character to Party"
      />

      {/* CHOOSE WORLD MODAL (Flowchart Diamond: Browse Worlds vs Favorites) */}
      <ChooseWorldSourceModal
        isOpen={isWorldModalOpen}
        onClose={() => setIsWorldModalOpen(false)}
        onSelectWorld={(world) => {
          setSelectedWorldId(world.id);
          setTitleOverride(null);
        }}
      />
    </div>
  );
};
