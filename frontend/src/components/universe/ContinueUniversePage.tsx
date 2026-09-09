import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Search,
  Trash2,
  MapPin,
  Clock,
  MessageSquare,
  Globe,
  AlertTriangle,
} from 'lucide-react';
import { useUniverseStore } from '../../stores/useUniverseStore';
import type { SavedUniverseRecord } from '../../stores/useUniverseStore';
import { WORLD_PRESETS } from '../../data/worldPresets';

export interface ContinueUniversePageProps {
  onBack: () => void;
  onResume: () => void;
  onCreateNew: () => void;
}

export const ContinueUniversePage: React.FC<ContinueUniversePageProps> = ({
  onBack,
  onResume,
  onCreateNew,
}) => {
  const savedUniverses = useUniverseStore((state) => state.savedUniverses) || [];
  const loadUniverse = useUniverseStore((state) => state.loadUniverse);
  const deleteUniverse = useUniverseStore((state) => state.deleteUniverse);

  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Friendly date helper (pure function without Date.now)
  const formatPlayedDate = (isoDate?: string): string => {
    if (!isoDate) return 'Recently';
    try {
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return 'Recently';
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  // Filter saved universes by title, world, or character names
  const filteredUniverses = savedUniverses.filter((record) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = record.universe.title.toLowerCase().includes(q);
    const worldMatch = (record.universe.world_id || '').toLowerCase().includes(q);
    const memberMatch = record.members.some((m) =>
      m.display_name.toLowerCase().includes(q)
    );
    return titleMatch || worldMatch || memberMatch;
  });

  const handleResume = (universeId: string) => {
    loadUniverse(universeId);
    onResume();
  };

  const handleDelete = (universeId: string) => {
    deleteUniverse(universeId);
    setDeleteConfirmId(null);
  };

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
              <Globe className="w-4 h-4 text-violet-400" />
              <span>Continue Universe</span>
            </h1>
            <p className="text-xs text-zinc-400">Resume a saved universe</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCreateNew}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Universe</span>
        </button>
      </header>

      {/* MAIN CONTENT CATALOG */}
      <div className="max-w-5xl w-full mx-auto p-6 md:p-8 space-y-6">
        {/* SEARCH BAR (Only if universes exist) */}
        {savedUniverses.length > 0 && (
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search universes by title, character, or world..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 focus:border-violet-500 text-xs text-white placeholder-zinc-500 outline-none transition-colors"
            />
          </div>
        )}

        {/* EMPTY STATE */}
        {savedUniverses.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shadow-xl shadow-violet-500/5">
              <Globe className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white">No universes yet</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                You haven&apos;t created any universes yet. Start a new universe to
                begin your story!
              </p>
            </div>
            <button
              type="button"
              onClick={onCreateNew}
              className="mt-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Universe ➔</span>
            </button>
          </div>
        ) : filteredUniverses.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-xs">
            No universes matching &quot;{searchQuery}&quot;.
          </div>
        ) : (
          /* SAVED UNIVERSES CARDS GRID */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredUniverses.map((record: SavedUniverseRecord) => {
              const universeId = record.universe.id;
              const isConfirmingDelete = deleteConfirmId === universeId;
              const matchingWorld = WORLD_PRESETS.find(
                (w) => w.id === record.universe.world_id
              );
              const bannerUrl =
                matchingWorld?.banner_url ||
                'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80';
              const genre = matchingWorld?.genre || 'Story';
              const companions = record.members.filter(
                (m) => m.entity_type === 'character'
              );
              const currentRoom =
                record.locations.find((l) => l.id === record.physicalLocationId) ||
                record.locations[0];

              return (
                <div
                  key={universeId}
                  className="group relative rounded-3xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all duration-200 overflow-hidden shadow-lg flex flex-col justify-between"
                >
                  {/* Widescreen Banner Image */}
                  <div className="relative h-28 w-full overflow-hidden bg-zinc-900">
                    <img
                      src={bannerUrl}
                      alt={record.universe.title}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-zinc-900 via-zinc-900/60 to-transparent" />

                    {/* Genre Tag */}
                    <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-black/60 backdrop-blur-md text-zinc-300 border border-white/10">
                      {genre}
                    </span>

                    {/* Relative Timestamp */}
                    <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-md text-[10px] font-medium bg-black/60 backdrop-blur-md text-zinc-300 border border-white/10 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      <span>{formatPlayedDate(record.lastActiveAt)}</span>
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 -mt-3 relative z-10 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-white group-hover:text-violet-300 transition-colors line-clamp-1">
                        {record.universe.title}
                      </h3>

                      {/* Location & Room Count */}
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">
                          Room: <strong className="text-zinc-200">{currentRoom?.name}</strong>{' '}
                          <span className="text-zinc-500">
                            ({record.locations.length} rooms)
                          </span>
                        </span>
                      </div>

                      {/* Companions in this universe */}
                      <div className="pt-2 border-t border-zinc-800/60 flex items-center gap-2.5">
                        <div className="flex -space-x-2 shrink-0">
                          {companions.slice(0, 3).map((comp) => (
                            <img
                              key={comp.id}
                              src={comp.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                              alt={comp.display_name}
                              className="w-7 h-7 rounded-full object-cover ring-2 ring-zinc-900"
                            />
                          ))}
                        </div>
                        <span className="text-xs text-zinc-300 truncate">
                          {companions.map((c) => c.display_name).join(', ')}
                        </span>
                      </div>

                      {/* Turn Count Metric */}
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                        <MessageSquare className="w-3 h-3" />
                        <span>{record.turnCount} messages</span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between gap-3">
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-2 w-full animate-in fade-in duration-150">
                          <span className="text-[11px] text-red-400 flex items-center gap-1 flex-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>Delete universe?</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDelete(universeId)}
                            className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Yes, Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(universeId)}
                            className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Delete universe"
                            aria-label="Delete universe"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleResume(universeId)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-md shadow-violet-600/20 cursor-pointer active:scale-[0.98]"
                          >
                            <span>Continue</span>
                            <span>➔</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
