import React, { useState, useMemo } from 'react';
import {
  Search,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  Download,
  AlertTriangle,
  Sparkles,
  Check,
  X,
  Loader2,
  Shield,
  MessageSquare,
  Plus,
  Star,
  Globe,
  UserCircle,
  Copy,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { useChatStore } from '../../stores/useChatStore';
import { useWorldStore } from '../../stores/useWorldStore';
import type { Character, Persona } from '../../types';
import type { WorldPresetWithMeta } from '../../stores/useWorldStore';
import type { WorldPreset } from '../../data/worldPresets';

export interface DevStudioProps {
  onEditWorldInStudio?: (worldId: string) => void;
  onCreateNewWorld?: () => void;
}

interface WorldEditForm {
  name: string;
  genre: WorldPreset['genre'];
  tagline: string;
  description: string;
  banner_url: string;
  narrator_tone: string;
  sensory_palette: string;
  weather_cycle: string;
  world_rules: string;
  factions: string;
  cultural_taboos: string;
  tags: string[];
}

interface PersonaEditForm {
  name: string;
  avatar_url: string;
  description: string;
}

const QUICK_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200',
];

const WORLD_GENRES: WorldPreset['genre'][] = [
  'Fantasy',
  'Cyberpunk',
  'Sci-Fi',
  'Cosmic Horror',
  'Post-Apocalyptic',
  'Supernatural',
  'Mystery',
  'Modern',
];

export const DevStudio: React.FC<DevStudioProps> = ({
  onEditWorldInStudio,
  onCreateNewWorld,
}) => {
  // Domain Tab Switcher
  const [domainTab, setDomainTab] = useState<'characters' | 'worlds' | 'personas'>('characters');

  // Stores
  const {
    characters,
    toggleCharacterVisibility,
    deleteCharacter,
    updateCharacter,
    exportCharacterPng,
    setActiveCharacter,
    setActiveView,
    createNewChat,
    personas,
    activePersonaId,
    setActivePersona,
    addPersona,
    updatePersona,
    deletePersona,
  } = useChatStore();

  const {
    worlds,
    favoriteWorldIds,
    toggleFavoriteWorld,
    updateCustomWorld,
    createCustomWorld,
    deleteCustomWorld,
    exportWorldJson,
  } = useWorldStore();

  // Search & Filters
  const [search, setSearch] = useState('');
  const [charFilter, setCharFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [worldFilter, setWorldFilter] = useState<'all' | 'custom' | 'builtin' | 'starred'>('all');

  // ─── Character Modals & State ──────────────────────────────────────────────
  const [deletingChar, setDeletingChar] = useState<Character | null>(null);
  const [isDeletingChar, setIsDeletingChar] = useState(false);
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [charForm, setCharForm] = useState<{
    name: string;
    tagline: string;
    description: string;
    personality: string;
    scenario: string;
    first_mes: string;
    tags: string[];
    is_hidden: boolean;
  }>({
    name: '',
    tagline: '',
    description: '',
    personality: '',
    scenario: '',
    first_mes: '',
    tags: [],
    is_hidden: false,
  });
  const [isSavingChar, setIsSavingChar] = useState(false);
  const [newCharTagInput, setNewCharTagInput] = useState('');
  const [exportingCharId, setExportingCharId] = useState<string | null>(null);

  // ─── World Modals & State ──────────────────────────────────────────────────
  const [editingWorld, setEditingWorld] = useState<WorldPresetWithMeta | null>(null);
  const [worldForm, setWorldForm] = useState<WorldEditForm>({
    name: '',
    genre: 'Fantasy',
    tagline: '',
    description: '',
    banner_url: '',
    narrator_tone: '',
    sensory_palette: '',
    weather_cycle: '',
    world_rules: '',
    factions: '',
    cultural_taboos: '',
    tags: [],
  });
  const [isSavingWorld, setIsSavingWorld] = useState(false);
  const [newWorldTagInput, setNewWorldTagInput] = useState('');
  const [deletingWorld, setDeletingWorld] = useState<WorldPresetWithMeta | null>(null);

  // ─── Persona Modals & State ────────────────────────────────────────────────
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [isCreatingPersona, setIsCreatingPersona] = useState(false);
  const [personaForm, setPersonaForm] = useState<PersonaEditForm>({
    name: '',
    avatar_url: '',
    description: '',
  });
  const [isSavingPersona, setIsSavingPersona] = useState(false);
  const [deletingPersona, setDeletingPersona] = useState<Persona | null>(null);

  // ─── Filtered Data ─────────────────────────────────────────────────────────
  const filteredCharacters = useMemo(() => {
    return characters.filter((c) => {
      const isHidden = Boolean(c.is_hidden);
      if (charFilter === 'visible' && isHidden) return false;
      if (charFilter === 'hidden' && !isHidden) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.tagline?.toLowerCase().includes(q) ||
        c.creator?.toLowerCase().includes(q) ||
        c.tags?.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [characters, charFilter, search]);

  const filteredWorlds = useMemo(() => {
    return worlds.filter((w) => {
      const isCustom = Boolean(w.is_custom);
      const isFav = favoriteWorldIds.includes(w.id);

      if (worldFilter === 'custom' && !isCustom) return false;
      if (worldFilter === 'builtin' && isCustom) return false;
      if (worldFilter === 'starred' && !isFav) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        w.name.toLowerCase().includes(q) ||
        w.genre.toLowerCase().includes(q) ||
        w.tagline?.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q) ||
        w.narrator_tone?.toLowerCase().includes(q) ||
        w.factions?.toLowerCase().includes(q) ||
        w.tags?.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [worlds, worldFilter, favoriteWorldIds, search]);

  const filteredPersonas = useMemo(() => {
    if (!search.trim()) return personas;
    const q = search.toLowerCase();
    return personas.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }, [personas, search]);

  // Counts
  const visibleCharCount = characters.filter((c) => !c.is_hidden).length;
  const hiddenCharCount = characters.filter((c) => Boolean(c.is_hidden)).length;
  const customWorldCount = worlds.filter((w) => w.is_custom).length;
  const builtinWorldCount = worlds.filter((w) => !w.is_custom).length;
  const starredWorldCount = worlds.filter((w) => favoriteWorldIds.includes(w.id)).length;

  // ─── Character Handlers ────────────────────────────────────────────────────
  const handleOpenEditChar = (char: Character) => {
    setEditingChar(char);
    setCharForm({
      name: char.name,
      tagline: char.tagline || '',
      description: char.description || '',
      personality: char.personality || '',
      scenario: char.scenario || '',
      first_mes: char.first_mes || '',
      tags: [...(char.tags || [])],
      is_hidden: Boolean(char.is_hidden),
    });
  };

  const handleSaveChar = async () => {
    if (!editingChar) return;
    setIsSavingChar(true);
    try {
      await updateCharacter(editingChar.id, {
        name: charForm.name.trim() || editingChar.name,
        tagline: charForm.tagline.trim(),
        description: charForm.description.trim(),
        personality: charForm.personality.trim(),
        scenario: charForm.scenario.trim(),
        first_mes: charForm.first_mes.trim() || editingChar.first_mes,
        tags: charForm.tags,
        is_hidden: charForm.is_hidden,
      });
      setEditingChar(null);
    } finally {
      setIsSavingChar(false);
    }
  };

  const handleConfirmDeleteChar = async () => {
    if (!deletingChar) return;
    setIsDeletingChar(true);
    try {
      await deleteCharacter(deletingChar.id);
      setDeletingChar(null);
    } finally {
      setIsDeletingChar(false);
    }
  };

  const handleExportPng = async (char: Character) => {
    setExportingCharId(char.id);
    try {
      await exportCharacterPng(char.id);
    } finally {
      setExportingCharId(null);
    }
  };

  const handleStartChat = async (char: Character) => {
    setActiveCharacter(char.id);
    await createNewChat(char.id);
    setActiveView('chat');
  };

  const toggleCharTag = (tag: string) => {
    setCharForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  };

  const handleAddCustomCharTag = () => {
    const cleanTag = newCharTagInput.trim();
    if (cleanTag && !charForm.tags.includes(cleanTag)) {
      setCharForm((prev) => ({
        ...prev,
        tags: [...prev.tags, cleanTag],
      }));
      setNewCharTagInput('');
    }
  };

  // ─── World Handlers ────────────────────────────────────────────────────────
  const handleOpenEditWorld = (world: WorldPresetWithMeta) => {
    setEditingWorld(world);
    setWorldForm({
      name: world.name,
      genre: world.genre,
      tagline: world.tagline || '',
      description: world.description || '',
      banner_url: world.banner_url || '',
      narrator_tone: world.narrator_tone || '',
      sensory_palette: world.sensory_palette || '',
      weather_cycle: world.weather_cycle || '',
      world_rules: world.world_rules || '',
      factions: world.factions || '',
      cultural_taboos: world.cultural_taboos || '',
      tags: [...(world.tags || [])],
    });
  };

  const handleSaveWorld = () => {
    if (!editingWorld) return;
    setIsSavingWorld(true);
    try {
      if (editingWorld.is_custom) {
        // Direct update for custom realms
        updateCustomWorld(editingWorld.id, {
          name: worldForm.name.trim() || editingWorld.name,
          genre: worldForm.genre,
          tagline: worldForm.tagline.trim(),
          description: worldForm.description.trim(),
          banner_url: worldForm.banner_url.trim(),
          narrator_tone: worldForm.narrator_tone.trim() || undefined,
          sensory_palette: worldForm.sensory_palette.trim() || undefined,
          weather_cycle: worldForm.weather_cycle.trim() || undefined,
          world_rules: worldForm.world_rules.trim() || undefined,
          factions: worldForm.factions.trim() || undefined,
          cultural_taboos: worldForm.cultural_taboos.trim() || undefined,
          tags: worldForm.tags,
        });
      } else {
        // For built-in presets: fork as a custom realm with user updates
        createCustomWorld({
          name: `${worldForm.name.trim()} (Custom Fork)`,
          genre: worldForm.genre,
          tagline: worldForm.tagline.trim(),
          description: worldForm.description.trim(),
          banner_url: worldForm.banner_url.trim() || editingWorld.banner_url,
          narrator_tone: worldForm.narrator_tone.trim() || undefined,
          sensory_palette: worldForm.sensory_palette.trim() || undefined,
          weather_cycle: worldForm.weather_cycle.trim() || undefined,
          world_rules: worldForm.world_rules.trim() || undefined,
          factions: worldForm.factions.trim() || undefined,
          cultural_taboos: worldForm.cultural_taboos.trim() || undefined,
          starter_locations: editingWorld.starter_locations || [],
          default_location_id: editingWorld.default_location_id || '',
          lorebook_entries: editingWorld.lorebook_entries || [],
          tags: worldForm.tags,
        });
      }
      setEditingWorld(null);
    } finally {
      setIsSavingWorld(false);
    }
  };

  const handleForkWorld = (world: WorldPresetWithMeta) => {
    createCustomWorld({
      name: `${world.name} (Custom Fork)`,
      genre: world.genre,
      tagline: world.tagline || '',
      description: world.description,
      banner_url: world.banner_url,
      narrator_tone: world.narrator_tone,
      sensory_palette: world.sensory_palette,
      weather_cycle: world.weather_cycle,
      world_rules: world.world_rules,
      factions: world.factions,
      cultural_taboos: world.cultural_taboos,
      starter_locations: world.starter_locations || [],
      default_location_id: world.default_location_id || '',
      lorebook_entries: world.lorebook_entries || [],
      tags: [...(world.tags || [])],
    });
  };

  const handleExportWorld = (world: WorldPresetWithMeta) => {
    try {
      const jsonStr = exportWorldJson(world.id);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = world.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      a.download = `${safeName}_lore.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export world JSON:', err);
    }
  };

  const handleConfirmDeleteWorld = () => {
    if (!deletingWorld) return;
    deleteCustomWorld(deletingWorld.id);
    setDeletingWorld(null);
  };

  const toggleWorldTag = (tag: string) => {
    setWorldForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  };

  const handleAddCustomWorldTag = () => {
    const cleanTag = newWorldTagInput.trim();
    if (cleanTag && !worldForm.tags.includes(cleanTag)) {
      setWorldForm((prev) => ({
        ...prev,
        tags: [...prev.tags, cleanTag],
      }));
      setNewWorldTagInput('');
    }
  };

  // ─── Persona Handlers ──────────────────────────────────────────────────────
  const handleOpenCreatePersona = () => {
    setIsCreatingPersona(true);
    setEditingPersona(null);
    setPersonaForm({
      name: '',
      avatar_url: QUICK_AVATARS[0],
      description: '',
    });
  };

  const handleOpenEditPersona = (persona: Persona) => {
    setEditingPersona(persona);
    setIsCreatingPersona(false);
    setPersonaForm({
      name: persona.name,
      avatar_url: persona.avatar_url || QUICK_AVATARS[0],
      description: persona.description || '',
    });
  };

  const handleSavePersona = async () => {
    if (!personaForm.name.trim()) return;
    setIsSavingPersona(true);
    try {
      if (isCreatingPersona) {
        await addPersona({
          name: personaForm.name.trim(),
          avatar_url: personaForm.avatar_url.trim() || QUICK_AVATARS[0],
          description: personaForm.description.trim(),
          is_default: personas.length === 0,
        });
        setIsCreatingPersona(false);
      } else if (editingPersona) {
        await updatePersona(editingPersona.id, {
          name: personaForm.name.trim(),
          avatar_url: personaForm.avatar_url.trim(),
          description: personaForm.description.trim(),
        });
        setEditingPersona(null);
      }
    } finally {
      setIsSavingPersona(false);
    }
  };

  const handleConfirmDeletePersona = async () => {
    if (!deletingPersona) return;
    await deletePersona(deletingPersona.id);
    setDeletingPersona(null);
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#09090b] text-zinc-100">
      {/* ─── Sticky Console Header ─────────────────────────────────────────── */}
      <div className="border-b border-[#27272a] bg-[#121214]/90 backdrop-blur-md sticky top-0 z-20 p-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-md">
              <Shield className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">Dev Studio & Lore Console</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Unified Manager
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Inspect, edit, and manage characters, worlds, and player personas from a single console.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveView('gallery')}
              className="px-4 py-2 rounded-xl bg-[#1e1e24] hover:bg-[#27272a] text-xs font-semibold text-zinc-300 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Back to Discover</span>
            </button>
          </div>
        </div>

        {/* Domain Switcher Tabs */}
        <div className="max-w-6xl mx-auto mt-6 flex items-center gap-2 border-b border-[#27272a]/60 pb-1">
          <button
            type="button"
            onClick={() => {
              setDomainTab('characters');
              setSearch('');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              domainTab === 'characters'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Characters ({characters.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDomainTab('worlds');
              setSearch('');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              domainTab === 'worlds'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>Worlds & Lore ({worlds.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDomainTab('personas');
              setSearch('');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              domainTab === 'personas'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]'
            }`}
          >
            <UserCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Personas ({personas.length})</span>
          </button>
        </div>
      </div>

      {/* ─── Main Content Body ─────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto w-full p-6 space-y-6">
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* DOMAIN 1: CHARACTERS & COMPANIONS                                   */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {domainTab === 'characters' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search companions by name, tagline, tags..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] focus:border-amber-500/50 text-xs text-zinc-200 placeholder-zinc-500 outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-[#18181b] rounded-xl border border-[#27272a] self-stretch sm:self-auto">
                <button
                  type="button"
                  onClick={() => setCharFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    charFilter === 'all'
                      ? 'bg-amber-500/20 text-amber-300 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  All ({characters.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCharFilter('visible')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    charFilter === 'visible'
                      ? 'bg-emerald-500/20 text-emerald-300 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>Visible ({visibleCharCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCharFilter('hidden')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    charFilter === 'hidden'
                      ? 'bg-zinc-800 text-zinc-200 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <EyeOff className="w-3 h-3" />
                  <span>Hidden ({hiddenCharCount})</span>
                </button>
              </div>
            </div>

            {/* Characters Table */}
            <div className="rounded-2xl border border-[#27272a] bg-[#121214] overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#27272a] bg-[#18181b]/60 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Companion</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Tags</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272a]/60 text-xs">
                    {filteredCharacters.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-zinc-500">
                          No character cards found matching your filter.
                        </td>
                      </tr>
                    ) : (
                      filteredCharacters.map((char) => {
                        const isHidden = Boolean(char.is_hidden);
                        return (
                          <tr key={char.id} className="hover:bg-[#18181b]/50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={char.avatar_url}
                                  alt={char.name}
                                  className="w-10 h-10 rounded-xl object-cover ring-1 ring-[#3f3f46] shrink-0"
                                />
                                <div className="min-w-0">
                                  <span className="font-bold text-zinc-200 block truncate max-w-xs">
                                    {char.name}
                                  </span>
                                  <span className="text-[11px] text-zinc-400 block truncate max-w-xs">
                                    {char.tagline || 'No tagline specified'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              {isHidden ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                                  <EyeOff className="w-3 h-3" />
                                  <span>Hidden</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  <Eye className="w-3 h-3" />
                                  <span>Visible</span>
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {(char.tags || []).slice(0, 3).map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-2 py-0.5 rounded-md text-[10px] bg-[#27272a] text-zinc-300 font-medium"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {(char.tags || []).length > 3 && (
                                  <span className="text-[10px] text-zinc-500 self-center">
                                    +{(char.tags || []).length - 3}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleStartChat(char)}
                                  title="Start Roleplay Session"
                                  className="p-2 rounded-lg bg-[#27272a] hover:bg-blue-600/20 hover:text-blue-400 text-zinc-300 transition-colors"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditChar(char)}
                                  title="Edit Character Lore & Prompts"
                                  className="p-2 rounded-lg bg-[#27272a] hover:bg-amber-500/20 hover:text-amber-300 text-zinc-300 transition-colors"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleCharacterVisibility(char.id)}
                                  title={isHidden ? 'Make Public in Discover' : 'Hide from Discover Gallery'}
                                  className={`p-2 rounded-lg transition-colors ${
                                    isHidden
                                      ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                                      : 'bg-[#27272a] hover:bg-zinc-700 text-zinc-300'
                                  }`}
                                >
                                  {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  disabled={exportingCharId === char.id}
                                  onClick={() => handleExportPng(char)}
                                  title="Export Renoog V2 PNG Card"
                                  className="p-2 rounded-lg bg-[#27272a] hover:bg-indigo-600/20 hover:text-indigo-300 text-zinc-300 transition-colors disabled:opacity-50"
                                >
                                  {exportingCharId === char.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Download className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingChar(char)}
                                  title="Delete Character Card"
                                  className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* DOMAIN 2: WORLDS & LOREBOOKS                                        */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {domainTab === 'worlds' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search worlds by name, genre, lore directives..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] focus:border-indigo-500/50 text-xs text-zinc-200 placeholder-zinc-500 outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                <div className="flex items-center gap-1.5 p-1 bg-[#18181b] rounded-xl border border-[#27272a]">
                  <button
                    type="button"
                    onClick={() => setWorldFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      worldFilter === 'all'
                        ? 'bg-indigo-500/20 text-indigo-300 shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    All ({worlds.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorldFilter('custom')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      worldFilter === 'custom'
                        ? 'bg-indigo-500/20 text-indigo-300 shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Custom ({customWorldCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorldFilter('builtin')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      worldFilter === 'builtin'
                        ? 'bg-indigo-500/20 text-indigo-300 shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Built-in ({builtinWorldCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorldFilter('starred')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                      worldFilter === 'starred'
                        ? 'bg-amber-500/20 text-amber-300 shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>Starred ({starredWorldCount})</span>
                  </button>
                </div>

                {onCreateNewWorld && (
                  <button
                    type="button"
                    onClick={onCreateNewWorld}
                    className="px-4 py-2.5 rounded-xl bg-linear-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-xs font-semibold text-white shadow-md transition-all flex items-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create World</span>
                  </button>
                )}
              </div>
            </div>

            {/* Worlds Matrix */}
            <div className="space-y-4">
              {filteredWorlds.length === 0 ? (
                <div className="rounded-2xl border border-[#27272a] bg-[#121214] p-12 text-center text-zinc-500">
                  No worlds found matching your filter criteria.
                </div>
              ) : (
                filteredWorlds.map((world) => {
                  const isFav = favoriteWorldIds.includes(world.id);
                  const isCustom = Boolean(world.is_custom);
                  const chambersCount = world.starter_locations?.length || 0;
                  const loreCount = world.lorebook_entries?.length || 0;

                  return (
                    <div
                      key={world.id}
                      className="rounded-2xl border border-[#27272a] bg-[#121214] p-5 shadow-lg hover:border-[#3f3f46] transition-all space-y-4"
                    >
                      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <img
                            src={world.banner_url || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300'}
                            alt={world.name}
                            className="w-20 h-20 rounded-xl object-cover ring-1 ring-[#3f3f46] shrink-0"
                          />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-bold text-white">{world.name}</h3>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                {world.genre}
                              </span>
                              {isCustom ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                  Custom Realm
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                                  Built-in Preset
                                </span>
                              )}
                              {isFav && (
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-400 flex items-center gap-1 border border-amber-500/20">
                                  <Star className="w-2.5 h-2.5 fill-amber-400" />
                                  <span>Starred</span>
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-400 line-clamp-2 max-w-2xl">
                              {world.tagline || world.description}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end md:self-start shrink-0">
                          {/* Quick Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditWorld(world)}
                            className="px-3 py-1.5 rounded-xl bg-[#27272a] hover:bg-amber-500/20 hover:text-amber-300 text-zinc-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{isCustom ? 'Edit Lore' : 'Inspect Lore'}</span>
                          </button>

                          {/* Full Studio Deep Link */}
                          {onEditWorldInStudio && (
                            <button
                              type="button"
                              onClick={() => onEditWorldInStudio(world.id)}
                              className="px-3 py-1.5 rounded-xl bg-[#27272a] hover:bg-indigo-500/20 hover:text-indigo-300 text-zinc-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Rooms & Studio</span>
                            </button>
                          )}

                          {/* Fork Preset (if built-in) */}
                          {!isCustom && (
                            <button
                              type="button"
                              onClick={() => handleForkWorld(world)}
                              title="Fork into a custom realm to edit"
                              className="p-2 rounded-xl bg-[#27272a] hover:bg-emerald-500/20 hover:text-emerald-300 text-zinc-300 transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Export JSON */}
                          <button
                            type="button"
                            onClick={() => handleExportWorld(world)}
                            title="Export World Lore as JSON"
                            className="p-2 rounded-xl bg-[#27272a] hover:bg-blue-500/20 hover:text-blue-300 text-zinc-300 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Star Toggle */}
                          <button
                            type="button"
                            onClick={() => toggleFavoriteWorld(world.id)}
                            title={isFav ? 'Remove from Starred' : 'Add to Starred'}
                            className={`p-2 rounded-xl transition-colors ${
                              isFav
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-[#27272a] hover:bg-zinc-700 text-zinc-400'
                            }`}
                          >
                            <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400' : ''}`} />
                          </button>

                          {/* Delete (custom only) */}
                          {isCustom ? (
                            <button
                              type="button"
                              onClick={() => setDeletingWorld(world)}
                              title="Delete Custom World"
                              className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <div
                              title="Built-in presets are protected"
                              className="p-2 rounded-xl bg-zinc-900 text-zinc-600 cursor-not-allowed"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* World Metadata Snippets */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3 border-t border-[#27272a]/60 text-xs text-zinc-400">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500 font-semibold">Topology:</span>
                          <span className="text-zinc-300">{chambersCount} Chambers • {loreCount} Lore Entries</span>
                        </div>
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-zinc-500 font-semibold">Narrator:</span>
                          <span className="text-zinc-300 truncate">{world.narrator_tone || 'Standard'}</span>
                        </div>
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-zinc-500 font-semibold">Weather:</span>
                          <span className="text-zinc-300 truncate">{world.weather_cycle || 'Dynamic'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* DOMAIN 3: PERSONAS & IDENTITIES                                     */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {domainTab === 'personas' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search player personas by name, description..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] focus:border-emerald-500/50 text-xs text-zinc-200 placeholder-zinc-500 outline-none transition-all"
                />
              </div>

              <button
                type="button"
                onClick={handleOpenCreatePersona}
                className="px-4 py-2.5 rounded-xl bg-linear-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-xs font-semibold text-white shadow-md transition-all flex items-center gap-1.5 self-stretch sm:self-auto justify-center"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Persona</span>
              </button>
            </div>

            {/* Personas Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPersonas.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-[#27272a] bg-[#121214] p-12 text-center text-zinc-500">
                  No player personas found. Click "New Persona" to create your first roleplay identity!
                </div>
              ) : (
                filteredPersonas.map((persona) => {
                  const isActive = persona.id === activePersonaId;

                  return (
                    <div
                      key={persona.id}
                      className={`rounded-2xl border p-5 transition-all space-y-4 ${
                        isActive
                          ? 'border-emerald-500/40 bg-emerald-500/5 shadow-lg shadow-emerald-500/5'
                          : 'border-[#27272a] bg-[#121214] hover:border-[#3f3f46]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={persona.avatar_url || QUICK_AVATARS[0]}
                            alt={persona.name}
                            className={`w-12 h-12 rounded-xl object-cover shrink-0 ring-2 ${
                              isActive ? 'ring-emerald-500' : 'ring-zinc-700'
                            }`}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-white">{persona.name}</h3>
                              {isActive && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  Active Persona
                                </span>
                              )}
                              {persona.is_default && !isActive && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-400 line-clamp-2 mt-1">
                              {persona.description || 'No backstory specified.'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Persona Actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-[#27272a]/60">
                        <button
                          type="button"
                          onClick={() => setActivePersona(persona.id)}
                          disabled={isActive}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                            isActive
                              ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
                              : 'bg-[#27272a] hover:bg-emerald-500/20 hover:text-emerald-300 text-zinc-300'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${isActive ? 'fill-emerald-400 text-emerald-400' : ''}`} />
                          <span>{isActive ? 'Active Identity' : 'Set as Active'}</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditPersona(persona)}
                            title="Edit Persona"
                            className="p-2 rounded-xl bg-[#27272a] hover:bg-amber-500/20 hover:text-amber-300 text-zinc-300 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingPersona(persona)}
                            title="Delete Persona"
                            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL 1: Character Lore & Prompt Editor ───────────────────────── */}
      {editingChar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#18181b] border border-[#27272a] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[#27272a]">
              <div className="flex items-center gap-3">
                <img
                  src={editingChar.avatar_url}
                  alt={editingChar.name}
                  className="w-10 h-10 rounded-xl object-cover ring-1 ring-amber-500/50 shrink-0"
                />
                <div>
                  <h3 className="text-base font-bold text-white">Edit Character Lore</h3>
                  <p className="text-xs text-zinc-400">Modify prompt layers, greeting, and visibility.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingChar(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272a] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Character Name</label>
                  <input
                    type="text"
                    value={charForm.name}
                    onChange={(e) => setCharForm({ ...charForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#121214] border border-[#27272a] focus:border-amber-500/50 text-zinc-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Tagline</label>
                  <input
                    type="text"
                    value={charForm.tagline}
                    onChange={(e) => setCharForm({ ...charForm, tagline: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#121214] border border-[#27272a] focus:border-amber-500/50 text-zinc-200 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Personality & Speech Style</label>
                <textarea
                  rows={3}
                  value={charForm.personality}
                  onChange={(e) => setCharForm({ ...charForm, personality: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#121214] border border-[#27272a] focus:border-amber-500/50 text-zinc-200 outline-none resize-y"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Scenario / Setting</label>
                <textarea
                  rows={2}
                  value={charForm.scenario}
                  onChange={(e) => setCharForm({ ...charForm, scenario: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#121214] border border-[#27272a] focus:border-amber-500/50 text-zinc-200 outline-none resize-y"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Opening Greeting (first_mes)</label>
                <textarea
                  rows={3}
                  value={charForm.first_mes}
                  onChange={(e) => setCharForm({ ...charForm, first_mes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#121214] border border-[#27272a] focus:border-amber-500/50 text-zinc-200 outline-none resize-y font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1.5">Genre & Archetype Tags</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {['Fantasy', 'Sci-Fi', 'Cyberpunk', 'Mystery', 'Magic', 'Adventure', 'Anime', 'Custom'].map(
                    (tag) => {
                      const isSelected = charForm.tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleCharTag(tag)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-[#27272a] text-zinc-400 hover:text-zinc-200 border border-transparent'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    }
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCharTagInput}
                    onChange={(e) => setNewCharTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomCharTag())}
                    placeholder="Add custom tag..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-[#121214] border border-[#27272a] text-zinc-200 text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomCharTag}
                    className="px-3 py-1.5 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-zinc-200 text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#121214] border border-[#27272a]">
                <input
                  type="checkbox"
                  id="edit_is_hidden"
                  checked={charForm.is_hidden}
                  onChange={(e) => setCharForm({ ...charForm, is_hidden: e.target.checked })}
                  className="rounded bg-zinc-800 border-zinc-700 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="edit_is_hidden" className="text-xs text-zinc-300 cursor-pointer">
                  <strong>Hide character from public Discover Gallery</strong> (only accessible in Dev Studio)
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-[#27272a] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingChar(null)}
                className="px-4 py-2 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-xs font-semibold text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingChar}
                onClick={handleSaveChar}
                className="px-5 py-2 rounded-xl bg-linear-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-xs font-semibold text-white transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSavingChar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: Full World Lore Editor ───────────────────────────────── */}
      {editingWorld && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-[#18181b] border border-[#27272a] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[#27272a]">
              <div className="flex items-center gap-3">
                <img
                  src={editingWorld.banner_url || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300'}
                  alt={editingWorld.name}
                  className="w-10 h-10 rounded-xl object-cover ring-1 ring-indigo-500/50 shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      {editingWorld.is_custom ? 'Edit World Lore' : 'Inspect Built-in Realm'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {editingWorld.genre}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    {editingWorld.is_custom
                      ? 'Modify narrative atmosphere, sensory palettes, and world rules.'
                      : 'Built-in preset: Saving will fork into your own editable custom realm.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingWorld(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272a] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">World Name</label>
                  <input
                    type="text"
                    value={worldForm.name}
                    onChange={(e) => setWorldForm({ ...worldForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#121214] border border-[#27272a] focus:border-indigo-500/50 text-zinc-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Genre</label>
                  <select
                    value={worldForm.genre}
                    onChange={(e) => setWorldForm({ ...worldForm, genre: e.target.value as WorldPreset['genre'] })}
                    className="w-full px-3 py-2 rounded-xl bg-[#121214] border border-[#27272a] focus:border-indigo-500/50 text-zinc-200 outline-none"
                  >
                    {WORLD_GENRES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Tagline</label>
                <input
                  type="text"
                  value={worldForm.tagline}
                  onChange={(e) => setWorldForm({ ...worldForm, tagline: e.target.value })}
                  placeholder="Short punchy premise..."
                  className="w-full px-3 py-2 rounded-xl bg-[#121214] border border-[#27272a] focus:border-indigo-500/50 text-zinc-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Description / Overview</label>
                <textarea
                  rows={3}
                  value={worldForm.description}
                  onChange={(e) => setWorldForm({ ...worldForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#121214] border border-[#27272a] focus:border-indigo-500/50 text-zinc-200 outline-none resize-y"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Banner Image URL</label>
                <input
                  type="text"
                  value={worldForm.banner_url}
                  onChange={(e) => setWorldForm({ ...worldForm, banner_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#121214] border border-[#27272a] focus:border-indigo-500/50 text-zinc-200 outline-none font-mono text-[11px]"
                />
              </div>

              {/* Narrator Directives & Atmosphere */}
              <div className="p-4 rounded-xl bg-[#121214] border border-[#27272a] space-y-3">
                <h4 className="font-bold text-zinc-200 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Stage 1 Narrator Directives & Atmosphere</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Narrator Tone</label>
                    <input
                      type="text"
                      value={worldForm.narrator_tone}
                      onChange={(e) => setWorldForm({ ...worldForm, narrator_tone: e.target.value })}
                      placeholder="e.g. Gritty noir, scholarly, whimsical..."
                      className="w-full px-3 py-2 rounded-xl bg-[#18181b] border border-[#27272a] text-zinc-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Sensory Palette</label>
                    <input
                      type="text"
                      value={worldForm.sensory_palette}
                      onChange={(e) => setWorldForm({ ...worldForm, sensory_palette: e.target.value })}
                      placeholder="e.g. Wet asphalt, ozone, glowing neon..."
                      className="w-full px-3 py-2 rounded-xl bg-[#18181b] border border-[#27272a] text-zinc-200 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Weather Cycle</label>
                    <input
                      type="text"
                      value={worldForm.weather_cycle}
                      onChange={(e) => setWorldForm({ ...worldForm, weather_cycle: e.target.value })}
                      placeholder="e.g. Persistent acid drizzle with smog..."
                      className="w-full px-3 py-2 rounded-xl bg-[#18181b] border border-[#27272a] text-zinc-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Physical / Arcane Rules</label>
                    <input
                      type="text"
                      value={worldForm.world_rules}
                      onChange={(e) => setWorldForm({ ...worldForm, world_rules: e.target.value })}
                      placeholder="e.g. Cyberware causes neural degradation..."
                      className="w-full px-3 py-2 rounded-xl bg-[#18181b] border border-[#27272a] text-zinc-200 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Factions & Taboos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Factions & Societal Hierarchy</label>
                  <textarea
                    rows={2}
                    value={worldForm.factions}
                    onChange={(e) => setWorldForm({ ...worldForm, factions: e.target.value })}
                    placeholder="Major factions controlling this realm..."
                    className="w-full px-3 py-2 rounded-xl bg-[#121214] border border-[#27272a] text-zinc-200 outline-none resize-y"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Cultural Taboos & Laws</label>
                  <textarea
                    rows={2}
                    value={worldForm.cultural_taboos}
                    onChange={(e) => setWorldForm({ ...worldForm, cultural_taboos: e.target.value })}
                    placeholder="Forbidden actions carrying consequences..."
                    className="w-full px-3 py-2 rounded-xl bg-[#121214] border border-[#27272a] text-zinc-200 outline-none resize-y"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-zinc-400 font-semibold mb-1.5">World & Keyword Tags</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {['High Fantasy', 'Dystopian', 'Hard Sci-Fi', 'Investigation', 'Survival', 'Grimdark'].map(
                    (tag) => {
                      const isSelected = worldForm.tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleWorldTag(tag)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : 'bg-[#27272a] text-zinc-400 hover:text-zinc-200 border border-transparent'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    }
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newWorldTagInput}
                    onChange={(e) => setNewWorldTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomWorldTag())}
                    placeholder="Add custom world tag..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-[#121214] border border-[#27272a] text-zinc-200 text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomWorldTag}
                    className="px-3 py-1.5 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-zinc-200 text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#27272a] flex items-center justify-between">
              {onEditWorldInStudio ? (
                <button
                  type="button"
                  onClick={() => {
                    const wid = editingWorld.id;
                    setEditingWorld(null);
                    onEditWorldInStudio(wid);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#27272a] hover:bg-indigo-500/20 hover:text-indigo-300 text-xs font-semibold text-zinc-300 transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Room Studio</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingWorld(null)}
                  className="px-4 py-2 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-xs font-semibold text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingWorld}
                  onClick={handleSaveWorld}
                  className="px-5 py-2 rounded-xl bg-linear-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-xs font-semibold text-white transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingWorld ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{editingWorld.is_custom ? 'Save Changes' : 'Save as Custom Fork'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: Persona Editor & Creator ─────────────────────────────── */}
      {(editingPersona || isCreatingPersona) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#18181b] border border-[#27272a] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[#27272a]">
              <div className="flex items-center gap-3">
                <img
                  src={personaForm.avatar_url || QUICK_AVATARS[0]}
                  alt="Persona Avatar"
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-emerald-500/50 shrink-0"
                />
                <div>
                  <h3 className="text-base font-bold text-white">
                    {isCreatingPersona ? 'Create Player Persona' : 'Edit Player Persona'}
                  </h3>
                  <p className="text-xs text-zinc-400">Configure your personal roleplay identity.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingPersona(null);
                  setIsCreatingPersona(false);
                }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272a] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Persona / Character Name</label>
                <input
                  type="text"
                  value={personaForm.name}
                  onChange={(e) => setPersonaForm({ ...personaForm, name: e.target.value })}
                  placeholder="e.g. Dale Ross, Rowan Vance..."
                  className="w-full px-3 py-2 rounded-xl bg-[#121214] border border-[#27272a] focus:border-emerald-500/50 text-zinc-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Avatar Preset or URL</label>
                <div className="flex items-center gap-2 mb-2">
                  {QUICK_AVATARS.map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setPersonaForm({ ...personaForm, avatar_url: url })}
                      className={`w-9 h-9 rounded-xl overflow-hidden ring-2 transition-all shrink-0 ${
                        personaForm.avatar_url === url
                          ? 'ring-emerald-400 scale-105'
                          : 'ring-transparent hover:ring-zinc-600'
                      }`}
                    >
                      <img src={url} alt="Preset" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={personaForm.avatar_url}
                  onChange={(e) => setPersonaForm({ ...personaForm, avatar_url: e.target.value })}
                  placeholder="Custom avatar image URL..."
                  className="w-full px-3 py-2 rounded-xl bg-[#121214] border border-[#27272a] focus:border-emerald-500/50 text-zinc-200 outline-none font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Roleplay Description & Backstory</label>
                <textarea
                  rows={4}
                  value={personaForm.description}
                  onChange={(e) => setPersonaForm({ ...personaForm, description: e.target.value })}
                  placeholder="Describe your persona's appearance, personality, background, or equipment..."
                  className="w-full px-3 py-2 rounded-xl bg-[#121214] border border-[#27272a] focus:border-emerald-500/50 text-zinc-200 outline-none resize-y"
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#27272a] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingPersona(null);
                  setIsCreatingPersona(false);
                }}
                className="px-4 py-2 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-xs font-semibold text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingPersona || !personaForm.name.trim()}
                onClick={handleSavePersona}
                className="px-5 py-2 rounded-xl bg-linear-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-xs font-semibold text-white transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSavingPersona ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{isCreatingPersona ? 'Create Persona' : 'Save Persona'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal (Characters) ────────────────────────── */}
      {deletingChar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#18181b] border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Character Card</h3>
                <p className="text-xs text-zinc-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-zinc-200">{deletingChar.name}</strong>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingChar(null)}
                className="px-4 py-2 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-xs font-semibold text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingChar}
                onClick={handleConfirmDeleteChar}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingChar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal (Worlds) ─────────────────────────────── */}
      {deletingWorld && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#18181b] border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Custom Realm</h3>
                <p className="text-xs text-zinc-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Are you sure you want to permanently delete custom world <strong className="text-zinc-200">{deletingWorld.name}</strong>? All spatial chambers and lorebook entries will be removed.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingWorld(null)}
                className="px-4 py-2 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-xs font-semibold text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteWorld}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition-all shadow-md flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete World</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal (Personas) ───────────────────────────── */}
      {deletingPersona && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#18181b] border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Persona</h3>
                <p className="text-xs text-zinc-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Are you sure you want to permanently delete player persona <strong className="text-zinc-200">{deletingPersona.name}</strong>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPersona(null)}
                className="px-4 py-2 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-xs font-semibold text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePersona}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition-all shadow-md flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Persona</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
