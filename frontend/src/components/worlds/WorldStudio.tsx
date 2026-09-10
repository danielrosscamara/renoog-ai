import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Save,
  Download,
  Plus,
  Trash2,
  Globe,
  Compass,
  MapPin,
  Users,
  BookOpen,
  Sparkles,
  Shield,
  Volume2,
  Sun,
  Tag,
  AlertCircle,
  Check,
  Image as ImageIcon,
} from 'lucide-react';
import { useWorldStore } from '../../stores/useWorldStore';
import type { CreateWorldInput } from '../../stores/useWorldStore';
import type {
  WorldPreset,
  WorldLocationPreset,
  LorebookKeywordEntry,
  AmbientNpc,
} from '../../data/worldPresets';

export interface WorldStudioProps {
  /** Optional world ID if editing an existing custom world; if omitted, creates a new one */
  worldId?: string;
  /** Navigation callback to return to the world gallery */
  onBack: () => void;
  /** Callback fired after successfully saving the world, passing the created/updated world ID */
  onSaved: (worldId: string) => void;
}

type StudioTab = 'identity' | 'topology' | 'factions' | 'lorebook';

const GENRES: Array<WorldPreset['genre']> = [
  'Cyberpunk',
  'Fantasy',
  'Sci-Fi',
  'Gothic Noir',
  'Post-Apocalyptic',
  'Supernatural',
  'Steampunk',
  'Modern',
];

const SUGGESTED_TAGS = [
  'Cyberpunk',
  'High Fantasy',
  'Sci-Fi',
  'Ancient Ruins',
  'Space Exploration',
  'Mystery',
  'Underground',
  'Survival',
  'Dystopian',
  'Magic',
  'Noir',
  'Industrial',
];

const BANNER_PRESETS = [
  {
    name: 'Cyber Metropolis',
    url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1200&auto=format&fit=crop&q=80',
  },
  {
    name: 'Sunken Archive',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
  },
  {
    name: 'Deep Space',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
  },
  {
    name: 'Gothic Citadel',
    url: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?w=1200&auto=format&fit=crop&q=80',
  },
  {
    name: 'Neon Alley',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
  },
];

function generateLocalId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'loc_' + Math.random().toString(36).substring(2, 9);
}

export const WorldStudio: React.FC<WorldStudioProps> = ({
  worldId,
  onBack,
  onSaved,
}) => {
  const getWorldById = useWorldStore((s) => s.getWorldById);
  const createCustomWorld = useWorldStore((s) => s.createCustomWorld);
  const updateCustomWorld = useWorldStore((s) => s.updateCustomWorld);
  const exportWorldJson = useWorldStore((s) => s.exportWorldJson);

  const existingWorld = useMemo(() => {
    return worldId ? getWorldById(worldId) : undefined;
  }, [worldId, getWorldById]);

  // Tab State
  const [activeTab, setActiveTab] = useState<StudioTab>('identity');

  // Dimension 1: Identity & Core Theme
  const [name, setName] = useState<string>(existingWorld?.name ?? '');
  const [genre, setGenre] = useState<WorldPreset['genre']>(
    existingWorld?.genre ?? 'Fantasy'
  );
  const [tagline, setTagline] = useState<string>(existingWorld?.tagline ?? '');
  const [description, setDescription] = useState<string>(
    existingWorld?.description ?? ''
  );
  const [bannerUrl, setBannerUrl] = useState<string>(
    existingWorld?.banner_url ?? BANNER_PRESETS[0].url
  );
  const [tags, setTags] = useState<string[]>(
    existingWorld?.tags ?? ['Custom World', 'Immersion']
  );
  const [newTagInput, setNewTagInput] = useState<string>('');

  // Dimension 2: Narrator Directives & Atmosphere
  const [narratorTone, setNarratorTone] = useState<string>(
    existingWorld?.narrator_tone ?? ''
  );
  const [sensoryPalette, setSensoryPalette] = useState<string>(
    existingWorld?.sensory_palette ?? ''
  );
  const [weatherCycle, setWeatherCycle] = useState<string>(
    existingWorld?.weather_cycle ?? ''
  );
  const [worldRules, setWorldRules] = useState<string>(
    existingWorld?.world_rules ?? ''
  );

  // Dimension 3: Societal Landscape & Factions
  const [factions, setFactions] = useState<string>(existingWorld?.factions ?? '');
  const [culturalTaboos, setCulturalTaboos] = useState<string>(
    existingWorld?.cultural_taboos ?? ''
  );

  // Dimension 4: Spatial Topology & Rooms
  const [locations, setLocations] = useState<WorldLocationPreset[]>(() => {
    if (existingWorld?.starter_locations && existingWorld.starter_locations.length > 0) {
      return existingWorld.starter_locations;
    }
    const defaultId = generateLocalId();
    return [
      {
        id: defaultId,
        name: 'Central Concourse',
        room_type: 'hub',
        threat_level: 'safe',
        description:
          'A vibrant architectural focal point where travelers congregate beneath vaulted arches and ambient lighting.',
        ambient_sound: 'Echoes of distant footsteps, gentle water fountain murmurs.',
        ambient_lighting: 'Soft golden radiance cascading from high-arched skylights.',
        connected_location_ids: [],
        ambient_npcs: [],
      },
    ];
  });

  const [defaultLocationId, setDefaultLocationId] = useState<string>(() => {
    return existingWorld?.default_location_id ?? locations[0]?.id ?? '';
  });

  const [selectedLocationId, setSelectedLocationId] = useState<string>(() => {
    return locations[0]?.id ?? '';
  });

  // Dimension 5: Keyword Lorebook
  const [lorebookEntries, setLorebookEntries] = useState<LorebookKeywordEntry[]>(
    () => existingWorld?.lorebook_entries ?? []
  );

  // Status & Validation
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Currently Selected Location for the Editor
  const activeLocation = useMemo(() => {
    return (
      locations.find((loc) => loc.id === selectedLocationId) ?? locations[0]
    );
  }, [locations, selectedLocationId]);

  // Real-Time Estimated Token Weight
  const tokenEstimate = useMemo(() => {
    const textPool = [
      name,
      genre,
      tagline,
      description,
      narratorTone,
      sensoryPalette,
      weatherCycle,
      worldRules,
      factions,
      culturalTaboos,
      ...tags,
      ...locations.map(
        (l) =>
          `${l.name} ${l.description} ${l.ambient_sound ?? ''} ${l.ambient_lighting ?? ''} ${
            l.ambient_npcs?.map((n) => `${n.name} ${n.role} ${n.description}`).join(' ') ?? ''
          }`
      ),
      ...lorebookEntries.map((e) => `${e.keys.join(' ')} ${e.content}`),
    ].join(' ');

    return Math.ceil(textPool.trim().length / 3.8);
  }, [
    name,
    genre,
    tagline,
    description,
    narratorTone,
    sensoryPalette,
    weatherCycle,
    worldRules,
    factions,
    culturalTaboos,
    tags,
    locations,
    lorebookEntries,
  ]);

  // Tag Management
  const handleAddTag = (tagToAdd?: string) => {
    const candidate = (tagToAdd ?? newTagInput).trim();
    if (!candidate) return;
    if (!tags.includes(candidate)) {
      setTags([...tags, candidate]);
    }
    if (!tagToAdd) {
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Location Management
  const handleAddLocation = () => {
    const newId = generateLocalId();
    const newRoom: WorldLocationPreset = {
      id: newId,
      name: `Room ${locations.length + 1}`,
      room_type: 'hub',
      threat_level: 'neutral',
      description: 'A newly mapped chamber waiting for environmental details.',
      ambient_sound: '',
      ambient_lighting: '',
      connected_location_ids: selectedLocationId ? [selectedLocationId] : [],
      ambient_npcs: [],
    };

    setLocations([...locations, newRoom]);
    setSelectedLocationId(newId);
  };

  const handleDeleteLocation = (idToDelete: string) => {
    if (locations.length <= 1) {
      setValidationError('A world must have at least one starter location.');
      return;
    }

    const remaining = locations.filter((loc) => loc.id !== idToDelete);
    setLocations(remaining);

    // Clean up cross-references
    const cleaned = remaining.map((loc) => ({
      ...loc,
      connected_location_ids: loc.connected_location_ids?.filter(
        (id) => id !== idToDelete
      ),
    }));
    setLocations(cleaned);

    if (defaultLocationId === idToDelete) {
      setDefaultLocationId(remaining[0].id);
    }
    if (selectedLocationId === idToDelete) {
      setSelectedLocationId(remaining[0].id);
    }
  };

  const handleUpdateActiveLocation = (
    updates: Partial<WorldLocationPreset>
  ) => {
    if (!activeLocation) return;
    setLocations((prev) =>
      prev.map((loc) =>
        loc.id === activeLocation.id ? { ...loc, ...updates } : loc
      )
    );
  };

  const handleToggleRoomConnection = (otherRoomId: string) => {
    if (!activeLocation) return;
    const current = activeLocation.connected_location_ids ?? [];
    const updated = current.includes(otherRoomId)
      ? current.filter((id) => id !== otherRoomId)
      : [...current, otherRoomId];

    handleUpdateActiveLocation({ connected_location_ids: updated });
  };

  // Ambient NPC Management
  const handleAddNpcToActiveLocation = () => {
    if (!activeLocation) return;
    const newNpc: AmbientNpc = {
      id: generateLocalId(),
      name: 'New NPC',
      role: 'Inhabitant',
      description: 'An individual observed within this chamber.',
    };

    const updatedNpcs = [...(activeLocation.ambient_npcs ?? []), newNpc];
    handleUpdateActiveLocation({ ambient_npcs: updatedNpcs });
  };

  const handleUpdateNpcInActiveLocation = (
    npcId: string,
    updates: Partial<AmbientNpc>
  ) => {
    if (!activeLocation) return;
    const updatedNpcs = (activeLocation.ambient_npcs ?? []).map((npc) =>
      npc.id === npcId ? { ...npc, ...updates } : npc
    );
    handleUpdateActiveLocation({ ambient_npcs: updatedNpcs });
  };

  const handleDeleteNpcFromActiveLocation = (npcId: string) => {
    if (!activeLocation) return;
    const updatedNpcs = (activeLocation.ambient_npcs ?? []).filter(
      (npc) => npc.id !== npcId
    );
    handleUpdateActiveLocation({ ambient_npcs: updatedNpcs });
  };

  // Lorebook Management
  const handleAddLorebookEntry = () => {
    const newEntry: LorebookKeywordEntry = {
      id: generateLocalId(),
      keys: ['keyword'],
      content: 'Define detailed world information that triggers on these keywords.',
      enabled: true,
    };
    setLorebookEntries([...lorebookEntries, newEntry]);
  };

  const handleUpdateLorebookEntry = (
    entryId: string,
    updates: Partial<LorebookKeywordEntry>
  ) => {
    setLorebookEntries((prev) =>
      prev.map((entry) => (entry.id === entryId ? { ...entry, ...updates } : entry))
    );
  };

  const handleDeleteLorebookEntry = (entryId: string) => {
    setLorebookEntries((prev) => prev.filter((entry) => entry.id !== entryId));
  };

  // Save Validation & Persistence
  const handleSaveWorld = () => {
    setValidationError(null);

    if (!name.trim()) {
      setValidationError('Please specify a World Name before saving.');
      setActiveTab('identity');
      return;
    }

    if (!description.trim()) {
      setValidationError(
        'Please provide a World Lore description to establish the setting.'
      );
      setActiveTab('identity');
      return;
    }

    if (locations.length === 0) {
      setValidationError('Please configure at least one room in Spatial Topology.');
      setActiveTab('topology');
      return;
    }

    const payload: CreateWorldInput = {
      name: name.trim(),
      genre,
      tagline: tagline.trim(),
      description: description.trim(),
      banner_url: bannerUrl.trim() || BANNER_PRESETS[0].url,
      tags: tags.length > 0 ? tags : ['Custom World'],

      narrator_tone: narratorTone.trim() || undefined,
      sensory_palette: sensoryPalette.trim() || undefined,
      weather_cycle: weatherCycle.trim() || undefined,
      world_rules: worldRules.trim() || undefined,

      factions: factions.trim() || undefined,
      cultural_taboos: culturalTaboos.trim() || undefined,

      starter_locations: locations,
      default_location_id: defaultLocationId || locations[0].id,

      lorebook_entries: lorebookEntries,
    };

    let targetId = existingWorld?.id;

    if (existingWorld?.id && existingWorld.is_custom) {
      updateCustomWorld(existingWorld.id, payload);
    } else {
      const created = createCustomWorld(payload);
      targetId = created.id;
    }

    setSaveSuccess(true);
    setTimeout(() => {
      if (targetId) {
        onSaved(targetId);
      } else {
        onBack();
      }
    }, 400);
  };

  // JSON Export Handler
  const handleExportJson = () => {
    try {
      let jsonString: string;
      if (existingWorld?.id) {
        jsonString = exportWorldJson(existingWorld.id);
      } else {
        // Fallback: format current draft directly
        const draft = {
          name: name.trim() || 'Untitled World',
          genre,
          tagline,
          description,
          banner_url: bannerUrl,
          tags,
          narrator_tone: narratorTone,
          sensory_palette: sensoryPalette,
          weather_cycle: weatherCycle,
          world_rules: worldRules,
          factions,
          cultural_taboos: culturalTaboos,
          starter_locations: locations,
          default_location_id: defaultLocationId,
          lorebook_entries: lorebookEntries,
        };
        jsonString = JSON.stringify(draft, null, 2);
      }

      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (name.trim() || 'custom-world')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');
      a.download = `${safeName}-lorebook.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export world JSON:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0b0e] text-white overflow-hidden">
      {/* Studio Cockpit Top Header */}
      <header className="h-14 px-6 border-b border-[#27272a] bg-[#14151b]/80 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#222226] hover:bg-[#2c2c32] text-xs font-semibold text-zinc-300 hover:text-white transition-colors border border-[#2e2e36]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Worlds Gallery</span>
          </button>
          <div className="h-4 w-px bg-zinc-700 mx-1" />
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-violet-400" />
            <h1 className="text-sm font-bold text-white tracking-wide">
              World & Lorebook Studio
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/25 font-semibold">
              {existingWorld ? 'Edit Realm' : 'New Realm'}
            </span>
          </div>
        </div>

        {/* Header Action Bar */}
        <div className="flex items-center gap-3">
          {/* Real-time Token Weight Metric */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#1c1d25] border border-white/5 text-[11px] text-zinc-400">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>Lore Weight:</span>
            <span className="font-semibold text-white">~{tokenEstimate} tokens</span>
            <span className="text-zinc-500">/ 4,096</span>
          </div>

          <button
            type="button"
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#222226] hover:bg-[#2c2c32] text-xs font-semibold text-zinc-300 border border-[#2e2e36] transition-colors"
            title="Download world specification as portable JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export JSON</span>
          </button>

          <button
            type="button"
            onClick={handleSaveWorld}
            disabled={saveSuccess}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white transition-all shadow-md ${
              saveSuccess
                ? 'bg-emerald-600'
                : 'bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500'
            }`}
          >
            {saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Saved Realm!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save World</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Validation Error Banner */}
      {validationError && (
        <div className="px-6 py-2.5 bg-rose-500/10 border-b border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{validationError}</span>
          </div>
          <button
            type="button"
            onClick={() => setValidationError(null)}
            className="text-rose-400 hover:text-white text-[11px] underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 4-Dimension Navigation Tab Bar */}
      <nav className="px-6 py-2.5 bg-[#101117] border-b border-white/5 flex items-center gap-2 overflow-x-auto shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('identity')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'identity'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>1. Identity & Atmosphere</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('topology')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'topology'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>2. Spatial Topology & Rooms</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px]">
            {locations.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('factions')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'factions'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>3. Societies & Factions</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lorebook')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'lorebook'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>4. Keyword Lorebook</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px]">
            {lorebookEntries.length}
          </span>
        </button>
      </nav>

      {/* Main Studio Content Area */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* TAB 1: IDENTITY & ATMOSPHERE */}
          {activeTab === 'identity' && (
            <div className="space-y-6">
              {/* Primary World Info & Visual Card */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Columns: Core Form */}
                <div className="lg:col-span-2 space-y-4 bg-[#14151e] p-5 rounded-2xl border border-white/5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Realm Identification</span>
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">
                        World Name <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Neo-Veridia, Aethelgard, Outpost Kepler-9"
                        className="w-full px-3.5 py-2 rounded-xl bg-[#1b1c26] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">
                        Primary Genre
                      </label>
                      <select
                        value={genre}
                        onChange={(e) => setGenre(e.target.value as WorldPreset['genre'])}
                        className="w-full px-3 py-2 rounded-xl bg-[#1b1c26] border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500"
                      >
                        {GENRES.map((g) => (
                          <option key={g} value={g} className="bg-[#1b1c26]">
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">
                      Narrative Tagline (One-Liner Hook)
                    </label>
                    <input
                      type="text"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="e.g., A rain-drenched corporate metropolis where neon cuts through industrial smog."
                      className="w-full px-3.5 py-2 rounded-xl bg-[#1b1c26] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">
                      World Lore & Overview <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Deep historical overview, environmental conditions, and the foundational lore of this realm..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#1b1c26] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 resize-y leading-relaxed"
                    />
                  </div>

                  {/* Tag Management */}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Theme & Ambience Tags</span>
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        {tags.length} selected
                      </span>
                    </label>

                    {/* Active Tag Chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-medium"
                        >
                          <span>{t}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(t)}
                            className="hover:text-rose-400 ml-0.5"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>

                    {/* Add Custom Tag */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                        placeholder="Add custom tag (Press Enter)..."
                        className="flex-1 px-3 py-1.5 rounded-xl bg-[#1b1c26] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddTag()}
                        className="px-3 py-1.5 rounded-xl bg-[#232432] hover:bg-[#2b2c3d] text-xs font-semibold text-zinc-300 border border-white/5 transition-colors"
                      >
                        Add Tag
                      </button>
                    </div>

                    {/* Quick Suggested Tags */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      <span className="text-[10px] text-zinc-500 py-0.5 mr-1">
                        Suggestions:
                      </span>
                      {SUGGESTED_TAGS.filter((s) => !tags.includes(s)).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleAddTag(s)}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 border border-white/5 transition-colors"
                        >
                          + {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Banner Image & Visual Preview */}
                <div className="space-y-4 bg-[#14151e] p-5 rounded-2xl border border-white/5 flex flex-col">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Visual Header Banner</span>
                  </h2>

                  {/* Banner Preview Card */}
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/10 group">
                    <img
                      src={bannerUrl}
                      alt={name || 'World Banner'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = BANNER_PRESETS[0].url;
                      }}
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-2.5 left-3 right-3 pointer-events-none">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-violet-600 text-white shadow-sm">
                        {genre}
                      </span>
                      <h3 className="text-sm font-bold text-white mt-1 truncate">
                        {name || 'Untitled World'}
                      </h3>
                    </div>
                  </div>

                  {/* Banner URL Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">
                      Banner Image URL
                    </label>
                    <input
                      type="url"
                      value={bannerUrl}
                      onChange={(e) => setBannerUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded-xl bg-[#1b1c26] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  {/* Quick Preset Pickers */}
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[11px] text-zinc-400 font-medium">
                      Curated Atmospheric Presets:
                    </span>
                    <div className="grid grid-cols-1 gap-1.5">
                      {BANNER_PRESETS.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => setBannerUrl(p.url)}
                          className={`text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between border ${
                            bannerUrl === p.url
                              ? 'bg-violet-600/20 text-violet-300 border-violet-500/40 font-semibold'
                              : 'bg-[#1b1c26] text-zinc-400 hover:text-zinc-200 border-white/5 hover:border-white/15'
                          }`}
                        >
                          <span>{p.name}</span>
                          {bannerUrl === p.url && (
                            <Check className="w-3.5 h-3.5 text-violet-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stage 1 Narrator Atmosphere & Physical Directives */}
              <div className="bg-[#14151e] p-5 rounded-2xl border border-white/5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Stage 1 Narrator & Environmental Rules Engine</span>
                  </h2>
                  <span className="text-[11px] text-zinc-500">
                    Directs the global narrative tone and sensory texture
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-violet-400" />
                      <span>Narrator Tone & Prose Style</span>
                    </label>
                    <textarea
                      rows={3}
                      value={narratorTone}
                      onChange={(e) => setNarratorTone(e.target.value)}
                      placeholder="e.g., Hardboiled cyberpunk noir with visceral sensory focus on mechanical grinding and cold moisture. Gritty and cinematic."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#1b1c26] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 leading-relaxed"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span>Sensory Palette (Scents, Sounds, Lighting)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={sensoryPalette}
                      onChange={(e) => setSensoryPalette(e.target.value)}
                      placeholder="e.g., Scent: Ozone, wet asphalt. Audio: Muffled bass from club vents, rain sizzle. Lighting: High-contrast electric violet neon."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#1b1c26] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 leading-relaxed"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">
                      Weather & Atmospheric Cycle
                    </label>
                    <input
                      type="text"
                      value={weatherCycle}
                      onChange={(e) => setWeatherCycle(e.target.value)}
                      placeholder="e.g., Perpetual acid drizzle, 14°C, industrial overcast, heat lightning."
                      className="w-full px-3.5 py-2 rounded-xl bg-[#1b1c26] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-rose-400" />
                      <span>Universal Physical Rules & Taboos</span>
                    </label>
                    <input
                      type="text"
                      value={worldRules}
                      onChange={(e) => setWorldRules(e.target.value)}
                      placeholder="e.g., Neural cyberware is strictly illegal without corporate authorization. Permanent motor burnout on overload."
                      className="w-full px-3.5 py-2 rounded-xl bg-[#1b1c26] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SPATIAL TOPOLOGY & STARTER ROOMS */}
          {activeTab === 'topology' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (5 Cols): Room List */}
              <div className="lg:col-span-5 bg-[#14151e] p-4 rounded-2xl border border-white/5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-violet-400" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                      Mapped Rooms ({locations.length})
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddLocation}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Room</span>
                  </button>
                </div>

                {/* Rooms List */}
                <div className="space-y-2 max-h-145 overflow-y-auto pr-1">
                  {locations.map((loc) => {
                    const isSelected = loc.id === activeLocation?.id;
                    const isDefaultSpawn = loc.id === defaultLocationId;

                    return (
                      <div
                        key={loc.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedLocationId(loc.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setSelectedLocationId(loc.id);
                          }
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-violet-600/15 border-violet-500/50 shadow-md'
                            : 'bg-[#1a1b24] border-white/5 hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <MapPin
                              className={`w-4 h-4 shrink-0 ${
                                isSelected ? 'text-violet-400' : 'text-zinc-500'
                              }`}
                            />
                            <span className="text-xs font-bold text-white truncate">
                              {loc.name || 'Unnamed Room'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isDefaultSpawn && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                                ★ Spawn
                              </span>
                            )}
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                loc.room_type === 'danger'
                                  ? 'bg-rose-500/15 text-rose-300'
                                  : loc.room_type === 'transit'
                                  ? 'bg-blue-500/15 text-blue-300'
                                  : loc.room_type === 'private'
                                  ? 'bg-purple-500/15 text-purple-300'
                                  : 'bg-emerald-500/15 text-emerald-300'
                              }`}
                            >
                              {loc.room_type ?? 'hub'}
                            </span>
                          </div>
                        </div>

                        <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1.5">
                          {loc.description || 'No description recorded.'}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-2 pt-1.5 border-t border-white/5">
                          <span>
                            Threat: <b className="text-zinc-300 capitalize">{loc.threat_level ?? 'neutral'}</b>
                          </span>
                          <span>
                            NPCs: <b className="text-zinc-300">{loc.ambient_npcs?.length ?? 0}</b>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column (7 Cols): Active Room Detailed Editor */}
              {activeLocation && (
                <div className="lg:col-span-7 bg-[#14151e] p-5 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-violet-400">
                        Room Details
                      </span>
                      {activeLocation.id === defaultLocationId ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px] font-semibold border border-amber-500/30">
                          ★ Primary Spawn Hub
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDefaultLocationId(activeLocation.id)}
                          className="text-[10px] px-2 py-0.5 rounded bg-white/5 hover:bg-amber-500/20 text-zinc-400 hover:text-amber-300 border border-white/5 transition-colors"
                        >
                          Set as Spawn Hub
                        </button>
                      )}
                    </div>

                    {locations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteLocation(activeLocation.id)}
                        className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors"
                        title="Delete this room"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Room</span>
                      </button>
                    )}
                  </div>

                  {/* Room Name & Types */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">
                        Room Name
                      </label>
                      <input
                        type="text"
                        value={activeLocation.name}
                        onChange={(e) =>
                          handleUpdateActiveLocation({ name: e.target.value })
                        }
                        placeholder="e.g., The Rusty Anchor Dive Bar"
                        className="w-full px-3 py-2 rounded-xl bg-[#1b1c26] border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-300">
                          Type
                        </label>
                        <select
                          value={activeLocation.room_type ?? 'hub'}
                          onChange={(e) =>
                            handleUpdateActiveLocation({
                              room_type: e.target.value as WorldLocationPreset['room_type'],
                            })
                          }
                          className="w-full px-2.5 py-2 rounded-xl bg-[#1b1c26] border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500"
                        >
                          <option value="hub">Hub</option>
                          <option value="private">Private</option>
                          <option value="danger">Danger</option>
                          <option value="transit">Transit</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-300">
                          Threat Level
                        </label>
                        <select
                          value={activeLocation.threat_level ?? 'neutral'}
                          onChange={(e) =>
                            handleUpdateActiveLocation({
                              threat_level: e.target.value as WorldLocationPreset['threat_level'],
                            })
                          }
                          className="w-full px-2.5 py-2 rounded-xl bg-[#1b1c26] border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500"
                        >
                          <option value="safe">Safe</option>
                          <option value="neutral">Neutral</option>
                          <option value="hostile">Hostile</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Room Description */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">
                      Physical & Sensory Description
                    </label>
                    <textarea
                      rows={3}
                      value={activeLocation.description}
                      onChange={(e) =>
                        handleUpdateActiveLocation({ description: e.target.value })
                      }
                      placeholder="Describe what the character and user see, feel, and touch inside this room..."
                      className="w-full px-3.5 py-2 rounded-xl bg-[#1b1c26] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 resize-y leading-relaxed"
                    />
                  </div>

                  {/* Audio & Lighting */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Ambient Soundscape</span>
                      </label>
                      <input
                        type="text"
                        value={activeLocation.ambient_sound ?? ''}
                        onChange={(e) =>
                          handleUpdateActiveLocation({
                            ambient_sound: e.target.value,
                          })
                        }
                        placeholder="e.g., Muffled low-frequency bass, clinking ice"
                        className="w-full px-3 py-2 rounded-xl bg-[#1b1c26] border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                        <Sun className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Ambient Lighting</span>
                      </label>
                      <input
                        type="text"
                        value={activeLocation.ambient_lighting ?? ''}
                        onChange={(e) =>
                          handleUpdateActiveLocation({
                            ambient_lighting: e.target.value,
                          })
                        }
                        placeholder="e.g., Dim amber spotlights, green draft tap glow"
                        className="w-full px-3 py-2 rounded-xl bg-[#1b1c26] border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>

                  {/* Room Interconnectivity */}
                  {locations.length > 1 && (
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <label className="text-xs font-semibold text-zinc-300">
                        Doorways & Connected Locations:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {locations
                          .filter((l) => l.id !== activeLocation.id)
                          .map((other) => {
                            const isConnected =
                              activeLocation.connected_location_ids?.includes(
                                other.id
                              );
                            return (
                              <button
                                key={other.id}
                                type="button"
                                onClick={() => handleToggleRoomConnection(other.id)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                                  isConnected
                                    ? 'bg-violet-600/20 text-violet-300 border-violet-500/40'
                                    : 'bg-[#1b1c26] text-zinc-400 hover:text-zinc-200 border-white/5'
                                }`}
                              >
                                {isConnected ? (
                                  <Check className="w-3 h-3 text-violet-400" />
                                ) : (
                                  <span className="w-3 h-3 rounded-full border border-zinc-600" />
                                )}
                                <span>{other.name}</span>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Ambient NPCs Sub-Editor */}
                  <div className="space-y-3 pt-3 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-violet-400" />
                        <label className="text-xs font-bold text-white uppercase tracking-wider">
                          Ambient NPCs ({activeLocation.ambient_npcs?.length ?? 0})
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddNpcToActiveLocation}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add NPC</span>
                      </button>
                    </div>

                    {/* NPC List */}
                    <div className="space-y-2">
                      {(activeLocation.ambient_npcs ?? []).map((npc) => (
                        <div
                          key={npc.id}
                          className="p-3 rounded-xl bg-[#1b1c26] border border-white/5 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="grid grid-cols-2 gap-2 flex-1">
                              <input
                                type="text"
                                value={npc.name}
                                onChange={(e) =>
                                  handleUpdateNpcInActiveLocation(npc.id, {
                                    name: e.target.value,
                                  })
                                }
                                placeholder="NPC Name (e.g., Gorok)"
                                className="px-2.5 py-1 rounded-lg bg-[#232432] border border-white/5 text-xs text-white focus:outline-none focus:border-violet-500"
                              />
                              <input
                                type="text"
                                value={npc.role}
                                onChange={(e) =>
                                  handleUpdateNpcInActiveLocation(npc.id, {
                                    role: e.target.value,
                                  })
                                }
                                placeholder="Role (e.g., Barkeep)"
                                className="px-2.5 py-1 rounded-lg bg-[#232432] border border-white/5 text-xs text-white focus:outline-none focus:border-violet-500"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteNpcFromActiveLocation(npc.id)
                              }
                              className="text-zinc-500 hover:text-rose-400 transition-colors p-1"
                              title="Delete NPC"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <input
                            type="text"
                            value={npc.description}
                            onChange={(e) =>
                              handleUpdateNpcInActiveLocation(npc.id, {
                                description: e.target.value,
                              })
                            }
                            placeholder="Behavior & physical presence..."
                            className="w-full px-2.5 py-1 rounded-lg bg-[#232432] border border-white/5 text-xs text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SOCIETIES & FACTIONS */}
          {activeTab === 'factions' && (
            <div className="bg-[#14151e] p-6 rounded-2xl border border-white/5 space-y-6">
              <div className="pb-3 border-b border-white/5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>Societal Landscape & Cultural Dynamics</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Define the political tensions, competing factions, and unspoken
                  societal rules governing life in this world.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-200">
                    Factions & Conflicting Agendas
                  </label>
                  <textarea
                    rows={4}
                    value={factions}
                    onChange={(e) => setFactions(e.target.value)}
                    placeholder="e.g., Arasaka Security Division (Corporate Enforcers), Dockers 4th Ward Syndicate (Underground Smugglers), Neon Phantom Netrunner Collective..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1b1c26] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 leading-relaxed"
                  />
                  <span className="text-[11px] text-zinc-500">
                    Give the AI narrator social conflict to generate emergent encounters.
                  </span>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-semibold text-zinc-200">
                    Cultural Taboos & Unspoken Norms
                  </label>
                  <textarea
                    rows={3}
                    value={culturalTaboos}
                    onChange={(e) => setCulturalTaboos(e.target.value)}
                    placeholder="e.g., Openly broadcasting unencrypted neural feeds; wearing clean corporate attire in lower-tier alleys..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1b1c26] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 leading-relaxed"
                  />
                  <span className="text-[11px] text-zinc-500">
                    Behaviors that provoke immediate suspicion or hostility from locals.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: KEYWORD LOREBOOK */}
          {activeTab === 'lorebook' && (
            <div className="bg-[#14151e] p-6 rounded-2xl border border-white/5 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Dynamic Keyword Lorebook ({lorebookEntries.length})</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Selective lore entries injected into the AI context only when specific keywords appear in dialogue.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddLorebookEntry}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Lore Entry</span>
                </button>
              </div>

              {/* Entries List */}
              {lorebookEntries.length === 0 ? (
                <div className="py-12 text-center rounded-2xl border border-dashed border-white/10 space-y-3">
                  <BookOpen className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p className="text-xs text-zinc-400">
                    No selective lorebook entries added yet.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddLorebookEntry}
                    className="text-xs font-semibold text-violet-400 hover:text-violet-300 underline"
                  >
                    Create the first keyword entry
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {lorebookEntries.map((entry, index) => (
                    <div
                      key={entry.id}
                      className="p-4 rounded-xl bg-[#1b1c26] border border-white/5 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={entry.enabled ?? true}
                              onChange={(e) =>
                                handleUpdateLorebookEntry(entry.id, {
                                  enabled: e.target.checked,
                                })
                              }
                              className="rounded border-zinc-700 bg-zinc-800 text-violet-600 focus:ring-violet-500"
                            />
                            <span>Active</span>
                          </label>

                          <span className="text-zinc-600">|</span>

                          {/* Comma-separated keyword input */}
                          <div className="flex-1">
                            <input
                              type="text"
                              value={entry.keys.join(', ')}
                              onChange={(e) => {
                                const splitKeys = e.target.value
                                  .split(',')
                                  .map((k) => k.trim())
                                  .filter(Boolean);
                                handleUpdateLorebookEntry(entry.id, {
                                  keys: splitKeys,
                                });
                              }}
                              placeholder="Trigger keys: cyberdeck, ICE, netrunner (comma-separated)"
                              className="w-full px-3 py-1 rounded-lg bg-[#232432] border border-white/10 text-xs text-violet-300 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteLorebookEntry(entry.id)}
                          className="text-zinc-500 hover:text-rose-400 transition-colors p-1"
                          title="Delete entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <textarea
                        rows={2}
                        value={entry.content}
                        onChange={(e) =>
                          handleUpdateLorebookEntry(entry.id, {
                            content: e.target.value,
                          })
                        }
                        placeholder={`Lore content for Entry #${index + 1}...`}
                        className="w-full px-3 py-2 rounded-lg bg-[#232432] border border-white/5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 leading-relaxed"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
