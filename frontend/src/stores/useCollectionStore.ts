import { create } from 'zustand';

export interface UserCollection {
  id: string;
  name: string;
  description?: string;
  item_ids: string[]; // Character IDs and World IDs belonging to this collection
  created_at: string;
  updated_at?: string;
}

export interface CollectionState {
  collections: UserCollection[];
  createCollection: (name: string, description?: string) => UserCollection;
  renameCollection: (id: string, newName: string) => void;
  deleteCollection: (id: string) => void;
  toggleItemInCollection: (collectionId: string, itemId: string) => void;
  addItemToCollection: (collectionId: string, itemId: string) => void;
  removeItemFromCollection: (collectionId: string, itemId: string) => void;
  isItemInCollection: (collectionId: string, itemId: string) => boolean;
  getCollectionsForItem: (itemId: string) => UserCollection[];
  getCollectionById: (id: string) => UserCollection | undefined;
}

const COLLECTIONS_STORAGE_KEY = 'renoog_v2_user_collections';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'col_' + Math.random().toString(36).substring(2, 11);
}

function loadCollectionsFromStorage(): UserCollection[] {
  try {
    const stored = localStorage.getItem(COLLECTIONS_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as UserCollection[];
  } catch (err) {
    console.error('[useCollectionStore] Failed to parse collections from localStorage:', err);
    return [];
  }
}

function saveCollectionsToStorage(collections: UserCollection[]): void {
  try {
    localStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(collections));
  } catch (err) {
    console.error('[useCollectionStore] Failed to save collections to localStorage:', err);
  }
}

export const useCollectionStore = create<CollectionState>((set, get) => {
  const initialCollections = loadCollectionsFromStorage();

  return {
    collections: initialCollections,

    createCollection: (name, description) => {
      const trimmedName = name.trim();
      const now = new Date().toISOString();
      const newCollection: UserCollection = {
        id: generateUUID(),
        name: trimmedName || 'Untitled Collection',
        description: description?.trim() || undefined,
        item_ids: [],
        created_at: now,
        updated_at: now,
      };

      const updated = [...get().collections, newCollection];
      set({ collections: updated });
      saveCollectionsToStorage(updated);
      return newCollection;
    },

    renameCollection: (id, newName) => {
      const trimmed = newName.trim();
      if (!trimmed) return;

      const updated = get().collections.map((col) =>
        col.id === id
          ? { ...col, name: trimmed, updated_at: new Date().toISOString() }
          : col
      );
      set({ collections: updated });
      saveCollectionsToStorage(updated);
    },

    deleteCollection: (id) => {
      const updated = get().collections.filter((col) => col.id !== id);
      set({ collections: updated });
      saveCollectionsToStorage(updated);
    },

    toggleItemInCollection: (collectionId, itemId) => {
      const updated = get().collections.map((col) => {
        if (col.id !== collectionId) return col;
        const exists = col.item_ids.includes(itemId);
        const nextItems = exists
          ? col.item_ids.filter((id) => id !== itemId)
          : [...col.item_ids, itemId];
        return {
          ...col,
          item_ids: nextItems,
          updated_at: new Date().toISOString(),
        };
      });
      set({ collections: updated });
      saveCollectionsToStorage(updated);
    },

    addItemToCollection: (collectionId, itemId) => {
      const updated = get().collections.map((col) => {
        if (col.id !== collectionId || col.item_ids.includes(itemId)) return col;
        return {
          ...col,
          item_ids: [...col.item_ids, itemId],
          updated_at: new Date().toISOString(),
        };
      });
      set({ collections: updated });
      saveCollectionsToStorage(updated);
    },

    removeItemFromCollection: (collectionId, itemId) => {
      const updated = get().collections.map((col) => {
        if (col.id !== collectionId || !col.item_ids.includes(itemId)) return col;
        return {
          ...col,
          item_ids: col.item_ids.filter((id) => id !== itemId),
          updated_at: new Date().toISOString(),
        };
      });
      set({ collections: updated });
      saveCollectionsToStorage(updated);
    },

    isItemInCollection: (collectionId, itemId) => {
      const target = get().collections.find((col) => col.id === collectionId);
      return target ? target.item_ids.includes(itemId) : false;
    },

    getCollectionsForItem: (itemId) => {
      return get().collections.filter((col) => col.item_ids.includes(itemId));
    },

    getCollectionById: (id) => {
      return get().collections.find((col) => col.id === id);
    },
  };
});
