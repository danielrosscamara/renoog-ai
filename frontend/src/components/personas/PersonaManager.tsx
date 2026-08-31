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
  BookOpen,
  Wand2,
  Code2,
  FileText,
  User,
  Eye,
  MessageSquare,
  Compass,
} from 'lucide-react';
import { useChatStore } from '../../stores/useChatStore';
import type { Persona } from '../../types';

interface PersonaArchetype {
  name: string;
  avatar: string;
  pronouns: string;
  appearance: string;
  personality: string;
  backstory: string;
  icon: string;
}

const ARCHETYPE_PRESETS: PersonaArchetype[] = [
  {
    name: 'Wandering Scholar',
    icon: '🧙',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    pronouns: 'He/Him',
    appearance: 'Tall with dark hair, wearing a travel-worn leather coat and a silver signet ring.',
    personality: 'Calm, perceptive, speaks in quiet and measured tones. Highly curious about ancient lore.',
    backstory: 'A traveling researcher from the northern academies studying forgotten civilizations.',
  },
  {
    name: 'Cyberpunk Mercenary',
    icon: '🕶️',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
    pronouns: 'She/Her',
    appearance: 'Neon-tinted undercut, dark tactical vest with cybernetic wrist terminal.',
    personality: 'Sarcastic, observant, guarded. Never walks into a room without checking the exits.',
    backstory: 'An ex-corporate bodyguard now taking high-risk freelance contracts in the lower neon city.',
  },
  {
    name: 'Noir Detective',
    icon: '🕵️',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
    pronouns: 'They/Them',
    appearance: 'Charcoal trenchcoat, tired sharp eyes, always carrying a vintage brass lighter.',
    personality: 'Dry humor, skeptical, fiercely protective of the innocent. Hates unsolved riddles.',
    backstory: 'A seasoned private investigator navigating corruption, mysteries, and midnight encounters.',
  },
  {
    name: 'Modern Companion',
    icon: '✨',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    pronouns: 'She/Her',
    appearance: 'Casual oversized knit sweater, warm smile, expressive hazel eyes.',
    personality: 'Empathetic, playful, spontaneous. Great listener who values emotional honesty.',
    backstory: 'A creative designer exploring art, deep midnight conversations, and new city adventures.',
  },
];

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200',
];

export const PersonaManager: React.FC = () => {
  const {
    personas,
    activePersonaId,
    setActivePersona,
    addPersona,
    updatePersona,
  } = useChatStore();

  // Local state for modal editor
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [editorTab, setEditorTab] = useState<'guided' | 'raw' | 'xml'>('guided');

  // Guided Form fields
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [pronouns, setPronouns] = useState('He/Him');
  const [appearance, setAppearance] = useState('');
  const [personality, setPersonality] = useState('');
  const [backstory, setBackstory] = useState('');
  const [rawDescription, setRawDescription] = useState('');

  // Helper to compile guided fields into description
  const compileGuidedDescription = (): string => {
    const parts = [];
    if (pronouns.trim()) parts.push(`Pronouns: ${pronouns.trim()}`);
    if (appearance.trim()) parts.push(`Appearance: ${appearance.trim()}`);
    if (personality.trim()) parts.push(`Personality: ${personality.trim()}`);
    if (backstory.trim()) parts.push(`Backstory: ${backstory.trim()}`);
    return parts.join('\n\n');
  };

  // Helper to generate live XML preview
  const generateLiveXmlPreview = (): string => {
    const activeName = name.trim() || 'User';
    return `<user_profile name="${activeName}">
  <pronouns>${pronouns.trim() || 'Unspecified'}</pronouns>
  <appearance>${appearance.trim() || 'A traveler with distinct presence'}</appearance>
  <personality>${personality.trim() || 'Calm, perceptive, responsive'}</personality>
  <backstory>${backstory.trim() || rawDescription.trim() || 'A wanderer exploring the world'}</backstory>
  <directive>Address {{user}} as ${activeName}. React dynamically to their inputs. Never control or narrate {{user}}'s actions.</directive>
</user_profile>`;
  };

  const openCreateModal = () => {
    setEditingPersona(null);
    setName('');
    setPronouns('He/Him');
    setAppearance('');
    setPersonality('');
    setBackstory('');
    setRawDescription('');
    setAvatarUrl(AVATAR_PRESETS[0]);
    setEditorTab('guided');
    setIsModalOpen(true);
  };

  const openEditModal = (persona: Persona) => {
    setEditingPersona(persona);
    setName(persona.name);
    setAvatarUrl(persona.avatar_url);
    setRawDescription(persona.description);

    // Attempt to extract structured fields if formatted
    const desc = persona.description || '';
    const pronounsMatch = desc.match(/Pronouns:\s*(.+)/i);
    const appearanceMatch = desc.match(/Appearance:\s*(.+)/i);
    const personalityMatch = desc.match(/Personality:\s*(.+)/i);
    const backstoryMatch = desc.match(/Backstory:\s*(.+)/i);

    if (pronounsMatch || appearanceMatch || personalityMatch || backstoryMatch) {
      setPronouns(pronounsMatch ? pronounsMatch[1].trim() : 'He/Him');
      setAppearance(appearanceMatch ? appearanceMatch[1].trim() : '');
      setPersonality(personalityMatch ? personalityMatch[1].trim() : '');
      setBackstory(backstoryMatch ? backstoryMatch[1].trim() : '');
      setEditorTab('guided');
    } else {
      setRawDescription(desc);
      setEditorTab('guided');
    }

    setIsModalOpen(true);
  };

  const applyArchetypePreset = (archetype: PersonaArchetype) => {
    setName(archetype.name);
    setAvatarUrl(archetype.avatar);
    setPronouns(archetype.pronouns);
    setAppearance(archetype.appearance);
    setPersonality(archetype.personality);
    setBackstory(archetype.backstory);
    setRawDescription(
      `Pronouns: ${archetype.pronouns}\n\nAppearance: ${archetype.appearance}\n\nPersonality: ${archetype.personality}\n\nBackstory: ${archetype.backstory}`
    );
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPersona(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Use guided description if filled, otherwise fallback to raw
    const finalDescription =
      editorTab === 'raw' && rawDescription.trim()
        ? rawDescription.trim()
        : compileGuidedDescription() || rawDescription.trim() || 'A perceptive traveler.';

    if (editingPersona) {
      updatePersona(editingPersona.id, {
        name: name.trim(),
        description: finalDescription,
        avatar_url: avatarUrl.trim() || AVATAR_PRESETS[0],
      });
    } else {
      addPersona({
        name: name.trim(),
        description: finalDescription,
        avatar_url: avatarUrl.trim() || AVATAR_PRESETS[0],
        is_default: false,
      });
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
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-semibold">
              XML Profile Standard
            </span>
          </div>
          <p className="text-sm text-zinc-400">
            Configure your <code className="text-emerald-400 font-mono text-xs">{"{{user}}"}</code> identities, appearance, and voice for the prompt engine
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
          Your active persona is compiled into <code className="text-emerald-400 font-mono">{"<user_profile>"}</code> in <strong>Layer 2</strong> of the prompt engine. The AI companion will naturally recognize your appearance, pronouns, and speech tone in every interaction.
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
                          <Check className="w-2.5 h-2.5 text-black stroke-3" />
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
                <p className="text-xs text-zinc-300 line-clamp-4 leading-relaxed bg-[#121214] p-3 rounded-xl border border-[#232326] mb-4 min-h-22 whitespace-pre-line">
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
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-[#18181b] border border-[#2e2e36] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272a] bg-[#1c1c20] shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">
                  {editingPersona ? 'Edit Roleplay Persona' : 'Create New Roleplay Persona'}
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

            {/* Quick 1-Click Archetype Presets */}
            <div className="px-6 py-3 border-b border-[#27272a] bg-[#141417] flex items-center gap-2 overflow-x-auto shrink-0">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider shrink-0 flex items-center gap-1">
                <Wand2 className="w-3 h-3 text-emerald-400" />
                1-Click Presets:
              </span>
              {ARCHETYPE_PRESETS.map((arch) => (
                <button
                  key={arch.name}
                  type="button"
                  onClick={() => applyArchetypePreset(arch)}
                  className="px-2.5 py-1 rounded-lg bg-[#1f1f23] hover:bg-[#2a2a30] text-zinc-300 hover:text-emerald-300 border border-[#2e2e36] text-xs font-medium shrink-0 transition-colors flex items-center gap-1.5"
                >
                  <span>{arch.icon}</span>
                  <span>{arch.name}</span>
                </button>
              ))}
            </div>

            {/* Modal Content Body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Avatar Live Preview & URL */}
              <div className="flex items-center gap-4 p-3 rounded-2xl bg-[#141417] border border-[#27272a]">
                <img
                  src={avatarUrl || AVATAR_PRESETS[0]}
                  alt="Preview"
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-emerald-500/50 shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="Paste avatar image URL..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-[#18181b] border border-[#27272a] focus:border-emerald-500 text-zinc-200 outline-none"
                    />
                  </div>
                  {/* Preset Avatars Row */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400 uppercase font-medium">Presets:</span>
                    {AVATAR_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAvatarUrl(preset)}
                        className={`w-6 h-6 rounded-full overflow-hidden border transition-all ${
                          avatarUrl === preset ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-zinc-700 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={preset} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Persona Name & Pronouns Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Persona Name <span className="text-emerald-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Dale, Detective Vance, Lady Evelyn"
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-[#141417] border border-[#27272a] focus:border-emerald-500 text-zinc-100 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Pronouns
                  </label>
                  <select
                    value={pronouns}
                    onChange={(e) => setPronouns(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#141417] border border-[#27272a] focus:border-emerald-500 text-zinc-200 outline-none cursor-pointer"
                  >
                    <option value="He/Him">He / Him</option>
                    <option value="She/Her">She / Her</option>
                    <option value="They/Them">They / Them</option>
                    <option value="Any">Any / Fluid</option>
                  </select>
                </div>
              </div>

              {/* View Tab Selector: Guided vs Raw vs XML Preview */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#141417] border border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setEditorTab('guided')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    editorTab === 'guided'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Guided Roleplay Fields</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab('raw')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    editorTab === 'raw'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Freeform Prose</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab('xml')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    editorTab === 'xml'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Live XML Profile</span>
                </button>
              </div>

              {/* Tab 1: Guided Fields */}
              {editorTab === 'guided' && (
                <div className="space-y-3">
                  {/* Appearance */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Physical Appearance & Attire</span>
                    </label>
                    <input
                      type="text"
                      value={appearance}
                      onChange={(e) => setAppearance(e.target.value)}
                      placeholder="e.g. Tall with dark trenchcoat, piercing hazel eyes, silver ring..."
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[#141417] border border-[#27272a] focus:border-emerald-500 text-zinc-100 placeholder-zinc-500 outline-none"
                    />
                  </div>

                  {/* Personality & Tone */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Speech Tone & Personality</span>
                    </label>
                    <input
                      type="text"
                      value={personality}
                      onChange={(e) => setPersonality(e.target.value)}
                      placeholder="e.g. Calm, observant, speaks softly, uses dry wit when challenged..."
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[#141417] border border-[#27272a] focus:border-emerald-500 text-zinc-100 placeholder-zinc-500 outline-none"
                    />
                  </div>

                  {/* Role & Backstory */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Role & Backstory</span>
                    </label>
                    <textarea
                      rows={3}
                      value={backstory}
                      onChange={(e) => setBackstory(e.target.value)}
                      placeholder="e.g. A wandering mercenary navigating corporate intrigue in the outer districts..."
                      className="w-full p-3 text-xs rounded-xl bg-[#141417] border border-[#27272a] focus:border-emerald-500 text-zinc-100 placeholder-zinc-500 outline-none resize-none leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: Freeform Prose */}
              {editorTab === 'raw' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Custom Persona Backstory Description
                  </label>
                  <textarea
                    rows={6}
                    value={rawDescription}
                    onChange={(e) => setRawDescription(e.target.value)}
                    placeholder="Write a custom description describing your identity, speech, and backstory..."
                    className="w-full p-3 text-xs rounded-xl bg-[#141417] border border-[#27272a] focus:border-emerald-500 text-zinc-100 placeholder-zinc-500 outline-none resize-none leading-relaxed"
                  />
                </div>
              )}

              {/* Tab 3: Live XML Profile Preview */}
              {editorTab === 'xml' && (
                <div className="space-y-2">
                  <div className="text-xs text-zinc-400 flex items-center gap-1">
                    <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Live Compiled Layer 2 User Profile XML:</span>
                  </div>
                  <pre className="w-full p-4 rounded-2xl bg-[#121214] border border-[#27272a] text-xs font-mono text-emerald-300 leading-relaxed overflow-x-auto select-text">
                    {generateLiveXmlPreview()}
                  </pre>
                </div>
              )}

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
