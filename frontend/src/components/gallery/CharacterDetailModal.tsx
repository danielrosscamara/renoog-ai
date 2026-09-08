import React, { useEffect, useState } from 'react';
import {
  X,
  Star,
  Edit3,
  Download,
  Sparkles,
  Tag,
  BookOpen,
  User,
  Quote,
  ChevronDown,
  ChevronUp,
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
  const [isLoreExpanded, setIsLoreExpanded] = useState<boolean>(false);

  // Reset override and collapse lore when character prop changes using render-time derivation
  if (character && character.id !== prevCharId) {
    setPrevCharId(character.id);
    setFavoriteOverride(null);
    setIsLoreExpanded(false);
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

  const fullLoreText = character.personality || character.description || '';
  const hasLongLore = fullLoreText.length > 220 || Boolean(character.scenario);

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden" role="dialog" aria-modal="true">
      {/* Dimmed Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity cursor-pointer animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-Over Holo-Drawer Container (Responsive 768p+ optimized) */}
      <aside className="relative w-full max-w-lg md:max-w-xl bg-[#111114] border-l border-[#222228] h-full shadow-2xl flex flex-col z-10 overflow-hidden animate-in slide-in-from-right duration-300">
        {/* COMPACT HERO HEADER WITH AMBIENT BACKDROP */}
        <div className="relative p-5 pb-4 border-b border-[#1f1f26] shrink-0 overflow-hidden">
          {/* Ambient Blurred Background Glow */}
          <div
            className="absolute inset-0 opacity-20 blur-3xl scale-150 pointer-events-none bg-cover bg-center"
            style={{ backgroundImage: `url(${character.wallpaper_url || character.avatar_url})` }}
          />
          <div className="absolute inset-0 bg-linear-to-b from-transparent via-[#111114]/80 to-[#111114]" />

          {/* Top Close Bar */}
          <div className="relative z-10 flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
              Companion Dossier
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Character Drawer"
              className="p-1.5 rounded-xl bg-black/50 text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Integrated Horizontal Profile Block */}
          <div className="relative z-10 flex items-start gap-4">
            {/* Crisp Portrait Card */}
            <div className="relative shrink-0">
              <img
                src={character.avatar_url}
                alt={character.name}
                className="w-20 h-24 sm:w-24 sm:h-28 rounded-2xl object-cover ring-2 ring-indigo-500/30 shadow-2xl border border-white/10 bg-zinc-800"
              />
              {character.tags[0] && (
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md text-[9px] font-bold bg-black/80 backdrop-blur-md text-indigo-300 border border-indigo-500/30 whitespace-nowrap shadow-md">
                  {character.tags[0]}
                </span>
              )}
            </div>

            {/* Identity & Actions Column */}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate leading-tight">
                {character.name}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-zinc-400">
                <User className="w-3 h-3 text-zinc-500 shrink-0" />
                <span className="truncate">by {character.creator || 'Community'}</span>
              </div>
              <p className="text-xs text-zinc-300 line-clamp-2 mt-1.5 leading-relaxed">
                {character.tagline}
              </p>

              {/* Compact Quick Utilities */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleFavoriteClick}
                  className={`py-1.5 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isFavorited
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                      : 'bg-[#18181f] border-white/10 text-zinc-300 hover:text-white hover:border-white/20'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${isFavorited ? 'fill-amber-400 text-amber-400' : ''}`} />
                  <span>{isFavorited ? 'Saved' : 'Favorite'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleEditClick}
                  className="py-1.5 px-3 rounded-xl bg-[#18181f] border border-white/10 hover:border-indigo-500/40 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Edit</span>
                </button>

                {onExportPng && (
                  <button
                    type="button"
                    onClick={handleExportClick}
                    title="Export as Renoog V2 PNG Card"
                    className="p-1.5 rounded-xl bg-[#18181f] border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SCROLLABLE DOSSIER BODY */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 1. THE OPENING HOOK (Dialogue Card Front-and-Center) */}
          {character.first_mes && (
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-400 mb-1.5">
                <Quote className="w-3.5 h-3.5" />
                <span>The Opening Hook</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#161622] border border-indigo-500/25 shadow-inner text-xs leading-relaxed text-zinc-100 font-medium whitespace-pre-wrap">
                {character.first_mes}
              </div>
            </div>
          )}

          {/* 2. TAGS & KEYWORD ATTRIBUTES */}
          {character.tags && character.tags.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                <Tag className="w-3 h-3 text-zinc-500" />
                <span>Attributes</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {character.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#16161d] text-zinc-300 border border-white/5"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 3. SCANNABLE DOSSIER & EXPANDABLE LORE */}
          {fullLoreText && (
            <div className="p-3.5 rounded-2xl bg-[#14141a] border border-[#202028] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <BookOpen className="w-3 h-3 text-zinc-500" />
                  <span>Personality & Lore Details</span>
                </div>
                {hasLongLore && (
                  <button
                    type="button"
                    onClick={() => setIsLoreExpanded((prev) => !prev)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>{isLoreExpanded ? 'Collapse' : 'Show Full Lore'}</span>
                    {isLoreExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}
              </div>

              <p
                className={`text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap ${
                  !isLoreExpanded && hasLongLore ? 'line-clamp-3' : ''
                }`}
              >
                {fullLoreText}
              </p>

              {/* Scenario Context (Revealed when expanded or short) */}
              {character.scenario && (isLoreExpanded || !hasLongLore) && (
                <div className="pt-2 border-t border-white/5">
                  <span className="text-[10px] font-bold text-zinc-400 block mb-0.5">
                    Scenario Setting:
                  </span>
                  <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">
                    {character.scenario}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* PINNED STICKY GENESIS LAUNCHPAD */}
        <div className="p-4 sm:p-5 border-t border-[#1f1f26] bg-[#111114]/95 backdrop-blur-md shrink-0">
          <button
            type="button"
            onClick={() => onStartRoleplay(character)}
            className="w-full py-3.5 px-5 rounded-xl bg-linear-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            <span>Start Roleplay in Universe</span>
          </button>
        </div>
      </aside>
    </div>
  );
};
