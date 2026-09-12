import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Check,
  Plus,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import type { Persona } from '../../types';

export interface PersonaSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  personas: Persona[];
  activePersonaId: string;
  onSelectPersona: (persona: Persona) => void;
  onCreatePersona?: (personaData: Omit<Persona, 'id'>) => Promise<string>;
}

const QUICK_AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200',
];

export const PersonaSelectorModal: React.FC<PersonaSelectorModalProps> = ({
  isOpen,
  onClose,
  personas,
  activePersonaId,
  onSelectPersona,
  onCreatePersona,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);

  // Form state for quick persona creation
  const [newName, setNewName] = useState('');
  const [newAvatarUrl, setNewAvatarUrl] = useState(QUICK_AVATAR_PRESETS[0]);
  const [newDescription, setNewDescription] = useState('');

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Filter personas based on search query
  const filteredPersonas = useMemo(() => {
    if (!searchQuery.trim()) return personas;
    const q = searchQuery.toLowerCase();
    return personas.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }, [personas, searchQuery]);

  const activePersona = useMemo(() => {
    return personas.find((p) => p.id === activePersonaId) || personas[0];
  }, [personas, activePersonaId]);

  if (!isOpen) return null;

  const handleQuickCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setCreationError('Please provide a name for your persona.');
      return;
    }

    if (!onCreatePersona) return;

    setIsSubmitting(true);
    setCreationError(null);

    try {
      const createdId = await onCreatePersona({
        name: newName.trim(),
        avatar_url: newAvatarUrl || QUICK_AVATAR_PRESETS[0],
        description: newDescription.trim() || 'A traveler navigating the realm.',
        is_default: false,
      });

      // Reset form and state
      setNewName('');
      setNewDescription('');
      setIsCreating(false);

      // Select newly created persona if returned
      const createdPersona = personas.find((p) => p.id === createdId);
      if (createdPersona) {
        onSelectPersona(createdPersona);
      }
      onClose();
    } catch (err: unknown) {
      setCreationError(
        err instanceof Error ? err.message : 'Failed to create persona.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="persona-modal-title"
    >
      <div
        className="w-full max-w-2xl bg-[#18181b] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-zinc-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272a] bg-[#121216]/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="persona-modal-title" className="text-base font-bold text-white">
                Select Roleplay Identity
              </h2>
              <p className="text-xs text-zinc-400">
                Choose which persona speaks and acts in this conversation or simulation.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close persona selector"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-[#27272a] bg-[#141418]/40 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search personas by name, archetype, or backstory..."
              className="w-full pl-10 pr-9 py-2 rounded-xl bg-[#101014] border border-[#27272a] text-xs text-zinc-200 placeholder-zinc-500 focus:border-emerald-500/50 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Personas List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Active Persona Spotlight (if matching search or search empty) */}
          {activePersona &&
            (!searchQuery.trim() ||
              activePersona.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              activePersona.description
                .toLowerCase()
                .includes(searchQuery.toLowerCase())) && (
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-2">
                  Active Player Identity
                </span>
                <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 shadow-xs flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={activePersona.avatar_url || QUICK_AVATAR_PRESETS[0]}
                        alt={activePersona.name}
                        className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-500/50"
                      />
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-[#18181b] flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-black stroke-3" />
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-white truncate">
                          {activePersona.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Active Now
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5">
                        {activePersona.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* Available Personas Header */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Available Personas ({filteredPersonas.length})
              </span>
              {onCreatePersona && (
                <button
                  type="button"
                  onClick={() => setIsCreating(!isCreating)}
                  className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isCreating ? 'Close Creator' : 'New Persona'}</span>
                  {isCreating ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>

            {/* Inline Quick Creation Drawer */}
            {isCreating && (
              <form
                onSubmit={handleQuickCreateSubmit}
                className="mb-4 p-4 rounded-2xl bg-[#121216] border border-zinc-700/80 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Quick Create Persona
                  </span>
                </div>

                {creationError && (
                  <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{creationError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Persona Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Rowan Vance, Investigator"
                    className="w-full px-3 py-1.5 rounded-xl bg-[#181820] border border-zinc-700 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500/60 focus:outline-none"
                    required
                  />
                </div>

                {/* Avatar Presets Selection */}
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                    Select Avatar Preset
                  </label>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {QUICK_AVATAR_PRESETS.map((url, idx) => {
                      const isSelected = newAvatarUrl === url;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setNewAvatarUrl(url)}
                          className={`relative rounded-xl overflow-hidden shrink-0 transition-all cursor-pointer ${
                            isSelected
                              ? 'ring-2 ring-emerald-400 scale-105 shadow-md'
                              : 'opacity-70 hover:opacity-100 ring-1 ring-zinc-700'
                          }`}
                        >
                          <img
                            src={url}
                            alt={`Preset ${idx + 1}`}
                            className="w-10 h-10 object-cover"
                          />
                          {isSelected && (
                            <span className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-white stroke-3" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Backstory & Personality Traits
                  </label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    rows={2}
                    placeholder="A brief summary of your character's background, tone of voice, and appearance..."
                    className="w-full px-3 py-1.5 rounded-xl bg-[#181820] border border-zinc-700 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500/60 focus:outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newName.trim()}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 transition-colors shadow-sm cursor-pointer"
                  >
                    {isSubmitting ? 'Saving...' : 'Save & Switch'}
                  </button>
                </div>
              </form>
            )}

            {/* Personas Grid */}
            <div className="space-y-2">
              {filteredPersonas.map((persona) => {
                const isActive = persona.id === activePersonaId;
                return (
                  <div
                    key={persona.id}
                    onClick={() => {
                      onSelectPersona(persona);
                      onClose();
                    }}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer group ${
                      isActive
                        ? 'bg-emerald-950/15 border-emerald-500/40 text-emerald-100'
                        : 'bg-[#181820] hover:bg-[#202028] border-zinc-800/80 hover:border-zinc-700 text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={persona.avatar_url || QUICK_AVATAR_PRESETS[0]}
                        alt={persona.name}
                        className={`w-10 h-10 rounded-xl object-cover ring-1 shrink-0 ${
                          isActive
                            ? 'ring-emerald-500'
                            : 'ring-zinc-700 group-hover:ring-zinc-500'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-white truncate group-hover:text-emerald-300 transition-colors">
                            {persona.name}
                          </span>
                          {isActive && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                          {persona.description}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPersona(persona);
                        onClose();
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-zinc-800 hover:bg-emerald-600 hover:text-white text-zinc-300'
                      }`}
                    >
                      {isActive ? 'Selected' : 'Select'}
                    </button>
                  </div>
                );
              })}

              {filteredPersonas.length === 0 && (
                <div className="py-8 text-center text-zinc-500 text-xs">
                  No personas found matching &quot;{searchQuery}&quot;.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#27272a] bg-[#121216]/60 flex items-center justify-between shrink-0 text-xs">
          <span className="text-zinc-500 text-[11px]">
            Switching your persona only affects future turns; past turns remain preserved.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
