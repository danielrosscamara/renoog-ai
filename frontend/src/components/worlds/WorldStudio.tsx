import React, { useState, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Save,
  Download,
  Upload,
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
  CloudRain,
  Scale,
  X,
  Search,
  FolderPlus,
  Layers,
} from 'lucide-react';
import { useWorldStore } from '../../stores/useWorldStore';
import type { CreateWorldInput } from '../../stores/useWorldStore';
import type {
  WorldPreset,
  WorldLocationPreset,
  LorebookKeywordEntry,
  AmbientNpc,
  WorldFaction,
} from '../../data/worldPresets';
import {
  STANDARD_GENRES,
  SUGGESTED_TAGS,
  BUILTIN_ATMOSPHERIC_PRESETS,
  loadCustomAtmosphericPresets,
  saveCustomAtmosphericPresetsToStorage,
} from '../../data/atmosphericPresets';
import type { AtmosphericPreset } from '../../data/atmosphericPresets';
import { LOREBOOK_STARTER_PACKS } from '../../data/lorebookStarterPacks';

export interface WorldStudioProps {
  /** Optional world ID if editing an existing custom world; if omitted, creates a new one */
  worldId?: string;
  /** Navigation callback to return to the world gallery */
  onBack: () => void;
  /** Callback fired after successfully saving the world, passing the created/updated world ID */
  onSaved: (worldId: string) => void;
}

type StudioTab = 'identity' | 'topology' | 'factions' | 'lorebook';

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
  const [genre, setGenre] = useState<string>(existingWorld?.genre ?? 'Fantasy');
  const [isCustomGenre, setIsCustomGenre] = useState<boolean>(() => {
    if (!existingWorld?.genre) return false;
    return !(STANDARD_GENRES as readonly string[]).includes(existingWorld.genre);
  });
  const [tagline, setTagline] = useState<string>(existingWorld?.tagline ?? '');
  const [description, setDescription] = useState<string>(
    existingWorld?.description ?? ''
  );
  const [bannerUrl, setBannerUrl] = useState<string>(
    existingWorld?.banner_url ?? BUILTIN_ATMOSPHERIC_PRESETS[0].banner_url
  );
  const [tags, setTags] = useState<string[]>(
    existingWorld?.tags ?? ['Custom World', 'Immersion']
  );
  const [newTagInput, setNewTagInput] = useState<string>('');

  // Dimension 2: Narrator Directives & Atmosphere
  const [narratorTone, setNarratorTone] = useState<string>(
    existingWorld?.narrator_tone ?? BUILTIN_ATMOSPHERIC_PRESETS[0].narrator_tone
  );
  const [sensoryPalette, setSensoryPalette] = useState<string>(
    existingWorld?.sensory_palette ?? BUILTIN_ATMOSPHERIC_PRESETS[0].sensory_palette
  );
  const [weatherCycle, setWeatherCycle] = useState<string>(
    existingWorld?.weather_cycle ?? BUILTIN_ATMOSPHERIC_PRESETS[0].weather_cycle
  );
  const [worldRules, setWorldRules] = useState<string>(
    existingWorld?.world_rules ?? BUILTIN_ATMOSPHERIC_PRESETS[0].world_rules
  );

  // Atmospheric Presets (Curated + User's Custom Presets)
  const [customAtmosphericPresets, setCustomAtmosphericPresets] = useState<AtmosphericPreset[]>(
    loadCustomAtmosphericPresets
  );
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [newCustomPresetName, setNewCustomPresetName] = useState('');

  // Dimension 3: Societal Landscape & Structured Factions
  const [factions, setFactions] = useState<string>(existingWorld?.factions ?? '');
  const [culturalTaboos, setCulturalTaboos] = useState<string>(
    existingWorld?.cultural_taboos ?? ''
  );
  const [factionsList, setFactionsList] = useState<WorldFaction[]>(() => {
    if (existingWorld?.factions_data && existingWorld.factions_data.length > 0) {
      return existingWorld.factions_data;
    }
    return [
      {
        id: generateLocalId(),
        name: 'Dominant Syndicate',
        agenda: 'Consolidate economic and territorial control over central transit corridors.',
        description: 'A coalition of influential brokers, security operatives, and local enforcers.',
        controlled_location_ids: [],
      },
    ];
  });

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

  // Dimension 5: Keyword Lorebook & Category Organization
  const [lorebookEntries, setLorebookEntries] = useState<LorebookKeywordEntry[]>(
    () => existingWorld?.lorebook_entries ?? []
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [lorebookSearchQuery, setLorebookSearchQuery] = useState<string>('');
  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const lorebookFileInputRef = useRef<HTMLInputElement>(null);

  // JSON Import Categorization Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [pendingImportEntries, setPendingImportEntries] = useState<LorebookKeywordEntry[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'new'>('merge');
  const [selectedExistingCategory, setSelectedExistingCategory] = useState<string>('General');
  const [newImportCategoryName, setNewImportCategoryName] = useState<string>('');

  // Status & Validation
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [lorebookNotification, setLorebookNotification] = useState<string | null>(null);

  // Currently Selected Location for the Editor
  const activeLocation = useMemo(() => {
    return (
      locations.find((loc) => loc.id === selectedLocationId) ?? locations[0]
    );
  }, [locations, selectedLocationId]);

  // Dynamic Existing Categories derived from Lorebook
  const existingCategories = useMemo(() => {
    const set = new Set<string>();
    lorebookEntries.forEach((e) => {
      const cat = e.category?.trim();
      if (cat) {
        set.add(cat);
      }
    });
    if (set.size === 0) {
      set.add('General');
    }
    return Array.from(set);
  }, [lorebookEntries]);

  // Filtered Lorebook Entries by Category and Search
  const filteredLorebookEntries = useMemo(() => {
    return lorebookEntries.filter((entry) => {
      const entryCat = entry.category?.trim() || 'General';
      const matchesCategory =
        selectedCategory === 'All' || entryCat === selectedCategory;

      if (!matchesCategory) return false;

      if (!lorebookSearchQuery.trim()) return true;
      const q = lorebookSearchQuery.toLowerCase();
      const keysMatch = entry.keys.some((k) => k.toLowerCase().includes(q));
      const contentMatch = entry.content.toLowerCase().includes(q);
      const catMatch = entryCat.toLowerCase().includes(q);
      return keysMatch || contentMatch || catMatch;
    });
  }, [lorebookEntries, selectedCategory, lorebookSearchQuery]);

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
      ...factionsList.map((f) => `${f.name} ${f.agenda} ${f.description}`),
      ...tags,
      ...locations.map(
        (l) =>
          `${l.name} ${l.description} ${l.ambient_sound ?? ''} ${l.ambient_lighting ?? ''} ${
            l.ambient_npcs?.map((n) => `${n.name} ${n.role} ${n.description}`).join(' ') ?? ''
          }`
      ),
      ...lorebookEntries.map((e) => `${e.keys.join(' ')} ${e.content} ${e.category ?? ''}`),
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
    factionsList,
    tags,
    locations,
    lorebookEntries,
  ]);

  // Atmospheric Preset Application & Custom Preset Management
  const handleApplyAtmosphericPreset = (preset: AtmosphericPreset) => {
    setBannerUrl(preset.banner_url);
    setNarratorTone(preset.narrator_tone);
    setSensoryPalette(preset.sensory_palette);
    setWeatherCycle(preset.weather_cycle);
    setWorldRules(preset.world_rules);
  };

  const handleSaveCustomAtmosphericPreset = () => {
    const trimmedName = newCustomPresetName.trim();
    if (!trimmedName) return;

    const newPreset: AtmosphericPreset = {
      id: `custom_atmo_${Date.now()}`,
      name: trimmedName,
      genre: (genre as WorldPreset['genre']) || 'Fantasy',
      banner_url: bannerUrl,
      narrator_tone: narratorTone,
      sensory_palette: sensoryPalette,
      weather_cycle: weatherCycle,
      world_rules: worldRules,
      is_custom: true,
    };

    const updated = [...customAtmosphericPresets, newPreset];
    setCustomAtmosphericPresets(updated);
    saveCustomAtmosphericPresetsToStorage(updated);
    setShowSavePresetModal(false);
    setNewCustomPresetName('');
  };

  const handleDeleteCustomAtmosphericPreset = (presetId: string) => {
    const updated = customAtmosphericPresets.filter((p) => p.id !== presetId);
    setCustomAtmosphericPresets(updated);
    saveCustomAtmosphericPresetsToStorage(updated);
  };

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

    let updatedLocations = [...locations, newRoom];
    if (selectedLocationId) {
      updatedLocations = updatedLocations.map((loc) =>
        loc.id === selectedLocationId
          ? {
              ...loc,
              connected_location_ids: [...(loc.connected_location_ids ?? []), newId],
            }
          : loc
      );
    }

    setLocations(updatedLocations);
    setSelectedLocationId(newId);
  };

  const handleDeleteLocation = (idToDelete: string) => {
    if (locations.length <= 1) {
      setValidationError('A world must have at least one starter location.');
      return;
    }

    const remaining = locations.filter((loc) => loc.id !== idToDelete);
    const cleaned = remaining.map((loc) => ({
      ...loc,
      connected_location_ids: loc.connected_location_ids?.filter(
        (id) => id !== idToDelete
      ),
    }));
    setLocations(cleaned);

    setFactionsList((prev) =>
      prev.map((f) => ({
        ...f,
        controlled_location_ids: (f.controlled_location_ids ?? []).filter(
          (locId) => locId !== idToDelete
        ),
      }))
    );

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

  // Dynamic Bidirectional Doorways Passages (Fix for Bug #5)
  const handleToggleRoomConnection = (otherRoomId: string) => {
    if (!activeLocation) return;
    const isCurrentlyConnected = (activeLocation.connected_location_ids ?? []).includes(
      otherRoomId
    );

    setLocations((prev) =>
      prev.map((loc) => {
        if (loc.id === activeLocation.id) {
          const current = loc.connected_location_ids ?? [];
          return {
            ...loc,
            connected_location_ids: isCurrentlyConnected
              ? current.filter((id) => id !== otherRoomId)
              : [...current, otherRoomId],
          };
        }
        if (loc.id === otherRoomId) {
          const current = loc.connected_location_ids ?? [];
          return {
            ...loc,
            connected_location_ids: isCurrentlyConnected
              ? current.filter((id) => id !== activeLocation.id)
              : [...current, activeLocation.id],
          };
        }
        return loc;
      })
    );
  };

  // Ambient NPC Management (Fix for Bug #4: Empty Initializer)
  const handleAddNpcToActiveLocation = () => {
    if (!activeLocation) return;
    const newNpc: AmbientNpc = {
      id: generateLocalId(),
      name: '',
      role: '',
      description: '',
      faction_id: activeLocation.controlling_faction_id || undefined,
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

  // Structured Factions Management (Fix for Item #6)
  const handleAddFaction = () => {
    const newFaction: WorldFaction = {
      id: generateLocalId(),
      name: '',
      agenda: '',
      description: '',
      controlled_location_ids: [],
    };
    setFactionsList([...factionsList, newFaction]);
  };

  const handleUpdateFaction = (factionId: string, updates: Partial<WorldFaction>) => {
    setFactionsList((prev) =>
      prev.map((f) => (f.id === factionId ? { ...f, ...updates } : f))
    );
  };

  const handleDeleteFaction = (factionId: string) => {
    setFactionsList((prev) => prev.filter((f) => f.id !== factionId));
    setLocations((prev) =>
      prev.map((loc) =>
        loc.controlling_faction_id === factionId
          ? { ...loc, controlling_faction_id: undefined }
          : loc
      )
    );
  };

  const handleToggleFactionTerritory = (factionId: string, locationId: string) => {
    const targetFaction = factionsList.find((f) => f.id === factionId);
    if (!targetFaction) return;

    const isControlled = (targetFaction.controlled_location_ids ?? []).includes(locationId);

    setFactionsList((prev) =>
      prev.map((f) => {
        if (f.id === factionId) {
          const current = f.controlled_location_ids ?? [];
          return {
            ...f,
            controlled_location_ids: isControlled
              ? current.filter((id) => id !== locationId)
              : [...current, locationId],
          };
        }
        if (!isControlled) {
          return {
            ...f,
            controlled_location_ids: (f.controlled_location_ids ?? []).filter(
              (id) => id !== locationId
            ),
          };
        }
        return f;
      })
    );

    setLocations((prev) =>
      prev.map((loc) =>
        loc.id === locationId
          ? {
              ...loc,
              controlling_faction_id: isControlled ? undefined : factionId,
            }
          : loc
      )
    );
  };

  // Keyword Lorebook Management & Category Helpers
  const handleAddLorebookEntry = (initial?: { keys: string[]; content: string; category?: string }) => {
    const defaultCat =
      initial?.category ?? (selectedCategory === 'All' ? 'General' : selectedCategory);

    const newEntry: LorebookKeywordEntry = {
      id: generateLocalId(),
      keys: initial?.keys ?? ['new keyword'],
      content: initial?.content ?? '',
      category: defaultCat,
      enabled: true,
    };
    setLorebookEntries([...lorebookEntries, newEntry]);
  };

  const handleApplyStarterPack = (packType: 'cyberpunk' | 'fantasy' | 'scifi') => {
    const pack = LOREBOOK_STARTER_PACKS[packType];
    const newEntries: LorebookKeywordEntry[] = pack.map((item) => ({
      id: generateLocalId(),
      keys: item.keys,
      content: item.content,
      category: item.category,
      enabled: true,
    }));
    setLorebookEntries((prev) => [...prev, ...newEntries]);
    setLorebookNotification(`Added 3 starter lore entries from the ${packType.toUpperCase()} pack!`);
    setTimeout(() => setLorebookNotification(null), 3500);
  };

  const handleUpdateLorebookEntry = (
    entryId: string,
    updates: Partial<LorebookKeywordEntry>
  ) => {
    setLorebookEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, ...updates } : e))
    );
  };

  const handleDeleteLorebookEntry = (entryId: string) => {
    setLorebookEntries((prev) => prev.filter((e) => e.id !== entryId));
  };

  const handleCreateNewCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    setSelectedCategory(trimmed);
    setShowAddCategoryInput(false);
    setNewCategoryName('');
  };

  // Initial stage of JSON import: Parse file and open destination modal
  const handleInitiateImportLorebookJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        let importedList: Array<{ keys: string[] | string; content: string; category?: string }> = [];

        if (Array.isArray(parsed)) {
          importedList = parsed;
        } else if (parsed && Array.isArray(parsed.lorebook_entries)) {
          importedList = parsed.lorebook_entries;
        } else {
          throw new Error(
            'Expected an array of lore entries or an object with a "lorebook_entries" array.'
          );
        }

        const validEntries: LorebookKeywordEntry[] = [];
        for (const item of importedList) {
          if (!item.content || typeof item.content !== 'string') continue;
          let keys: string[] = [];
          if (Array.isArray(item.keys)) {
            keys = item.keys.map((k) => String(k).trim()).filter(Boolean);
          } else if (typeof item.keys === 'string') {
            keys = item.keys
              .split(',')
              .map((k) => k.trim())
              .filter(Boolean);
          }
          if (keys.length === 0) continue;

          validEntries.push({
            id: generateLocalId(),
            keys,
            content: item.content.trim(),
            category: item.category?.trim() || undefined,
            enabled: true,
          });
        }

        if (validEntries.length === 0) {
          setValidationError(
            'No valid lorebook entries found in JSON. Format: [{ "keys": ["term1", "term2"], "content": "..." }]'
          );
          return;
        }

        // Prepare modal data
        const safeBaseName = file.name.replace(/\.json$/i, '').replace(/[_-]+/g, ' ');
        setPendingImportEntries(validEntries);
        setImportFileName(file.name);
        setSelectedExistingCategory(existingCategories[0] || 'General');
        setNewImportCategoryName(safeBaseName || 'Imported Lore');
        setImportMode('merge');
        setShowImportModal(true);
      } catch (err) {
        setValidationError(
          `Failed to parse Lorebook JSON: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    };
    reader.readAsText(file);
  };

  // Final confirmation of JSON import with selected category
  const handleConfirmImportWithCategory = () => {
    const targetCategory =
      importMode === 'merge'
        ? selectedExistingCategory
        : newImportCategoryName.trim() || 'Imported Lore';

    const organizedEntries = pendingImportEntries.map((entry) => ({
      ...entry,
      category: targetCategory,
    }));

    setLorebookEntries((prev) => [...prev, ...organizedEntries]);
    setSelectedCategory(targetCategory);
    setShowImportModal(false);
    setPendingImportEntries([]);
    setLorebookNotification(
      `Successfully imported ${organizedEntries.length} entries into category "${targetCategory}"!`
    );
    setTimeout(() => setLorebookNotification(null), 3500);
  };

  // Validation & Save Routine
  const validateForm = (): boolean => {
    if (!name.trim()) {
      setValidationError('World Name is required.');
      setActiveTab('identity');
      return false;
    }
    if (!description.trim()) {
      setValidationError('World Overview Description is required.');
      setActiveTab('identity');
      return false;
    }
    if (locations.length === 0) {
      setValidationError('At least one starter location is required.');
      setActiveTab('topology');
      return false;
    }
    const emptyRoom = locations.find((l) => !l.name.trim());
    if (emptyRoom) {
      setValidationError('All locations must have a valid name.');
      setActiveTab('topology');
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleSaveWorld = () => {
    if (!validateForm()) return;

    const derivedFactionsSummary =
      factions.trim() ||
      factionsList
        .filter((f) => f.name.trim())
        .map((f) => `${f.name}: ${f.agenda || f.description}`)
        .join('; ');

    const draft: CreateWorldInput & { factions_data?: WorldFaction[] } = {
      name: name.trim(),
      genre: (genre.trim() || 'Fantasy') as WorldPreset['genre'],
      tagline: tagline.trim(),
      description: description.trim(),
      banner_url: bannerUrl.trim() || BUILTIN_ATMOSPHERIC_PRESETS[0].banner_url,
      tags: tags.length > 0 ? tags : ['Custom World'],
      narrator_tone: narratorTone.trim() || undefined,
      sensory_palette: sensoryPalette.trim() || undefined,
      weather_cycle: weatherCycle.trim() || undefined,
      world_rules: worldRules.trim() || undefined,
      factions: derivedFactionsSummary || undefined,
      cultural_taboos: culturalTaboos.trim() || undefined,
      starter_locations: locations,
      default_location_id: defaultLocationId || locations[0].id,
      lorebook_entries: lorebookEntries,
      factions_data: factionsList.filter((f) => f.name.trim().length > 0),
    };

    try {
      let savedWorldId = existingWorld?.id;
      if (existingWorld && existingWorld.is_custom) {
        updateCustomWorld(existingWorld.id, draft);
        savedWorldId = existingWorld.id;
      } else {
        const created = createCustomWorld(draft);
        savedWorldId = created.id;
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        if (savedWorldId) {
          onSaved(savedWorldId);
        }
      }, 700);
    } catch (err) {
      setValidationError(
        `Failed to save world: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  const handleExportJson = () => {
    try {
      let jsonString: string;
      if (existingWorld) {
        jsonString = exportWorldJson(existingWorld.id);
      } else {
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
          factions_data: factionsList,
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#222226] hover:bg-[#2c2c32] text-xs font-semibold text-zinc-300 hover:text-white transition-colors border border-[#2e2e36] cursor-pointer"
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#222226] hover:bg-[#2c2c32] text-xs font-semibold text-zinc-300 border border-[#2e2e36] transition-colors cursor-pointer"
            title="Download world specification as portable JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export JSON</span>
          </button>

          <button
            type="button"
            onClick={handleSaveWorld}
            disabled={saveSuccess}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white transition-all shadow-md cursor-pointer ${
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
            className="text-rose-400 hover:text-white text-[11px] underline ml-4 cursor-pointer"
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
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
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
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
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
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === 'factions'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>3. Societies & Factions</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px]">
            {factionsList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lorebook')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
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

                    {/* Genre Selection with Custom Genre Support */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                        <span>Primary Genre</span>
                        {isCustomGenre && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomGenre(false);
                              setGenre('Fantasy');
                            }}
                            className="text-[10px] text-violet-400 hover:text-violet-300 cursor-pointer"
                          >
                            Use Standard
                          </button>
                        )}
                      </label>
                      {isCustomGenre ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={genre}
                            onChange={(e) => setGenre(e.target.value)}
                            placeholder="e.g., Solarpunk, Space Western..."
                            className="w-full px-3.5 py-2 rounded-xl bg-[#1b1c26] border border-violet-500 text-xs text-white focus:outline-none"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <select
                          value={genre}
                          onChange={(e) => {
                            if (e.target.value === '__custom__') {
                              setIsCustomGenre(true);
                              setGenre('');
                            } else {
                              setGenre(e.target.value);
                            }
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-[#1b1c26] border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                        >
                          {STANDARD_GENRES.map((g) => (
                            <option key={g} value={g} className="bg-[#1b1c26]">
                              {g}
                            </option>
                          ))}
                          <option value="__custom__" className="bg-[#1b1c26] text-violet-300 font-semibold">
                            + Custom Genre...
                          </option>
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Narrative Tagline */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">
                      Narrative Tagline
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
                            className="hover:text-rose-400 ml-0.5 cursor-pointer"
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
                        className="px-3 py-1.5 rounded-xl bg-[#232432] hover:bg-[#2b2c3d] text-xs font-semibold text-zinc-300 border border-white/5 transition-colors cursor-pointer"
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
                          className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 border border-white/5 transition-colors cursor-pointer"
                        >
                          + {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Banner Image & Atmospheric Presets */}
                <div className="space-y-4 bg-[#14151e] p-5 rounded-2xl border border-white/5 flex flex-col">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Visual Header Banner</span>
                    </h2>
                    <span className="text-[10px] text-zinc-500">Preview</span>
                  </div>

                  {/* Banner Preview Card */}
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/10 group">
                    <img
                      src={bannerUrl}
                      alt={name || 'World Banner'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          BUILTIN_ATMOSPHERIC_PRESETS[0].banner_url;
                      }}
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-2.5 left-3 right-3 pointer-events-none">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-violet-600 text-white shadow-sm">
                        {genre || 'Custom'}
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

                  {/* Curated Atmospheric Presets */}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-zinc-300 font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-violet-400" />
                        <span>Curated Atmospheric Presets:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSavePresetModal(true)}
                        className="text-[10px] text-violet-400 hover:text-violet-300 font-semibold cursor-pointer underline"
                      >
                        + Save Current
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-500">
                      Applies complete sensory palettes, narrator tone, and environmental laws. You have total freedom to edit any field.
                    </p>

                    <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
                      {/* Built-in Presets */}
                      {BUILTIN_ATMOSPHERIC_PRESETS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleApplyAtmosphericPreset(p)}
                          className={`text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-center justify-between border cursor-pointer ${
                            bannerUrl === p.banner_url && narratorTone === p.narrator_tone
                              ? 'bg-violet-600/20 text-violet-300 border-violet-500/40 font-semibold'
                              : 'bg-[#1b1c26] text-zinc-400 hover:text-zinc-200 border-white/5 hover:border-white/15'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="truncate">{p.name}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-zinc-400">
                              {p.genre}
                            </span>
                          </div>
                          {bannerUrl === p.banner_url && narratorTone === p.narrator_tone && (
                            <Check className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                          )}
                        </button>
                      ))}

                      {/* Custom User-Created Presets */}
                      {customAtmosphericPresets.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs bg-[#1b1c26] border border-violet-500/20 group hover:border-violet-500/40"
                        >
                          <button
                            type="button"
                            onClick={() => handleApplyAtmosphericPreset(p)}
                            className="flex-1 text-left flex items-center gap-2 min-w-0 cursor-pointer text-violet-200 hover:text-white"
                          >
                            <span className="truncate">{p.name}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 font-semibold">
                              Custom
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomAtmosphericPreset(p.id)}
                            className="text-zinc-500 hover:text-rose-400 p-1 cursor-pointer"
                            title="Delete custom preset"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
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
                    <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <CloudRain className="w-3.5 h-3.5 text-sky-400" />
                      <span>Weather & Atmospheric Cycle</span>
                    </label>
                    <textarea
                      rows={2}
                      value={weatherCycle}
                      onChange={(e) => setWeatherCycle(e.target.value)}
                      placeholder="e.g., Constant industrial downpour, chemical acid mists, sudden electromagnetic squalls..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#1b1c26] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 leading-relaxed"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Physical Laws & World Rules</span>
                    </label>
                    <textarea
                      rows={2}
                      value={worldRules}
                      onChange={(e) => setWorldRules(e.target.value)}
                      placeholder="e.g., Cybernetic augmentations require neural stabilizers; unregistered firearms carry an instant corporate death warrant..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#1b1c26] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SPATIAL TOPOLOGY & ROOMS */}
          {activeTab === 'topology' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Location List Navigator */}
              <div className="space-y-3 bg-[#14151e] p-4 rounded-2xl border border-white/5">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <div className="flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-violet-400" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                      Rooms ({locations.length})
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddLocation}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Room</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {locations.map((loc) => {
                    const isSelected = loc.id === activeLocation.id;
                    const isDefault = loc.id === defaultLocationId;
                    const controllingFaction = factionsList.find(
                      (f) => f.id === loc.controlling_faction_id
                    );

                    return (
                      <div
                        key={loc.id}
                        onClick={() => setSelectedLocationId(loc.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-violet-600/15 border-violet-500/40 text-white shadow-sm'
                            : 'bg-[#1b1c26] border-white/5 text-zinc-400 hover:text-zinc-200 hover:border-white/15'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <MapPin
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isSelected ? 'text-violet-400' : 'text-zinc-500'
                              }`}
                            />
                            <h3 className="text-xs font-bold truncate">
                              {loc.name || 'Unnamed Room'}
                            </h3>
                            {isDefault && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-semibold shrink-0">
                                Spawn Hub
                              </span>
                            )}
                          </div>
                          {controllingFaction && (
                            <p className="text-[10px] text-violet-300 truncate mt-0.5 flex items-center gap-1">
                              <Shield className="w-2.5 h-2.5 shrink-0" />
                              <span>{controllingFaction.name}</span>
                            </p>
                          )}
                          <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                            {loc.description || 'No description entered'}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLocation(loc.id);
                          }}
                          className="text-zinc-600 hover:text-rose-400 p-1 cursor-pointer transition-colors"
                          title="Delete room"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right 2 Columns: Active Room Editor */}
              {activeLocation && (
                <div className="lg:col-span-2 space-y-4 bg-[#14151e] p-5 rounded-2xl border border-white/5">
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-violet-400" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                        Room Details: {activeLocation.name}
                      </h2>
                    </div>
                    {defaultLocationId !== activeLocation.id && (
                      <button
                        type="button"
                        onClick={() => setDefaultLocationId(activeLocation.id)}
                        className="text-xs text-violet-400 hover:text-violet-300 underline cursor-pointer"
                      >
                        Set as Default Spawn Hub
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">
                        Room Name <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={activeLocation.name}
                        onChange={(e) =>
                          handleUpdateActiveLocation({ name: e.target.value })
                        }
                        placeholder="e.g., The Rusty Anchor, Neon Plaza"
                        className="w-full px-3.5 py-2 rounded-xl bg-[#1b1c26] border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500"
                      />
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
                        className="w-full px-2.5 py-2 rounded-xl bg-[#1b1c26] border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                      >
                        <option value="safe">Safe</option>
                        <option value="neutral">Neutral</option>
                        <option value="hostile">Hostile</option>
                      </select>
                    </div>
                  </div>

                  {/* Faction Territorial Control Link */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Controlling Faction (Territorial Influence)</span>
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        Which group holds sway here
                      </span>
                    </label>
                    <select
                      value={activeLocation.controlling_faction_id ?? ''}
                      onChange={(e) => {
                        const newFactionId = e.target.value || undefined;
                        handleUpdateActiveLocation({ controlling_faction_id: newFactionId });

                        setFactionsList((prev) =>
                          prev.map((f) => {
                            const isTarget = f.id === newFactionId;
                            const currentLocs = f.controlled_location_ids ?? [];
                            if (isTarget) {
                              return {
                                ...f,
                                controlled_location_ids: currentLocs.includes(activeLocation.id)
                                  ? currentLocs
                                  : [...currentLocs, activeLocation.id],
                              };
                            }
                            return {
                              ...f,
                              controlled_location_ids: currentLocs.filter(
                                (id) => id !== activeLocation.id
                              ),
                            };
                          })
                        );
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-[#1b1c26] border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                    >
                      <option value="">None / Independent Territory</option>
                      {factionsList
                        .filter((f) => f.name.trim().length > 0)
                        .map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                    </select>
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

                  {/* Dynamic Bidirectional Doorways & Passages */}
                  {locations.length > 1 && (
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-violet-400" />
                          <span>Doorways & Connected Passages (Bidirectional ⇄)</span>
                        </label>
                        <span className="text-[10px] text-zinc-400">
                          Characters and players can walk back and forth between connected rooms.
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {locations
                          .filter((l) => l.id !== activeLocation.id)
                          .map((other) => {
                            const isConnected = (
                              activeLocation.connected_location_ids ?? []
                            ).includes(other.id);
                            return (
                              <button
                                key={other.id}
                                type="button"
                                onClick={() => handleToggleRoomConnection(other.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
                                  isConnected
                                    ? 'bg-violet-600/25 text-violet-300 border-violet-500/50 shadow-sm'
                                    : 'bg-[#1b1c26] text-zinc-400 hover:text-zinc-200 border-white/5 hover:border-white/20'
                                }`}
                              >
                                {isConnected ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-violet-400" />
                                    <span className="font-semibold">
                                      {other.name} (⇄ Connected)
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3.5 h-3.5 text-zinc-500" />
                                    <span>{other.name}</span>
                                  </>
                                )}
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
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add NPC</span>
                      </button>
                    </div>

                    {/* NPC List */}
                    <div className="space-y-2.5">
                      {(activeLocation.ambient_npcs ?? []).length === 0 ? (
                        <p className="text-xs text-zinc-500 italic p-3 bg-[#1b1c26] rounded-xl border border-white/5">
                          No ambient NPCs in this room. Click "+ Add NPC" above to populate this location.
                        </p>
                      ) : (
                        (activeLocation.ambient_npcs ?? []).map((npc) => (
                          <div
                            key={npc.id}
                            className="p-3.5 rounded-xl bg-[#1b1c26] border border-white/5 space-y-2.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                                <input
                                  type="text"
                                  value={npc.name}
                                  onChange={(e) =>
                                    handleUpdateNpcInActiveLocation(npc.id, {
                                      name: e.target.value,
                                    })
                                  }
                                  placeholder="e.g., Gorok"
                                  className="px-2.5 py-1.5 rounded-lg bg-[#232432] border border-white/5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                                />
                                <input
                                  type="text"
                                  value={npc.role}
                                  onChange={(e) =>
                                    handleUpdateNpcInActiveLocation(npc.id, {
                                      role: e.target.value,
                                    })
                                  }
                                  placeholder="e.g., Cynical Barkeep"
                                  className="px-2.5 py-1.5 rounded-lg bg-[#232432] border border-white/5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                                />
                                <select
                                  value={npc.faction_id ?? ''}
                                  onChange={(e) =>
                                    handleUpdateNpcInActiveLocation(npc.id, {
                                      faction_id: e.target.value || undefined,
                                    })
                                  }
                                  className="px-2 py-1.5 rounded-lg bg-[#232432] border border-white/5 text-xs text-zinc-300 focus:outline-none focus:border-violet-500 cursor-pointer"
                                >
                                  <option value="">No Faction / Neutral</option>
                                  {factionsList
                                    .filter((f) => f.name.trim().length > 0)
                                    .map((f) => (
                                      <option key={f.id} value={f.id}>
                                        {f.name}
                                      </option>
                                    ))}
                                </select>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteNpcFromActiveLocation(npc.id)}
                                className="text-zinc-500 hover:text-rose-400 transition-colors p-1.5 cursor-pointer"
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
                              placeholder="e.g., A scarred veteran pouring drinks, watchful of corporate eavesdroppers."
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#232432] border border-white/5 text-xs text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SOCIETIES & FACTIONS */}
          {activeTab === 'factions' && (
            <div className="bg-[#14151e] p-6 rounded-2xl border border-white/5 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>Societies, Factions & Territorial Influence</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Define factions, their agendas, and which physical rooms they control across your spatial topology.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddFaction}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Faction</span>
                </button>
              </div>

              {/* Structured Factions List */}
              <div className="space-y-4">
                {factionsList.map((faction, fIdx) => (
                  <div
                    key={faction.id}
                    className="p-4 rounded-xl bg-[#1b1c26] border border-white/10 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="w-5 h-5 rounded-full bg-violet-600/30 border border-violet-500/50 flex items-center justify-center text-[10px] font-bold text-violet-300">
                          {fIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={faction.name}
                          onChange={(e) =>
                            handleUpdateFaction(faction.id, { name: e.target.value })
                          }
                          placeholder="Faction Name (e.g., Dockers 4th Ward Syndicate)"
                          className="flex-1 px-3 py-1.5 rounded-lg bg-[#232432] border border-white/10 text-xs text-white font-bold focus:outline-none focus:border-violet-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteFaction(faction.id)}
                        className="text-zinc-500 hover:text-rose-400 p-1 cursor-pointer"
                        title="Delete faction"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-zinc-300">
                          Agenda / Objective
                        </label>
                        <input
                          type="text"
                          value={faction.agenda}
                          onChange={(e) =>
                            handleUpdateFaction(faction.id, { agenda: e.target.value })
                          }
                          placeholder="e.g., Monopolize smuggling routes and resist police raids"
                          className="w-full px-3 py-1.5 rounded-lg bg-[#232432] border border-white/5 text-xs text-zinc-300 focus:outline-none focus:border-violet-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-zinc-300">
                          Description / Alignment
                        </label>
                        <input
                          type="text"
                          value={faction.description}
                          onChange={(e) =>
                            handleUpdateFaction(faction.id, { description: e.target.value })
                          }
                          placeholder="e.g., Blue-collar cyber-augmented dockworkers"
                          className="w-full px-3 py-1.5 rounded-lg bg-[#232432] border border-white/5 text-xs text-zinc-300 focus:outline-none focus:border-violet-500"
                        />
                      </div>
                    </div>

                    {/* Controlled Rooms / Territories Selector */}
                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                      <label className="text-[11px] font-semibold text-zinc-300 flex items-center justify-between">
                        <span>Controlled Territories & Rooms:</span>
                        <span className="text-[10px] text-zinc-500">
                          {(faction.controlled_location_ids ?? []).length} rooms controlled
                        </span>
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {locations.map((loc) => {
                          const isClaimed = (
                            faction.controlled_location_ids ?? []
                          ).includes(loc.id);
                          return (
                            <button
                              key={loc.id}
                              type="button"
                              onClick={() => handleToggleFactionTerritory(faction.id, loc.id)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
                                isClaimed
                                  ? 'bg-violet-600/25 text-violet-300 border-violet-500/50 shadow-sm'
                                  : 'bg-[#232432] text-zinc-400 hover:text-zinc-200 border-white/5'
                              }`}
                            >
                              <MapPin className="w-3 h-3" />
                              <span>{loc.name}</span>
                              {isClaimed && <Check className="w-3 h-3 text-violet-400 ml-0.5" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cultural Taboos & Social Conflict Notes */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-200">
                    High-Level Factions Summary (Prompt Seed)
                  </label>
                  <textarea
                    rows={2}
                    value={factions}
                    onChange={(e) => setFactions(e.target.value)}
                    placeholder="Optional overview for AI narrative seed (leave empty to auto-derive from structured factions above)..."
                    className="w-full px-3.5 py-2 rounded-xl bg-[#1b1c26] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-200">
                    Cultural Taboos & Unspoken Norms
                  </label>
                  <textarea
                    rows={2}
                    value={culturalTaboos}
                    onChange={(e) => setCulturalTaboos(e.target.value)}
                    placeholder="e.g., Openly broadcasting unencrypted neural feeds; wearing corporate attire in lower-tier alleys..."
                    className="w-full px-3.5 py-2 rounded-xl bg-[#1b1c26] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 leading-relaxed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: KEYWORD LOREBOOK & CATEGORY ORGANIZATION */}
          {activeTab === 'lorebook' && (
            <div className="bg-[#14151e] p-6 rounded-2xl border border-white/5 space-y-5">
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/5">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Dynamic Keyword Lorebook ({lorebookEntries.length} Total)</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Selective lore injected into the AI context only when specific keywords appear in dialogue.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".json"
                    ref={lorebookFileInputRef}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleInitiateImportLorebookJson(file);
                        e.target.value = '';
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => lorebookFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#222226] hover:bg-[#2c2c32] text-xs font-semibold text-zinc-300 border border-[#2e2e36] transition-colors cursor-pointer"
                    title="Import lorebook entries from JSON"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import JSON</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddLorebookEntry()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Entry</span>
                  </button>
                </div>
              </div>

              {/* Notification Banner */}
              {lorebookNotification && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{lorebookNotification}</span>
                </div>
              )}

              {/* How It Works Guide Box */}
              <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-violet-300">
                  <Sparkles className="w-4 h-4 text-violet-400 shrink-0" />
                  <span>How the Keyword Lorebook Works</span>
                </div>
                <p className="text-zinc-300 leading-relaxed">
                  <strong>1. Trigger Keys:</strong> Enter comma-separated trigger words (e.g. <code className="bg-black/40 px-1 py-0.5 rounded text-violet-300">cyberdeck, neural link, ICE</code>).
                </p>
                <p className="text-zinc-300 leading-relaxed">
                  <strong>2. Dynamic Memory Recall:</strong> When a key appears in dialogue, the lore is injected into the AI's prompt for deep lore memory without token bloat.
                </p>
              </div>

              {/* 1-Click Starter Packs */}
              <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-white/5">
                <span className="text-[11px] text-zinc-400 font-semibold">
                  1-Click Starter Packs:
                </span>
                <button
                  type="button"
                  onClick={() => handleApplyStarterPack('cyberpunk')}
                  className="px-2.5 py-1 rounded-lg bg-[#1b1c26] hover:bg-[#252636] border border-white/10 text-xs text-violet-300 font-medium transition-colors cursor-pointer"
                >
                  + Cyberpunk Pack (3)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyStarterPack('fantasy')}
                  className="px-2.5 py-1 rounded-lg bg-[#1b1c26] hover:bg-[#252636] border border-white/10 text-xs text-amber-300 font-medium transition-colors cursor-pointer"
                >
                  + High Fantasy Pack (3)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyStarterPack('scifi')}
                  className="px-2.5 py-1 rounded-lg bg-[#1b1c26] hover:bg-[#252636] border border-white/10 text-xs text-sky-300 font-medium transition-colors cursor-pointer"
                >
                  + Sci-Fi Tech Pack (3)
                </button>
              </div>

              {/* Category Filter Pills & Search Bar */}
              <div className="space-y-3 pt-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Category Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-zinc-400 font-semibold flex items-center gap-1 mr-1">
                      <Layers className="w-3.5 h-3.5 text-violet-400" />
                      <span>Categories:</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => setSelectedCategory('All')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        selectedCategory === 'All'
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'bg-[#1b1c26] text-zinc-400 hover:text-zinc-200 border border-white/5'
                      }`}
                    >
                      All ({lorebookEntries.length})
                    </button>

                    {existingCategories.map((cat) => {
                      const count = lorebookEntries.filter(
                        (e) => (e.category?.trim() || 'General') === cat
                      ).length;
                      const isSelected = selectedCategory === cat;

                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-violet-600 text-white shadow-sm'
                              : 'bg-[#1b1c26] text-zinc-400 hover:text-zinc-200 border border-white/5'
                          }`}
                        >
                          <span>{cat}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                              isSelected ? 'bg-white/20' : 'bg-white/5'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}

                    {showAddCategoryInput ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Category name..."
                          className="px-2.5 py-1 rounded-lg bg-[#232432] border border-violet-500 text-xs text-white focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateNewCategory();
                            if (e.key === 'Escape') setShowAddCategoryInput(false);
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleCreateNewCategory}
                          className="p-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddCategoryInput(false)}
                          className="p-1 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowAddCategoryInput(true)}
                        className="px-2.5 py-1 rounded-lg bg-[#1b1c26] hover:bg-[#252636] text-xs text-violet-400 font-semibold border border-dashed border-violet-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <FolderPlus className="w-3 h-3" />
                        <span>New Category</span>
                      </button>
                    )}
                  </div>

                  {/* Real-time Search Input */}
                  <div className="relative min-w-48 sm:w-64">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={lorebookSearchQuery}
                      onChange={(e) => setLorebookSearchQuery(e.target.value)}
                      placeholder="Filter by keyword or lore..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#1b1c26] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                    />
                    {lorebookSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setLorebookSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Filtered Entries List */}
              {filteredLorebookEntries.length === 0 ? (
                <div className="py-12 text-center rounded-2xl border border-dashed border-white/10 space-y-3">
                  <BookOpen className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p className="text-xs text-zinc-400">
                    {lorebookEntries.length === 0
                      ? 'No selective lorebook entries added yet.'
                      : 'No entries match your category or search filter.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleAddLorebookEntry()}
                    className="text-xs font-semibold text-violet-400 hover:text-violet-300 underline cursor-pointer"
                  >
                    Create a new keyword entry
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredLorebookEntries.map((entry) => {
                    const currentCategory = entry.category?.trim() || 'General';

                    return (
                      <div
                        key={entry.id}
                        className="p-4 rounded-xl bg-[#1b1c26] border border-white/5 space-y-3 group hover:border-white/10 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 flex-wrap">
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={entry.enabled ?? true}
                                onChange={(e) =>
                                  handleUpdateLorebookEntry(entry.id, {
                                    enabled: e.target.checked,
                                  })
                                }
                                className="rounded border-zinc-700 bg-zinc-800 text-violet-600 focus:ring-violet-500 cursor-pointer"
                              />
                              <span>Active</span>
                            </label>

                            <span className="text-zinc-600">|</span>

                            {/* Category Selector Badge on Card */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-zinc-400">Category:</span>
                              <select
                                value={currentCategory}
                                onChange={(e) =>
                                  handleUpdateLorebookEntry(entry.id, {
                                    category: e.target.value,
                                  })
                                }
                                className="px-2 py-1 rounded-lg bg-[#232432] border border-white/10 text-xs text-violet-300 font-semibold focus:outline-none focus:border-violet-500 cursor-pointer"
                              >
                                {existingCategories.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <span className="text-zinc-600">|</span>

                            {/* Comma-separated keyword input */}
                            <div className="flex-1 min-w-48">
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
                                className="w-full px-3 py-1 rounded-lg bg-[#232432] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 font-medium"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteLorebookEntry(entry.id)}
                            className="text-zinc-500 hover:text-rose-400 transition-colors p-1 cursor-pointer self-end sm:self-center"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Lore Content */}
                        <textarea
                          rows={2}
                          value={entry.content}
                          onChange={(e) =>
                            handleUpdateLorebookEntry(entry.id, {
                              content: e.target.value,
                            })
                          }
                          placeholder="Lore injected into the AI context when trigger keys appear in conversation..."
                          className="w-full px-3.5 py-2 rounded-lg bg-[#232432] border border-white/5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-violet-500 leading-relaxed resize-y"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Save Custom Atmospheric Preset Modal */}
      {showSavePresetModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#14151e] border border-white/10 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <span>Save Atmospheric Preset</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSavePresetModal(false)}
                className="text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Saves your current banner image, narrator prose style, sensory palette, weather cycle, and physical laws as a reusable preset on this device.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Preset Name</label>
              <input
                type="text"
                value={newCustomPresetName}
                onChange={(e) => setNewCustomPresetName(e.target.value)}
                placeholder="e.g., Neon Noir Rainy Alleys"
                className="w-full px-3 py-2 rounded-xl bg-[#1b1c26] border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveCustomAtmosphericPreset();
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSavePresetModal(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newCustomPresetName.trim()}
                onClick={handleSaveCustomAtmosphericPreset}
                className="px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JSON Import Categorization Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#14151e] border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-bold text-white">
                  Import Lorebook Entries
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-200">
              Found <strong className="text-white">{pendingImportEntries.length}</strong> valid lore entries in{' '}
              <code className="bg-black/30 px-1 py-0.5 rounded text-violet-300 font-mono">
                {importFileName}
              </code>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-semibold text-zinc-300 block">
                How would you like to categorize these imported entries?
              </span>

              {/* Option 1: Merge into existing category */}
              <label
                className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  importMode === 'merge'
                    ? 'bg-violet-600/15 border-violet-500/50 text-white'
                    : 'bg-[#1b1c26] border-white/5 text-zinc-400 hover:border-white/15'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                  className="mt-0.5 text-violet-600 focus:ring-violet-500"
                />
                <div className="flex-1 space-y-1.5">
                  <span className="text-xs font-bold block text-zinc-200">
                    Merge into an Existing Category
                  </span>
                  <select
                    value={selectedExistingCategory}
                    disabled={importMode !== 'merge'}
                    onChange={(e) => setSelectedExistingCategory(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#232432] border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500 disabled:opacity-40 cursor-pointer"
                  >
                    {existingCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              {/* Option 2: Create a new category */}
              <label
                className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  importMode === 'new'
                    ? 'bg-violet-600/15 border-violet-500/50 text-white'
                    : 'bg-[#1b1c26] border-white/5 text-zinc-400 hover:border-white/15'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'new'}
                  onChange={() => setImportMode('new')}
                  className="mt-0.5 text-violet-600 focus:ring-violet-500"
                />
                <div className="flex-1 space-y-1.5">
                  <span className="text-xs font-bold block text-zinc-200">
                    Create a New Category for this Import
                  </span>
                  <input
                    type="text"
                    value={newImportCategoryName}
                    disabled={importMode !== 'new'}
                    onChange={(e) => setNewImportCategoryName(e.target.value)}
                    placeholder="e.g., Cyberpunk Factions, Alien Biomes..."
                    className="w-full px-3 py-1.5 rounded-lg bg-[#232432] border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500 disabled:opacity-40"
                  />
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImportWithCategory}
                className="px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white transition-colors cursor-pointer shadow-md"
              >
                Confirm Import ({pendingImportEntries.length} Entries)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
