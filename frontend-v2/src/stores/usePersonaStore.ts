import { create } from 'zustand';
import type { Persona } from '../types';
import { personasApi } from '../services/api';

interface PersonaState {
  personas: Persona[];
  activePersonaId: string;
  isLoading: boolean;

  loadPersonas: () => Promise<void>;
  setActivePersona: (id: string) => void;
  createPersona: (data: Omit<Persona, 'id'>) => Promise<string>;
  updatePersona: (id: string, updates: Partial<Persona>) => Promise<void>;
  deletePersona: (id: string) => Promise<void>;
}

export const usePersonaStore = create<PersonaState>((set, get) => ({
  personas: [],
  activePersonaId: '',
  isLoading: false,

  loadPersonas: async () => {
    set({ isLoading: true });
    try {
      const personas = await personasApi.list();
      const defaultPersona = personas.find((p) => p.is_default) || personas[0];
      set({
        personas,
        activePersonaId: get().activePersonaId || defaultPersona?.id || '',
        isLoading: false,
      });
    } catch (err) {
      console.error('[usePersonaStore] loadPersonas failed:', err);
      set({ isLoading: false });
    }
  },

  setActivePersona: (id) => set({ activePersonaId: id }),

  createPersona: async (data) => {
    const newPersona = await personasApi.create(data);
    set((state) => ({
      personas: [...state.personas, newPersona],
      activePersonaId: newPersona.id,
    }));
    return newPersona.id;
  },

  updatePersona: async (id, updates) => {
    const previous = get().personas;
    set((state) => ({
      personas: state.personas.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
    try {
      await personasApi.update(id, updates);
    } catch (err) {
      console.error('[usePersonaStore] updatePersona failed:', err);
      set({ personas: previous });
    }
  },

  deletePersona: async (id) => {
    const previousPersonas = get().personas;
    const previousActiveId = get().activePersonaId;
    const filtered = previousPersonas.filter((p) => p.id !== id);
    const nextActive =
      previousActiveId === id && filtered.length > 0 ? filtered[0].id : previousActiveId;

    set({ personas: filtered, activePersonaId: nextActive });

    try {
      await personasApi.delete(id);
    } catch (err) {
      console.error('[usePersonaStore] deletePersona failed:', err);
      set({ personas: previousPersonas, activePersonaId: previousActiveId });
    }
  },
}));