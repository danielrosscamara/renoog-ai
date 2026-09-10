import React, { useEffect } from 'react';
import {
  X,
  Star,
  MapPin,
  Sparkles,
  Compass,
  BookOpen,
  Tag,
} from 'lucide-react';
import type { WorldPreset } from '../../data/worldPresets';

export interface WorldDetailModalProps {
  world: WorldPreset | null;
  isOpen: boolean;
  onClose: () => void;
  onStartRoleplay: (world: WorldPreset) => void;
  onToggleFavorite?: (worldId: string) => void;
  isFavorite?: boolean;
}

export const WorldDetailModal: React.FC<WorldDetailModalProps> = ({
  world,
  isOpen,
  onClose,
  onStartRoleplay,
  onToggleFavorite,
  isFavorite = false,
}) => {
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

  if (!isOpen || !world) {
    return null;
  }

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(world.id);
  };

  const handleStartClick = () => {
    onStartRoleplay(world);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="world-detail-title"
    >
      {/* Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity cursor-pointer animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-2xl bg-[#111115] border border-zinc-800 rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* HERO PANORAMIC BANNER */}
        <div className="relative h-56 sm:h-64 w-full shrink-0 overflow-hidden bg-zinc-900">
          <img
            src={world.banner_url}
            alt={world.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-[#111115] via-[#111115]/50 to-transparent" />

          {/* Top Bar Controls */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-black/70 backdrop-blur-md text-indigo-300 border border-indigo-500/30">
              {world.genre} Realm
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFavoriteClick}
                aria-label={isFavorite ? 'Remove from favorites' : 'Save as favorite'}
                className={`p-2 rounded-xl backdrop-blur-md border transition-all cursor-pointer ${
                  isFavorite
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-black/60 border-white/10 text-zinc-400 hover:text-white hover:border-white/30'
                }`}
              >
                <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400' : ''}`} />
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close World Dossier"
                className="p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-zinc-400 hover:text-white hover:border-white/30 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* World Title & Tagline Overlay */}
          <div className="absolute bottom-4 left-6 right-6 z-10 space-y-1">
            <h2
              id="world-detail-title"
              className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight drop-shadow-md"
            >
              {world.name}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 line-clamp-2 drop-shadow">
              {world.tagline}
            </p>
          </div>
        </div>

        {/* SCROLLABLE DOSSIER BODY */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* 1. WORLD LORE & ATMOSPHERE */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
              <BookOpen className="w-3.5 h-3.5" />
              <span>World Lore & Atmospheric Setting</span>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs sm:text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {world.description}
            </div>
          </section>

          {/* 2. STARTER SPATIAL ROOMS (MESSENGER GROUPS) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                <span>Physical Locations ({world.starter_locations.length} Spatial Rooms)</span>
              </div>
              <span className="text-[11px] text-zinc-500">
                Messenger-style groups you can travel between
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {world.starter_locations.map((loc) => {
                const isSpawn = loc.id === world.default_location_id;
                return (
                  <div
                    key={loc.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isSpawn
                        ? 'bg-indigo-950/20 border-indigo-500/30 ring-1 ring-indigo-500/20'
                        : 'bg-zinc-900/40 border-zinc-800/70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        <Compass className={`w-3.5 h-3.5 ${isSpawn ? 'text-indigo-400' : 'text-zinc-500'}`} />
                        <span>{loc.name}</span>
                      </h4>
                      {isSpawn && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Initial Spawn
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {loc.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 3. TAGS & THEMES */}
          {world.tags && world.tags.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                <Tag className="w-3.5 h-3.5 text-zinc-500" />
                <span>Atmospheric Tags</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {world.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-900 text-zinc-300 border border-zinc-800"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* STICKY BOTTOM LAUNCHPAD */}
        <div className="p-4 sm:p-5 border-t border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left">
            <span className="text-xs font-bold text-zinc-300 block">
              Ready to roleplay in {world.name}?
            </span>
            <span className="text-[11px] text-zinc-500">
              Next: choose your companions from your library
            </span>
          </div>

          <button
            type="button"
            onClick={handleStartClick}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-linear-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            <span>Start Roleplay in this World ➔</span>
          </button>
        </div>
      </div>
    </div>
  );
};
