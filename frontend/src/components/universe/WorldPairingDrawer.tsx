import React, { useEffect, useState } from 'react';
import {
  X,
  Sparkles,
  MapPin,
  CheckCircle2,
  Circle,
  Layers,
  Plus,
  Search,
} from 'lucide-react';
import type { Character } from '../../types';
import {
  WORLD_PRESETS,
  type WorldPreset,
  DEFAULT_WORLD_PRESET,
} from '../../data/worldPresets';
import { useChatStore } from '../../stores/useChatStore';

export interface WorldPairingDrawerProps {
  character: Character | null;
  isOpen: boolean;
  onClose: () => void;
  onPairAndLaunch: (
    primaryCharacter: Character,
    world: WorldPreset,
    title: string,
    allCharacters?: Character[]
  ) => void;
}

export const WorldPairingDrawer: React.FC<WorldPairingDrawerProps> = ({
  character,
  isOpen,
  onClose,
  onPairAndLaunch,
}) => {
  const characters = useChatStore((state) => state.characters);
  const [selectedWorldId, setSelectedWorldId] = useState<string>(DEFAULT_WORLD_PRESET.id);
  const [titleOverride, setTitleOverride] = useState<string | null>(null);
  const [prevCharId, setPrevCharId] = useState<string | null>(null);

  // Multi-character selection state
  const [selectedCharacters, setSelectedCharacters] = useState<Character[]>(
    character ? [character] : []
  );
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  // Sync state during render when incoming character prop changes (per React recommended pattern)
  if (character && character.id !== prevCharId) {
    setPrevCharId(character.id);
    setSelectedCharacters([character]);
    setTitleOverride(null);
    setIsPickerOpen(false);
    setPickerSearch('');
  } else if (!character && prevCharId !== null) {
    setPrevCharId(null);
    setSelectedCharacters([]);
    setTitleOverride(null);
    setIsPickerOpen(false);
    setPickerSearch('');
  }

  // Derive active world
  const selectedWorld =
    WORLD_PRESETS.find((w) => w.id === selectedWorldId) ?? DEFAULT_WORLD_PRESET;

  // Derive default universe title based on all selected companions
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
    return `${selectedCharacters[0].name}, ${selectedCharacters[1].name} & ${selectedCharacters.length - 2} more in ${selectedWorld.name}`;
  };

  const defaultTitle = deriveDefaultTitle();
  const displayTitle = titleOverride !== null ? titleOverride : defaultTitle;

  // Filter available characters for the "+ Add Character" dropdown
  const availableToAdd = characters.filter((c) => {
    if (c.is_hidden) return false;
    if (selectedCharacters.some((sc) => sc.id === c.id)) return false;
    if (!pickerSearch.trim()) return true;
    const q = pickerSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.tagline.toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const handleAddCharacter = (charToAdd: Character) => {
    setSelectedCharacters((prev) => [...prev, charToAdd]);
    setTitleOverride(null); // Recalculate title dynamically
  };

  const handleRemoveCharacter = (charIdToRemove: string) => {
    setSelectedCharacters((prev) => prev.filter((c) => c.id !== charIdToRemove));
    setTitleOverride(null); // Recalculate title dynamically
  };

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

  if (!isOpen) {
    return null;
  }

  const handleLaunchClick = () => {
    if (selectedCharacters.length === 0) return;
    const primary = selectedCharacters[0];
    onPairAndLaunch(
      primary,
      selectedWorld,
      displayTitle.trim() || defaultTitle,
      selectedCharacters
    );
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
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Create Universe
              </h2>
              <p className="text-xs text-zinc-400">
                Choose your characters and world setting.
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
          {/* CHARACTERS ADDED SECTION */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                CHARACTERS ADDED ({selectedCharacters.length})
              </label>
              <button
                type="button"
                onClick={() => setIsPickerOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Character</span>
              </button>
            </div>

            {/* CHARACTER PICKER DROPDOWN */}
            {isPickerOpen && (
              <div className="mb-3 p-3 rounded-2xl bg-[#181822] border border-indigo-500/30 shadow-xl space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Select a Companion to Add</span>
                  <button
                    type="button"
                    onClick={() => setIsPickerOpen(false)}
                    className="text-zinc-400 hover:text-white p-1 cursor-pointer"
                    aria-label="Close picker"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder="Search available companions..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#121218] border border-white/10 text-xs text-white placeholder-zinc-500 outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {availableToAdd.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-3">
                      {characters.length === 0
                        ? 'No companions found.'
                        : 'All available companions have been added.'}
                    </p>
                  ) : (
                    availableToAdd.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => handleAddCharacter(c)}
                        className="p-2 rounded-xl bg-[#14141c] hover:bg-[#1f1f2e] border border-white/5 hover:border-indigo-500/30 flex items-center justify-between gap-2.5 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={c.avatar_url}
                            alt={c.name}
                            className="w-8 h-8 rounded-lg object-cover ring-1 ring-white/10 shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{c.name}</h4>
                            <p className="text-[10px] text-zinc-400 truncate">{c.tagline}</p>
                          </div>
                        </div>
                        <span className="shrink-0 text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          + Add
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* SELECTED CHARACTERS CARDS */}
            <div className="space-y-2">
              {selectedCharacters.length === 0 ? (
                <div className="p-4 rounded-2xl bg-[#16161c] border border-dashed border-white/10 text-center">
                  <p className="text-xs text-zinc-400">
                    No companions added yet. Click <strong className="text-indigo-400">+ Add Character</strong> above.
                  </p>
                </div>
              ) : (
                selectedCharacters.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-2xl bg-[#16161c] border border-white/5 flex items-center gap-3.5 group hover:border-white/10 transition-colors"
                  >
                    <img
                      src={c.avatar_url}
                      alt={c.name}
                      className="w-11 h-11 rounded-xl object-cover ring-2 ring-indigo-500/30 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white truncate">{c.name}</h3>
                        {c.tags[0] && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            {c.tags[0]}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 truncate mt-0.5">{c.tagline}</p>
                    </div>

                    {selectedCharacters.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCharacter(c.id)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0 cursor-pointer"
                        title={`Remove ${c.name}`}
                        aria-label={`Remove ${c.name}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
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
              Initializes {selectedCharacters.length + 2} simulation members:{' '}
              <strong className="text-zinc-300">Narrator</strong>,{' '}
              {selectedCharacters.length > 0 && (
                <>
                  <strong className="text-zinc-300">
                    {selectedCharacters.map((c) => c.name).join(', ')}
                  </strong>
                  {', and '}
                </>
              )}
              <strong className="text-zinc-300">You</strong>.
            </p>
          </div>
        </div>

        {/* PINNED STICKY GENESIS LAUNCHPAD */}
        <div className="p-5 border-t border-[#202026] bg-[#111114]/95 backdrop-blur-md shrink-0">
          <button
            type="button"
            disabled={selectedCharacters.length === 0}
            onClick={handleLaunchClick}
            className="w-full py-3.5 px-5 rounded-xl bg-linear-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
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
