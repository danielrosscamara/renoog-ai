import React, { useEffect } from 'react';
import {
  X,
  Sparkles,
  Users,
  CheckCircle2,
  Compass,
} from 'lucide-react';
import type { Character } from '../../types';

export interface PostSaveRoleplayModalProps {
  character: Character | null;
  isOpen: boolean;
  onClose: () => void;
  onReturnToGallery: () => void;
  onStartRoleplay: (character: Character) => void;
}

export const PostSaveRoleplayModal: React.FC<PostSaveRoleplayModalProps> = ({
  character,
  isOpen,
  onClose,
  onReturnToGallery,
  onStartRoleplay,
}) => {
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
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
      <div className="relative w-full max-w-lg bg-[#111115] border border-zinc-800 rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* HEADER */}
        <header className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Character Saved</h2>
              <p className="text-[11px] text-zinc-400">
                Added to your personal character library
              </p>
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

        {/* BODY */}
        <div className="p-6 space-y-5">
          {/* Character Card Preview */}
          <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex items-center gap-3.5">
            <img
              src={character.avatar_url}
              alt={character.name}
              className="w-14 h-14 rounded-xl object-cover ring-1 ring-white/10 shrink-0 bg-zinc-800"
            />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">
                {character.name}
              </h3>
              <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5 leading-relaxed">
                {character.tagline || character.description || 'AI Companion'}
              </p>
            </div>
          </div>

          {/* Decision Prompt */}
          <p className="text-xs text-zinc-300">
            Would you like to start a Universe roleplay with {character.name} now?
          </p>

          {/* Choice Cards */}
          <div className="space-y-3">
            {/* Option A: Start Roleplay Now */}
            <button
              type="button"
              onClick={() => onStartRoleplay(character)}
              className="w-full text-left p-4 rounded-xl bg-linear-to-r from-indigo-950/40 to-violet-950/40 hover:from-indigo-950/70 hover:to-violet-950/70 border border-indigo-500/30 hover:border-indigo-500/50 transition-all flex items-start gap-4 group cursor-pointer shadow-md shadow-indigo-950/20 active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-md shadow-indigo-600/30">
                <Sparkles className="w-5 h-5 text-indigo-200" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white group-hover:text-indigo-200 transition-colors">
                  Yes, Start Roleplay Now ➔
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                  Choose a world setting and launch into a multi-entity Universe simulation.
                </p>
              </div>
            </button>

            {/* Option B: Return to Character Gallery */}
            <button
              type="button"
              onClick={onReturnToGallery}
              className="w-full text-left p-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all flex items-start gap-4 group cursor-pointer active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-400 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-zinc-200 group-hover:text-white transition-colors">
                  No, Return to Character Gallery
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                  View your character roster or build another character.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="px-6 py-3 border-t border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between text-[11px] text-zinc-500">
          <span className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-indigo-400" />
            <span>Multi-entity roleplay simulation</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="hover:text-zinc-300 transition-colors cursor-pointer"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
};
