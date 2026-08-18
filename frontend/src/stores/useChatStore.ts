import { create } from 'zustand';
import type { Character, Persona, Chat, MessageTurn } from '../types';
import { MOCK_CHARACTERS, MOCK_PERSONAS, MOCK_CHATS, MOCK_MESSAGE_TURNS } from '../data/mockData';

export interface ChatState {
  characters: Character[];
  personas: Persona[];
  chats: Chat[];
  messageTurns: Record<string, MessageTurn[]>;
  activeChatId: string | null;
  activeCharacterId: string | null;
  activePersonaId: string;
  activeView: 'chat' | 'gallery' | 'personas' | 'settings';
  isSidebarOpen: boolean;
  isStreaming: boolean;

  // Actions
  setActiveChat: (chatId: string) => void;
  setActiveCharacter: (characterId: string) => void;
  setActivePersona: (personaId: string) => void;
  setActiveView: (view: 'chat' | 'gallery' | 'personas' | 'settings') => void;
  toggleSidebar: () => void;
  setSwipeIndex: (chatId: string, turnId: string, index: number) => void;
  sendMessage: (chatId: string, text: string) => void;
  rerollMessage: (chatId: string, turnId: string) => void;
  createNewChat: (characterId: string) => string;
  addPersona: (personaData: Omit<Persona, 'id'>) => string;
  updatePersona: (id: string, updates: Partial<Persona>) => void;
  deletePersona: (id: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  characters: MOCK_CHARACTERS,
  personas: MOCK_PERSONAS,
  chats: MOCK_CHATS,
  messageTurns: MOCK_MESSAGE_TURNS,
  activeChatId: 'chat_lyra_01',
  activeCharacterId: 'char_lyra',
  activePersonaId: 'persona_adventurer',
  activeView: 'chat',
  isSidebarOpen: true,
  isStreaming: false,

  setActiveChat: (chatId: string) => {
    const chat = get().chats.find((c) => c.id === chatId);
    set({
      activeChatId: chatId,
      activeCharacterId: chat ? chat.character_id : get().activeCharacterId,
      activeView: 'chat',
    });
  },

  setActiveCharacter: (characterId: string) => {
    set({ activeCharacterId: characterId });
  },

  setActivePersona: (personaId: string) => {
    set({ activePersonaId: personaId });
  },

  setActiveView: (view: 'chat' | 'gallery' | 'personas' | 'settings') => {
    set({ activeView: view });
  },

  toggleSidebar: () => {
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
  },

  setSwipeIndex: (chatId: string, turnId: string, index: number) => {
    set((state) => {
      const turns = state.messageTurns[chatId] || [];
      const updatedTurns = turns.map((turn) => {
        if (turn.id === turnId) {
          return { ...turn, active_index: index };
        }
        return turn;
      });

      return {
        messageTurns: {
          ...state.messageTurns,
          [chatId]: updatedTurns,
        },
      };
    });
  },

  sendMessage: (chatId: string, text: string) => {
    if (!text.trim()) return;

    const newTurnId = `turn_${Date.now()}`;
    const userTurn: MessageTurn = {
      id: newTurnId,
      chat_id: chatId,
      role: 'user',
      active_index: 0,
      swipes: [text],
      created_at: new Date().toISOString(),
    };

    set((state) => {
      const currentTurns = state.messageTurns[chatId] || [];
      return {
        messageTurns: {
          ...state.messageTurns,
          [chatId]: [...currentTurns, userTurn],
        },
      };
    });
  },

  rerollMessage: (chatId: string, turnId: string) => {
    set((state) => {
      const turns = state.messageTurns[chatId] || [];
      const updatedTurns = turns.map((turn) => {
        if (turn.id === turnId) {
          const newSwipeText = `*pauses thoughtfully, her eyes reflecting the glowing clockwork.* "Let us explore a different path."`;
          const newSwipes = [...turn.swipes, newSwipeText];
          return {
            ...turn,
            swipes: newSwipes,
            active_index: newSwipes.length - 1,
          };
        }
        return turn;
      });

      return {
        messageTurns: {
          ...state.messageTurns,
          [chatId]: updatedTurns,
        },
      };
    });
  },

  createNewChat: (characterId: string) => {
    const character = get().characters.find((c) => c.id === characterId);
    if (!character) return '';

    const newChatId = `chat_${Date.now()}`;
    const newChat: Chat = {
      id: newChatId,
      character_id: characterId,
      persona_id: get().activePersonaId,
      title: `Chat with ${character.name}`,
      model_name: 'anthropic/claude-3.5-sonnet',
      temperature: 0.9,
      is_pinned: false,
      updated_at: 'Just now',
    };

    const initialTurn: MessageTurn = {
      id: `turn_${Date.now()}_greeting`,
      chat_id: newChatId,
      role: 'assistant',
      active_index: 0,
      swipes: [character.first_mes],
      created_at: new Date().toISOString(),
    };

    set((state) => ({
      chats: [newChat, ...state.chats],
      activeChatId: newChatId,
      activeCharacterId: characterId,
      activeView: 'chat',
      messageTurns: {
        ...state.messageTurns,
        [newChatId]: [initialTurn],
      },
    }));

    return newChatId;
  },

  addPersona: (personaData: Omit<Persona, 'id'>) => {
    const newId = `persona_${Date.now()}`;
    const newPersona: Persona = {
      ...personaData,
      id: newId,
    };
    set((state) => ({
      personas: [...state.personas, newPersona],
      activePersonaId: newId,
    }));
    return newId;
  },

  updatePersona: (id: string, updates: Partial<Persona>) => {
    set((state) => ({
      personas: state.personas.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    }));
  },

  deletePersona: (id: string) => {
    set((state) => {
      const filtered = state.personas.filter((p) => p.id !== id);
      const newActive = state.activePersonaId === id && filtered.length > 0
        ? filtered[0].id
        : state.activePersonaId;

      return {
        personas: filtered,
        activePersonaId: newActive,
      };
    });
  },
}));
