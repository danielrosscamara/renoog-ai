import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  Star,
  MapPin,
  Sparkles,
  Plus,
  Globe,
  Compass,
} from 'lucide-react';
import { WORLD_PRESETS } from '../../data/worldPresets';
import type { WorldPreset } from '../../data/worldPresets';

export interface WorldGalleryProps {
  onBack: () => void;
  onSelectWorld: (world: WorldPreset) => void;
  onCreateWorld?: () => void;
}

const FAVORITES_STORAGE_KEY = 'renoog_favorite_worlds';

export const WorldGallery: React.FC<WorldGalleryProps> = ({
  onBack,
  onSelectWorld,
  onCreateWorld,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return stored ? (JSON.parse(stored) as string[]) : [];
    } catch {
      return [];
    }
  });

  // Sync favorites back to localStorage whenever modified
  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds));
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }, [favoriteIds]);

  const toggleFavorite = (worldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteIds((prev) =>
      prev.includes(worldId) ? prev.filter((id) => id !== worldId) : [...prev, worldId]
    );
  };

  // Derive distinct genres present in presets
  const availableGenres = useMemo(() => {
    const genres = new Set<string>();
    WORLD_PRESETS.forEach((w) => genres.add(w.genre));
    return Array.from(genres);
  }, []);

  // Filtered worlds list
  const filteredWorlds = useMemo(() => {
    return WORLD_PRESETS.filter((world) => {
      // Favorite filter
      if (showOnlyFavorites && !favoriteIds.includes(world.id)) {
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
  }, [searchQuery, selectedGenre, showOnlyFavorites, favoriteIds]);

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
      </header>

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
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              selectedGenre === 'all' && !showOnlyFavorites
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            All Worlds ({WORLD_PRESETS.length})
          </button>

          {/* Favorites Filter */}
          <button
            type="button"
            onClick={() => setShowOnlyFavorites((prev) => !prev)}
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
            <span>Favorites ({favoriteIds.length})</span>
          </button>

          <div className="h-4 w-px bg-zinc-800 mx-1 hidden sm:block" />

          {/* Genre Filters */}
          {availableGenres.map((genre) => {
            const isActive = selectedGenre === genre && !showOnlyFavorites;
            return (
              <button
                key={genre}
                type="button"
                onClick={() => {
                  setSelectedGenre(genre);
                  setShowOnlyFavorites(false);
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
            <p className="text-sm font-semibold text-zinc-300">No world lorebooks match your criteria</p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Try adjusting your search terms or clear your active genre and favorite filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedGenre('all');
                setShowOnlyFavorites(false);
              }}
              className="mt-2 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorlds.map((world) => {
              const isFav = favoriteIds.includes(world.id);
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

                    {/* Genre Badge */}
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black/70 backdrop-blur-md text-indigo-300 border border-indigo-500/30">
                      {world.genre}
                    </span>

                    {/* Favorite Button */}
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(world.id, e)}
                      aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                      className={`absolute top-3 right-3 p-2 rounded-xl backdrop-blur-md border transition-all cursor-pointer ${
                        isFav
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                          : 'bg-black/60 border-white/10 text-zinc-400 hover:text-white hover:border-white/30'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400' : ''}`} />
                    </button>

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
