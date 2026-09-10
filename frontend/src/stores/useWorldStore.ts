import { create } from 'zustand';
import { WORLD_PRESETS } from '../data/worldPresets';
import type {
  WorldPreset,
  WorldLocationPreset,
  LorebookKeywordEntry,
} from '../data/worldPresets';

/**
 * Extended world interface carrying metadata for user-created custom worlds.
 * 100% compatible with existing WorldPreset and backend WorldModel schema.
 */
export interface WorldPresetWithMeta extends WorldPreset {
  is_custom?: boolean;
  is_favorite?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateWorldInput {
  name: string;
  genre: WorldPreset['genre'];
  tagline: string;
  description: string;
  banner_url: string;
  tags: string[];

  // Narrative Directives & Atmosphere (Feeds Stage 1 Narrator)
  narrator_tone?: string;
  sensory_palette?: string;
  weather_cycle?: string;
  world_rules?: string;

  // Societal Landscape & Factions
  factions?: string;
  cultural_taboos?: string;

  // Spatial Topology & Starter Locations
  starter_locations: WorldLocationPreset[];
  default_location_id: string;

  // Selective Keyword Lorebook Entries
  lorebook_entries?: LorebookKeywordEntry[];
}

export interface WorldState {
  worlds: WorldPresetWithMeta[];
  favoriteWorldIds: string[];
  isLoading: boolean;

  // Selectors / Queries
  getWorldById: (id: string) => WorldPresetWithMeta | undefined;
  getFavoriteWorlds: () => WorldPresetWithMeta[];

  // Mutation Actions (Temporary localStorage adapter -> Future backend /api/v1/worlds)
  createCustomWorld: (input: CreateWorldInput) => WorldPresetWithMeta;
  updateCustomWorld: (id: string, updates: Partial<CreateWorldInput>) => void;
  deleteCustomWorld: (id: string) => void;
  toggleFavoriteWorld: (worldId: string) => void;

  // Portable JSON Import / Export
  exportWorldJson: (id: string) => string;
  importWorldJson: (jsonString: string) => WorldPresetWithMeta;
}

// Namespaced storage keys to avoid collisions with any existing or backend keys
const CUSTOM_WORLDS_STORAGE_KEY = 'renoog_v2_custom_worlds';
const FAVORITE_WORLDS_STORAGE_KEY = 'renoog_v2_favorite_worlds';

/**
 * Generates a standard RFC 4122 compliant UUID v4 string.
 * Uses native Web Crypto API with fallback for headless environments.
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function loadCustomWorldsFromStorage(): WorldPresetWithMeta[] {
  try {
    const stored = localStorage.getItem(CUSTOM_WORLDS_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as WorldPresetWithMeta[];
  } catch (err) {
    console.error('[useWorldStore] Failed to parse custom worlds from localStorage:', err);
    return [];
  }
}

function saveCustomWorldsToStorage(worlds: WorldPresetWithMeta[]): void {
  try {
    const customOnly = worlds.filter((w) => w.is_custom === true);
    localStorage.setItem(CUSTOM_WORLDS_STORAGE_KEY, JSON.stringify(customOnly));
  } catch (err) {
    console.error('[useWorldStore] Failed to save custom worlds to localStorage:', err);
  }
}

function loadFavoriteWorldIdsFromStorage(): string[] {
  try {
    const stored = localStorage.getItem(FAVORITE_WORLDS_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as string[];
  } catch (err) {
    console.error('[useWorldStore] Failed to parse favorite world IDs:', err);
    return [];
  }
}

function saveFavoriteWorldIdsToStorage(ids: string[]): void {
  try {
    localStorage.setItem(FAVORITE_WORLDS_STORAGE_KEY, JSON.stringify(ids));
  } catch (err) {
    console.error('[useWorldStore] Failed to save favorite world IDs:', err);
  }
}

export const useWorldStore = create<WorldState>((set, get) => {
  const initialCustomWorlds = loadCustomWorldsFromStorage();
  const initialFavoriteIds = loadFavoriteWorldIdsFromStorage();

  return {
    worlds: [...WORLD_PRESETS, ...initialCustomWorlds],
    favoriteWorldIds: initialFavoriteIds,
    isLoading: false,

    getWorldById: (id: string) => {
      return get().worlds.find((w) => w.id === id);
    },

    getFavoriteWorlds: () => {
      const { worlds, favoriteWorldIds } = get();
      return worlds.filter((w) => favoriteWorldIds.includes(w.id));
    },

    createCustomWorld: (input: CreateWorldInput) => {
      const now = new Date().toISOString();
      const worldId = generateUUID();

      // Deeply sanitize starter rooms & ambient NPCs
      const sanitizedLocations: WorldLocationPreset[] = input.starter_locations.map((loc) => ({
        ...loc,
        id: loc.id && loc.id.trim().length > 0 ? loc.id : generateUUID(),
        name: loc.name.trim(),
        description: loc.description.trim(),
        room_type: loc.room_type || 'hub',
        threat_level: loc.threat_level || 'neutral',
        ambient_sound: loc.ambient_sound?.trim() || undefined,
        ambient_lighting: loc.ambient_lighting?.trim() || undefined,
        connected_location_ids: loc.connected_location_ids || [],
        ambient_npcs: loc.ambient_npcs?.map((npc) => ({
          ...npc,
          id: npc.id && npc.id.trim().length > 0 ? npc.id : generateUUID(),
          name: npc.name.trim(),
          role: npc.role.trim(),
          description: npc.description.trim(),
        })),
      }));

      // Ensure default_location_id references a valid location
      const fallbackDefaultId =
        sanitizedLocations.length > 0 ? sanitizedLocations[0].id : generateUUID();
      const defaultLocId = sanitizedLocations.some((l) => l.id === input.default_location_id)
        ? input.default_location_id
        : fallbackDefaultId;

      // Deeply sanitize lorebook entries
      const sanitizedLorebook: LorebookKeywordEntry[] = (input.lorebook_entries || []).map((entry) => ({
        ...entry,
        id: entry.id && entry.id.trim().length > 0 ? entry.id : generateUUID(),
        keys: entry.keys.map((k) => k.trim()).filter(Boolean),
        content: entry.content.trim(),
        enabled: entry.enabled ?? true,
      }));

      const newWorld: WorldPresetWithMeta = {
        ...input,
        id: worldId,
        starter_locations: sanitizedLocations,
        default_location_id: defaultLocId,
        lorebook_entries: sanitizedLorebook,
        is_custom: true,
        created_at: now,
        updated_at: now,
      };

      const updatedWorlds = [...get().worlds, newWorld];
      set({ worlds: updatedWorlds });
      saveCustomWorldsToStorage(updatedWorlds);

      return newWorld;
    },

    updateCustomWorld: (id: string, updates: Partial<CreateWorldInput>) => {
      const now = new Date().toISOString();
      const updatedWorlds: WorldPresetWithMeta[] = get().worlds.map((w) => {
        if (w.id !== id || !w.is_custom) return w;

        // If updating starter locations, sanitize them
        const sanitizedLocations = updates.starter_locations
          ? updates.starter_locations.map((loc) => ({
              ...loc,
              id: loc.id && loc.id.trim().length > 0 ? loc.id : generateUUID(),
              name: loc.name.trim(),
              description: loc.description.trim(),
              room_type: loc.room_type || 'hub',
              threat_level: loc.threat_level || 'neutral',
              ambient_sound: loc.ambient_sound?.trim() || undefined,
              ambient_lighting: loc.ambient_lighting?.trim() || undefined,
              connected_location_ids: loc.connected_location_ids || [],
              ambient_npcs: loc.ambient_npcs?.map((npc) => ({
                ...npc,
                id: npc.id && npc.id.trim().length > 0 ? npc.id : generateUUID(),
                name: npc.name.trim(),
                role: npc.role.trim(),
                description: npc.description.trim(),
              })),
            }))
          : w.starter_locations;

        // If updating lorebook, sanitize them
        const sanitizedLorebook = updates.lorebook_entries
          ? updates.lorebook_entries.map((entry) => ({
              ...entry,
              id: entry.id && entry.id.trim().length > 0 ? entry.id : generateUUID(),
              keys: entry.keys.map((k) => k.trim()).filter(Boolean),
              content: entry.content.trim(),
              enabled: entry.enabled ?? true,
            }))
          : w.lorebook_entries;

        return {
          ...w,
          ...updates,
          starter_locations: sanitizedLocations,
          lorebook_entries: sanitizedLorebook,
          updated_at: now,
        };
      });

      set({ worlds: updatedWorlds });
      saveCustomWorldsToStorage(updatedWorlds);
    },

    deleteCustomWorld: (id: string) => {
      const updatedWorlds = get().worlds.filter((w) => w.id !== id);
      const updatedFavorites = get().favoriteWorldIds.filter((favId) => favId !== id);

      set({ worlds: updatedWorlds, favoriteWorldIds: updatedFavorites });
      saveCustomWorldsToStorage(updatedWorlds);
      saveFavoriteWorldIdsToStorage(updatedFavorites);
    },

    toggleFavoriteWorld: (worldId: string) => {
      const currentFavorites = get().favoriteWorldIds;
      const isFav = currentFavorites.includes(worldId);
      const nextFavorites = isFav
        ? currentFavorites.filter((id) => id !== worldId)
        : [...currentFavorites, worldId];

      set({ favoriteWorldIds: nextFavorites });
      saveFavoriteWorldIdsToStorage(nextFavorites);
    },

    exportWorldJson: (id: string) => {
      const world = get().getWorldById(id);
      if (!world) {
        throw new Error(`World with ID "${id}" was not found.`);
      }
      return JSON.stringify(world, null, 2);
    },

    importWorldJson: (jsonString: string) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonString);
      } catch (err) {
        throw new Error(
          `Invalid JSON syntax: ${err instanceof Error ? err.message : String(err)}`,
          { cause: err }
        );
      }

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Imported world data must be a valid JSON object.');
      }

      const candidate = parsed as Record<string, unknown>;

      if (typeof candidate.name !== 'string' || candidate.name.trim().length === 0) {
        throw new Error('World JSON is missing a valid "name" string.');
      }
      if (typeof candidate.description !== 'string') {
        throw new Error('World JSON is missing a valid "description" string.');
      }

      const input: CreateWorldInput = {
        name: candidate.name.trim(),
        genre: (typeof candidate.genre === 'string' ? candidate.genre : 'Fantasy') as WorldPreset['genre'],
        tagline: typeof candidate.tagline === 'string' ? candidate.tagline.trim() : '',
        description: candidate.description.trim(),
        banner_url:
          typeof candidate.banner_url === 'string' && candidate.banner_url.trim().length > 0
            ? candidate.banner_url.trim()
            : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
        tags: Array.isArray(candidate.tags)
          ? candidate.tags.map((t) => String(t).trim()).filter(Boolean)
          : ['Custom World'],

        narrator_tone: typeof candidate.narrator_tone === 'string' ? candidate.narrator_tone.trim() : undefined,
        sensory_palette: typeof candidate.sensory_palette === 'string' ? candidate.sensory_palette.trim() : undefined,
        weather_cycle: typeof candidate.weather_cycle === 'string' ? candidate.weather_cycle.trim() : undefined,
        world_rules: typeof candidate.world_rules === 'string' ? candidate.world_rules.trim() : undefined,

        factions: typeof candidate.factions === 'string' ? candidate.factions.trim() : undefined,
        cultural_taboos: typeof candidate.cultural_taboos === 'string' ? candidate.cultural_taboos.trim() : undefined,

        starter_locations: Array.isArray(candidate.starter_locations)
          ? (candidate.starter_locations as WorldLocationPreset[])
          : [
              {
                id: generateUUID(),
                name: 'Central Plaza',
                room_type: 'hub',
                threat_level: 'safe',
                description: 'The starting hub location of this newly imported realm.',
              },
            ],
        default_location_id:
          typeof candidate.default_location_id === 'string'
            ? candidate.default_location_id
            : '',

        lorebook_entries: Array.isArray(candidate.lorebook_entries)
          ? (candidate.lorebook_entries as LorebookKeywordEntry[])
          : [],
      };

      return get().createCustomWorld(input);
    },
  };
});
