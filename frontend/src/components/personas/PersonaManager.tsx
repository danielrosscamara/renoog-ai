import React, { useState } from 'react';
import {
  UserCircle,
  Plus,
  Edit3,
  Check,
  Sparkles,
  X,
  Image as ImageIcon,
  ShieldCheck,
  BookOpen
} from 'lucide-react';
import { useChatStore } from '../../stores/useChatStore';
import type { Persona } from '../../types';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200',
];

export const PersonaManager: React.FC = () => {
  const { personas, activePersonaId, setActivePersona } = useChatStore();

  // Local state for modal editor
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const openCreateModal = () => {
    setEditingPersona(null);
    setName('');
    setDescription('');
    setAvatarUrl(AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)]);
    setIsModalOpen(true);
  };

  const openEditModal = (persona: Persona) => {
    setEditingPersona(persona);
    setName(persona.name);
    setDescription(persona.description);
    setAvatarUrl(persona.avatar_url);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPersona(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingPersona) {
      // Update existing persona in state
      editingPersona.name = name.trim();
      editingPersona.description = description.trim();
      editingPersona.avatar_url = avatarUrl.trim() || AVATAR_PRESETS[0];
    } else {
      // Create new persona
      const newPersona: Persona = {
        id: `persona_${Date.now()}`,
        name: name.trim(),
        description: description.trim(),
        avatar_url: avatarUrl.trim() || AVATAR_PRESETS[0],
        is_default: false,
      };
      personas.push(newPersona);
      setActivePersona(newPersona.id);
    }

    closeModal();
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#121214] text-zinc-100 p-6 md:p-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-6xl w-full mx-auto mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <UserCircle className="w-6 h-6 text-emerald-400" />
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Persona Manager
            </h1>
          </div>
          <p className="text-sm text-zinc-400">
            Configure your <code className="text-emerald-400 font-mono text-xs">{"{{user}}"}</code> identities, appearance, and backstories for the prompt engine
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-sm font-semibold text-white transition-all shadow-md shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Persona</span>
        </button>
      </div>

      {/* Info Banner: How Personas Work in Renoog AI */}
      <div className="max-w-6xl w-full mx-auto mb-8 p-4 rounded-2xl bg-[#18181b] border border-[#27272a] flex items-start gap-3">
        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
          <BookOpen className="w-5 h-5" />
        </div>
        <div className="text-xs text-zinc-300 leading-relaxed">
          <strong className="text-white block mb-0.5">Prompt Architecture Note:</strong>
          Your active persona is injected into <strong>Layer 2</strong> of the 6-layer prompt compiler. The AI character will dynamically recognize your persona's name, speech habits, physical traits, and roleplay background in every message.
        </div>
      </div>

      {/* Personas Card Grid */}
      <div className="max-w-6xl w-full mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {personas.map((persona) => {
          const isActive = persona.id === activePersonaId;

          return (
            <div
              key={persona.id}
              className={`relative flex flex-col justify-between p-5 rounded-2xl bg-[#18181b] border transition-all duration-200 ${
                isActive
                  ? 'border-emerald-500/60 ring-1 ring-emerald-500/30 shadow-lg shadow-emerald-500/5'
                  : 'border-[#27272a] hover:border-[#3f3f46]'
              }`}
            >
              {/* Top Row: Avatar + Name + Status */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <img
                        src={persona.avatar_url}
                        alt={persona.name}
                        className={`w-14 h-14 rounded-full object-cover ring-2 ${
                          isActive ? 'ring-emerald-500' : 'ring-zinc-700'
                        }`}
                      />
                      {isActive && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-[#18181b] flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-black stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-white truncate max-w-36">
                          {persona.name}
                        </h3>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-500">
                        {persona.is_default ? 'Default Profile' : 'Custom Persona'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openEditModal(persona)}
                    className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272a] transition-colors"
                    title="Edit Persona"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>

                {/* Backstory & Bio */}
                <p className="text-xs text-zinc-300 line-clamp-4 leading-relaxed bg-[#121214] p-3 rounded-xl border border-[#232326] mb-4 min-h-[5.5rem]">
                  {persona.description || <span className="italic text-zinc-600">No backstory provided yet.</span>}
                </p>
              </div>

              {/* Bottom Action */}
              <div className="pt-2">
                {isActive ? (
                  <div className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Currently Active Persona</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActivePersona(persona.id)}
                    className="w-full py-2 rounded-xl bg-[#27272a] hover:bg-emerald-600 hover:text-white text-zinc-300 text-xs font-semibold transition-all shadow-sm"
                  >
                    Set as Active Persona
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Dialog: Create / Edit Persona */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#18181b] border border-[#2e2e36] shadow-2xl p-6 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#27272a] mb-5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-white">
                  {editingPersona ? 'Edit Persona' : 'Create New Persona'}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272a] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="space-y-4">
              {/* Avatar Live Preview & URL */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">
                  Persona Avatar
                </label>
                <div className="flex items-center gap-4 mb-3">
                  <img
                    src={avatarUrl || AVATAR_PRESETS[0]}
                    alt="Preview"
                    className="w-16 h-16 rounded-full object-cover ring-2 ring-emerald-500/50 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="relative">
                      <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="url"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="Paste image URL..."
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#121214] border border-[#27272a] focus:border-emerald-500/60 text-zinc-200 placeholder-zinc-500 outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Preset Avatars Row */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-400 uppercase font-medium mr-1">Presets:</span>
                  {AVATAR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatarUrl(preset)}
                      className={`w-7 h-7 rounded-full overflow-hidden border transition-all ${
                        avatarUrl === preset ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-zinc-700 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={preset} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Persona Name */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Persona Name <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Adventurer, Detective Vance, Lady Evelyn"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#121214] border border-[#27272a] focus:border-emerald-500/60 text-zinc-100 placeholder-zinc-500 outline-none transition-colors"
                />
              </div>

              {/* Description & Bio */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Description & Backstory (Injected as <code className="text-emerald-400 font-mono">{"{{user}}"}</code>)
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your appearance, traits, demeanor, and background. Example: 'A quiet wanderer in leather armor carrying an ancient compass. Speaks with curiosity.'"
                  className="w-full p-3 text-xs rounded-xl bg-[#121214] border border-[#27272a] focus:border-emerald-500/60 text-zinc-100 placeholder-zinc-500 outline-none resize-none transition-colors leading-relaxed"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#27272a]">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl bg-[#27272a] hover:bg-[#323236] text-xs font-medium text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="px-5 py-2 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-xs font-semibold text-white transition-all shadow-md"
                >
                  {editingPersona ? 'Save Changes' : 'Create Persona'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
