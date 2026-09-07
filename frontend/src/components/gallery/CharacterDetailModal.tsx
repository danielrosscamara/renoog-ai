import React, { useEffect, useState } from 'react';
import {
  X,
  Star,
  Edit3,
  Download,
  Sparkles,
  Compass,
  Tag,
  BookOpen,
  User,
  Quote,
} from 'lucide-react';
import type { Character } from '../../types';

export interface CharacterDetailModalProps {
  character: Character | null;
  isOpen: boolean;
  onClose: () => void;
  onStartRoleplay: (character: Character) => void;
  onEditInStudio: (character: Character) => void;
  onToggleFavorite?: (characterId: string) => void;
  onExportPng?: (characterId: string) => void;
}

export const CharacterDetailModal: React.FC<CharacterDetailModalProps> = ({
  character,
  isOpen,
  onClose,
  onStartRoleplay,
  onEditInStudio,
  onToggleFavorite,
  onExportPng,
}) => {
  const [favoriteOverride, setFavoriteOverride] = useState<boolean | null>(null);
  const [prevCharId, setPrevCharId] = useState<string | null>(null);

  // Reset override when character prop changes using render-time derivation
  if (character && character.id !== prevCharId) {
    setPrevCharId(character.id);
    setFavoriteOverride(null);
  }

  const isFavorited = favoriteOverride !== null ? favoriteOverride : Boolean(character?.is_favorite);

  // Handle escape key and body scroll locking
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

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteOverride(!isFavorited);
    onToggleFavorite?.(character.id);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
    onEditInStudio(character);
  };

  const handleExportClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onExportPng?.(character.id);
  };

  const bannerImage = character.wallpaper_url || character.avatar_url;

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden" role="dialog" aria-modal="true">
      {/* Dimmed Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity cursor-pointer animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-Over Holo-Drawer Container */}
      <aside className="relative w-full max-w-xl bg-[#121215] border-l border-[#222228] h-full shadow-2xl flex flex-col z-10 overflow-hidden animate-in slide-in-from-right duration-300">
        {/* TOP HERO BANNER */}
        <div className="relative aspect-video w-full overflow-hidden bg-zinc-900 shrink-0">
          <img
            src={bannerImage}
            alt={character.name}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-linear-to-t from-[#121215] via-[#121215]/50 to-transparent" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Character Drawer"
            className="absolute top-4 right-4 p-2 rounded-xl bg-black/60 backdrop-blur-md text-zinc-300 hover:text-white border border-white/10 hover:border-white/20 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* OVERLAPPING AVATAR & IDENTITY CLUSTER */}
        <div className="px-6 -mt-12 relative z-10 flex items-end justify-between shrink-0">
          <div className="flex items-end gap-4">
            <img
              src={character.avatar_url}
              alt={character.name}
              className="w-20 h-20 rounded-2xl ring-4 ring-[#121215] object-cover shadow-2xl border border-white/10 bg-zinc-800 shrink-0"
            />
            <div className="pb-1">
              <h2 className="text-xl font-bold text-white tracking-tight leading-tight">
                {character.name}
              </h2>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-zinc-500" />
                  by {character.creator || 'Community'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* TAGLINE & UTILITY ACTION ROW */}
        <div className="px-6 pt-3 shrink-0">
          <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2">
            {character.tagline}
          </p>

          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#202026]">
            {/* Favorite Toggle */}
            <button
              type="button"
              onClick={handleFavoriteClick}
              className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isFavorited
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                  : 'bg-[#18181f] border-white/10 text-zinc-300 hover:text-white hover:border-white/20'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${isFavorited ? 'fill-amber-400 text-amber-400' : ''}`} />
              <span>{isFavorited ? 'Saved' : 'Favorite'}</span>
            </button>

            {/* Edit in Studio */}
            <button
              type="button"
              onClick={handleEditClick}
              className="flex-1 py-2 px-3 rounded-xl bg-[#18181f] border border-white/10 hover:border-indigo-500/40 text-zinc-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Edit in Studio</span>
            </button>

            {/* Export Card */}
            {onExportPng && (
              <button
                type="button"
                onClick={handleExportClick}
                title="Export as Renoog V2 PNG Card"
                className="p-2 rounded-xl bg-[#18181f] border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white text-xs font-semibold transition-all cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* SCROLLABLE DOSSIER CONTENT */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* 1. Live Opening Scene Preview */}
          {character.first_mes && (
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-400 mb-2">
                <Quote className="w-3.5 h-3.5" />
                <span>Opening Scene Preview</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#17171d] border border-indigo-500/20 shadow-inner text-xs leading-relaxed text-zinc-200 whitespace-pre-wrap">
                {character.first_mes}
              </div>
            </div>
          )}

          {/* 2. Character Personality Dossier */}
          {(character.personality || character.description) && (
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
                <span>Personality & Profile</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {character.personality || character.description}
              </p>
            </div>
          )}

          {/* 3. Scenario & World Context */}
          {character.scenario && (
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                <Compass className="w-3.5 h-3.5 text-zinc-500" />
                <span>Scenario Context</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">
                {character.scenario}
              </p>
            </div>
          )}

          {/* 4. Tags Ribbon */}
          {character.tags && character.tags.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                <Tag className="w-3.5 h-3.5 text-zinc-500" />
                <span>Tags & Attributes</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {character.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#18181f] text-zinc-300 border border-white/5"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* PINNED STICKY GENESIS LAUNCHPAD */}
        <div className="p-5 border-t border-[#222228] bg-[#121215]/95 backdrop-blur-md shrink-0">
          <button
            type="button"
            onClick={() => onStartRoleplay(character)}
            className="w-full py-3.5 px-5 rounded-xl bg-linear-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            <span>Start Roleplay in Universe</span>
          </button>
          <p className="text-[10px] text-zinc-500 text-center mt-2">
            Pairs this character with a world lorebook to initialize a 3-role simulation.
          </p>
        </div>
      </aside>
    </div>
  );
};
