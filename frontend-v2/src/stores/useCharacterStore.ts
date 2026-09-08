import { create } from 'zustand';
import type { Character } from '../types';
import { charactersApi } from '../services/api';

interface CharacterState {
  characters: Character[];
  editingCharacter: Character | null;
  isLoading: boolean;

  loadCharacters: (includeHidden?: boolean) => Promise<void>;
  setEditingCharacter: (char: Character | null) => void;
  createCharacter: (data: Partial<Character>) => Promise<Character>;
  updateCharacter: (id: string, updates: Partial<Character>) => Promise<void>;
  toggleCharacterVisibility: (id: string) => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;
  importCharacterPng: (file: File) => Promise<Character>;
  exportCharacterPng: (id: string) => Promise<void>;
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  characters: [],
  editingCharacter: null,
  isLoading: false,

  loadCharacters: async (includeHidden = false) => {
    set({ isLoading: true });
    try {
      const characters = await charactersApi.list(includeHidden);
      set({ characters, isLoading: false });
    } catch (err) {
      console.error('[useCharacterStore] loadCharacters failed:', err);
      set({ isLoading: false });
    }
  },

  setEditingCharacter: (char) => set({ editingCharacter: char }),

  createCharacter: async (data) => {
    const newChar = await charactersApi.create(data);
    set((state) => ({
      characters: [newChar, ...state.characters],
      editingCharacter: null,
    }));
    return newChar;
  },

  updateCharacter: async (id, updates) => {
    const previous = get().characters;
    set((state) => ({
      characters: state.characters.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
    try {
      await charactersApi.update(id, updates);
    } catch (err) {
      console.error('[useCharacterStore] updateCharacter failed:', err);
      set({ characters: previous });
    }
  },

  toggleCharacterVisibility: async (id) => {
    const previous = get().characters;
    set((state) => ({
      characters: state.characters.map((c) =>
        c.id === id ? { ...c, is_hidden: !c.is_hidden } : c
      ),
    }));
    try {
      await charactersApi.toggleVisibility(id);
    } catch (err) {
      console.error('[useCharacterStore] toggleCharacterVisibility failed:', err);
      set({ characters: previous });
    }
  },

  deleteCharacter: async (id) => {
    const previous = get().characters;
    set({ characters: previous.filter((c) => c.id !== id) });
    try {
      await charactersApi.delete(id);
    } catch (err) {
      console.error('[useCharacterStore] deleteCharacter failed:', err);
      set({ characters: previous });
    }
  },

  importCharacterPng: async (file) => {
    const newChar = await charactersApi.importFromPng(file);
    set((state) => ({ characters: [newChar, ...state.characters] }));
    return newChar;
  },

  exportCharacterPng: async (id) => {
    const character = get().characters.find((c) => c.id === id);
    if (!character) return;
    await charactersApi.exportToPng(id, character.name);
  },
}));