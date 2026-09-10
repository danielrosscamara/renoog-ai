import { create } from 'zustand';
import { WORLD_PRESETS } from '../data/worldPresets';
import type { WorldPreset, WorldLocationPreset } from '../data/worldPresets';

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
  genre: 'Cyberpunk' | 'Fantasy' | 'Sci-Fi' | 'Gothic Noir' | string;
  tagline: string;
  description: string;
  banner_url: string;
  starter_locations: WorldLocationPreset[];
  default_location_id: string;
  tags: string[];
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

      // Ensure every starter room has a valid UUID
      const sanitizedLocations: WorldLocationPreset[] = input.starter_locations.map((loc) => ({
        id: loc.id && loc.id.trim().length > 0 ? loc.id : generateUUID(),
        name: loc.name.trim(),
        description: loc.description.trim(),
      }));

      // Ensure default_location_id references a valid location
      const fallbackDefaultId =
        sanitizedLocations.length > 0 ? sanitizedLocations[0].id : generateUUID();
      const defaultLocId = sanitizedLocations.some((l) => l.id === input.default_location_id)
        ? input.default_location_id
        : fallbackDefaultId;

      const newWorld: WorldPresetWithMeta = {
        ...input,
        id: worldId,
        starter_locations: sanitizedLocations,
        default_location_id: defaultLocId,
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
      const updatedWorlds = get().worlds.map((w) => {
        if (w.id !== id || !w.is_custom) return w;
        return {
          ...w,
          ...updates,
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
  };
});
