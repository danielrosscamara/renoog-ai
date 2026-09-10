import React, { useState, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Search,
  Star,
  MapPin,
  Sparkles,
  Plus,
  Globe,
  Compass,
  Upload,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useWorldStore } from '../../stores/useWorldStore';
import type { WorldPresetWithMeta } from '../../stores/useWorldStore';

export interface WorldGalleryProps {
  onBack: () => void;
  onSelectWorld: (world: WorldPresetWithMeta) => void;
  onCreateWorld?: () => void;
  onEditWorld?: (world: WorldPresetWithMeta) => void;
}

export const WorldGallery: React.FC<WorldGalleryProps> = ({
  onBack,
  onSelectWorld,
  onCreateWorld,
  onEditWorld,
}) => {
  const worlds = useWorldStore((s) => s.worlds);
  const favoriteWorldIds = useWorldStore((s) => s.favoriteWorldIds);
  const toggleFavoriteWorld = useWorldStore((s) => s.toggleFavoriteWorld);
  const deleteCustomWorld = useWorldStore((s) => s.deleteCustomWorld);
  const importWorldJson = useWorldStore((s) => s.importWorldJson);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [showOnlyCustom, setShowOnlyCustom] = useState(false);
  const [importNotification, setImportNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Derive distinct genres present in worlds list
  const availableGenres = useMemo(() => {
    const genres = new Set<string>();
    worlds.forEach((w) => genres.add(w.genre));
    return Array.from(genres);
  }, [worlds]);

  const customWorldsCount = useMemo(() => {
    return worlds.filter((w) => w.is_custom === true).length;
  }, [worlds]);

  // Handle JSON World Pack Import
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const imported = importWorldJson(text);
        setImportNotification({
          type: 'success',
          message: `Successfully imported "${imported.name}" into your custom realms!`,
        });
        setTimeout(() => setImportNotification(null), 5000);
      } catch (err) {
        setImportNotification({
          type: 'error',
          message:
            err instanceof Error ? err.message : 'Failed to import world specification file.',
        });
        setTimeout(() => setImportNotification(null), 6000);
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  // Filtered worlds list
  const filteredWorlds = useMemo(() => {
    return worlds.filter((world) => {
      // Favorite filter
      if (showOnlyFavorites && !favoriteWorldIds.includes(world.id)) {
        return false;
      }

      // Custom filter
      if (showOnlyCustom && !world.is_custom) {
        return false;
      }

      // Genre filter
      if (selectedGenre !== 'all' && world.genre !== selectedGenre) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = world.name.toLowerCase().includes(q);
        const matchesTagline = world.tagline.toLowerCase().includes(q);
        const matchesDesc = world.description.toLowerCase().includes(q);
        const matchesTags = world.tags.some((t) => t.toLowerCase().includes(q));
        const matchesLocations = world.starter_locations.some((loc) =>
          loc.name.toLowerCase().includes(q)
        );

        if (!matchesName && !matchesTagline && !matchesDesc && !matchesTags && !matchesLocations) {
          return false;
        }
      }

      return true;
    });
  }, [worlds, searchQuery, selectedGenre, showOnlyFavorites, showOnlyCustom, favoriteWorldIds]);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-zinc-950 text-zinc-100">
      {/* TOP APP HEADER */}
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
              <Globe className="w-4 h-4 text-indigo-400" />
              <span>Worlds & Lorebooks</span>
            </h1>
            <p className="text-xs text-zinc-400">
              Browse atmospheric realms, physical rooms, and lore for your Universes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Import JSON World File Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
            title="Import custom world JSON specification"
          >
            <Upload className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Import JSON</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileImport}
            className="hidden"
          />

          {/* Create World Button */}
          {onCreateWorld && (
            <button
              type="button"
              onClick={onCreateWorld}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create World</span>
            </button>
          )}
        </div>
      </header>

      {/* Import Notification Banner */}
      {importNotification && (
        <div
          className={`px-6 py-2.5 border-b text-xs flex items-center justify-between ${
            importNotification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {importNotification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{importNotification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setImportNotification(null)}
            className="text-xs hover:underline opacity-80 hover:opacity-100 ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* FILTER & SEARCH STRIP */}
      <div className="max-w-7xl w-full mx-auto px-6 pt-6 pb-2 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search worlds by name, lore, physical rooms, or tags..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* All Worlds */}
          <button
            type="button"
            onClick={() => {
              setSelectedGenre('all');
              setShowOnlyFavorites(false);
              setShowOnlyCustom(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              selectedGenre === 'all' && !showOnlyFavorites && !showOnlyCustom
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            All Worlds ({worlds.length})
          </button>

          {/* Favorites Filter */}
          <button
            type="button"
            onClick={() => {
              setShowOnlyFavorites((prev) => !prev);
              setShowOnlyCustom(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              showOnlyFavorites
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm border'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <Star
              className={`w-3.5 h-3.5 ${
                showOnlyFavorites ? 'fill-amber-400 text-amber-400' : ''
              }`}
            />
            <span>Favorites ({favoriteWorldIds.length})</span>
          </button>

          {/* Custom Worlds Filter */}
          {customWorldsCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setShowOnlyCustom((prev) => !prev);
                setShowOnlyFavorites(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                showOnlyCustom
                  ? 'bg-violet-600/20 border-violet-500/40 text-violet-300 shadow-sm border'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span>Custom Realms ({customWorldsCount})</span>
            </button>
          )}

          <div className="h-4 w-px bg-zinc-800 mx-1 hidden sm:block" />

          {/* Genre Filters */}
          {availableGenres.map((genre) => {
            const isActive =
              selectedGenre === genre && !showOnlyFavorites && !showOnlyCustom;
            return (
              <button
                key={genre}
                type="button"
                onClick={() => {
                  setSelectedGenre(genre);
                  setShowOnlyFavorites(false);
                  setShowOnlyCustom(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-zinc-700 text-white shadow-sm'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                {genre}
              </button>
            );
          })}
        </div>
      </div>

      {/* WORLDS GRID */}
      <main className="max-w-7xl w-full mx-auto p-6">
        {filteredWorlds.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Compass className="w-10 h-10 text-zinc-600 mx-auto" />
            <p className="text-sm font-semibold text-zinc-300">
              No world lorebooks match your criteria
            </p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Try adjusting your search terms or clear your active genre and favorite filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedGenre('all');
                setShowOnlyFavorites(false);
                setShowOnlyCustom(false);
              }}
              className="mt-2 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorlds.map((world) => {
              const isFav = favoriteWorldIds.includes(world.id);
              return (
                <div
                  key={world.id}
                  onClick={() => onSelectWorld(world)}
                  className="group relative flex flex-col rounded-2xl bg-zinc-900/90 border border-zinc-800/80 hover:border-indigo-500/40 transition-all duration-300 overflow-hidden shadow-lg hover:shadow-indigo-500/10 cursor-pointer"
                >
                  {/* COVER BANNER WITH GRADIENT OVERLAY */}
                  <div className="relative h-48 w-full overflow-hidden bg-zinc-900">
                    <img
                      src={world.banner_url}
                      alt={world.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-zinc-900 via-zinc-900/40 to-transparent" />

                    {/* Genre Badge & Custom Badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black/70 backdrop-blur-md text-indigo-300 border border-indigo-500/30">
                        {world.genre}
                      </span>
                      {world.is_custom && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider bg-violet-600/80 backdrop-blur-md text-white border border-violet-400/40 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Custom</span>
                        </span>
                      )}
                    </div>

                    {/* Top Right Controls: Edit, Delete (if custom), Favorite */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      {world.is_custom && onEditWorld && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditWorld(world);
                          }}
                          aria-label="Edit custom world"
                          className="p-2 rounded-xl backdrop-blur-md border bg-black/60 border-white/10 text-zinc-300 hover:text-white hover:border-violet-400 transition-all cursor-pointer"
                          title="Edit in World Studio"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {world.is_custom && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              window.confirm(
                                `Are you sure you want to delete "${world.name}"? This cannot be undone.`
                              )
                            ) {
                              deleteCustomWorld(world.id);
                            }
                          }}
                          aria-label="Delete custom world"
                          className="p-2 rounded-xl backdrop-blur-md border bg-black/60 border-white/10 text-zinc-400 hover:text-rose-400 hover:border-rose-400 transition-all cursor-pointer"
                          title="Delete realm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Favorite Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavoriteWorld(world.id);
                        }}
                        aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                        className={`p-2 rounded-xl backdrop-blur-md border transition-all cursor-pointer ${
                          isFav
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            : 'bg-black/60 border-white/10 text-zinc-400 hover:text-white hover:border-white/30'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400' : ''}`} />
                      </button>
                    </div>

                    {/* Room Counter Overlay */}
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 text-[11px] font-medium text-zinc-300 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                      <MapPin className="w-3 h-3 text-indigo-400" />
                      <span>{world.starter_locations.length} Physical Locations</span>
                    </div>
                  </div>

                  {/* WORLD METADATA & SYNOPSIS */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors leading-snug">
                        {world.name}
                      </h3>
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {world.tagline}
                      </p>

                      {/* Physical Locations Pill Previews */}
                      <div className="pt-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                          Locations / Spatial Rooms:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {world.starter_locations.map((loc) => (
                            <span
                              key={loc.id}
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800/80 text-zinc-300 border border-zinc-700/50"
                            >
                              {loc.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Tags */}
                      {world.tags && world.tags.length > 0 && (
                        <div className="pt-2 flex flex-wrap gap-1">
                          {world.tags.slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] text-zinc-400 font-medium"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      onClick={() => onSelectWorld(world)}
                      className="w-full mt-2 py-2.5 px-4 rounded-xl bg-zinc-800/80 group-hover:bg-indigo-600 text-zinc-200 group-hover:text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 border border-zinc-700/50 group-hover:border-indigo-500 shadow-sm cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-200 transition-colors" />
                      <span>Inspect World Lore & Locations ➔</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

