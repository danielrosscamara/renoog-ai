import { create } from 'zustand';
import type { Character, Persona, Chat, MessageTurn } from '../types';
import { api } from '../services/api';
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
  isLoading: boolean;
  streamingError: string | null;

  // Actions
  initializeData: () => Promise<void>;
  setActiveChat: (chatId: string) => Promise<void>;
  setActiveCharacter: (characterId: string) => void;
  setActivePersona: (personaId: string) => void;
  setActiveView: (view: 'chat' | 'gallery' | 'personas' | 'settings') => void;
  toggleSidebar: () => void;
  setSwipeIndex: (chatId: string, turnId: string, index: number) => Promise<void>;
  sendMessage: (chatId: string, text: string) => Promise<void>;
  rerollMessage: (chatId: string, turnId: string) => Promise<void>;
  createNewChat: (characterId: string) => Promise<string>;
  addPersona: (personaData: Omit<Persona, 'id'>) => Promise<string>;
  updatePersona: (id: string, updates: Partial<Persona>) => Promise<void>;
  deletePersona: (id: string) => Promise<void>;
  updateCharacter: (id: string, updates: Partial<Character>) => Promise<void>;
  importCharacterPng: (file: File) => Promise<Character>;
  exportCharacterPng: (characterId: string) => Promise<void>;
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
  isLoading: false,
  streamingError: null,

  initializeData: async () => {
    try {
      set({ isLoading: true });
      const [characters, personas, chats] = await Promise.all([
        api.getCharacters(),
        api.getPersonas(),
        api.getChats(),
      ]);

      const defaultPersona = personas.find((p) => p.is_default) || personas[0];
      const initialChat = chats[0];

      set({
        characters: characters.length > 0 ? characters : get().characters,
        personas: personas.length > 0 ? personas : get().personas,
        chats: chats.length > 0 ? chats : get().chats,
        activePersonaId: defaultPersona ? defaultPersona.id : get().activePersonaId,
        isLoading: false,
      });

      if (initialChat) {
        await get().setActiveChat(initialChat.id);
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setActiveChat: async (chatId: string) => {
    const chat = get().chats.find((c) => c.id === chatId);
    set({
      activeChatId: chatId,
      activeCharacterId: chat ? chat.character_id : get().activeCharacterId,
      activeView: 'chat',
      streamingError: null,
    });

    try {
      const { turns } = await api.getChatWithTurns(chatId);
      set((state) => ({
        messageTurns: {
          ...state.messageTurns,
          [chatId]: turns,
        },
      }));
    } catch {
      // Keep existing memory turns on error
    }
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

  setSwipeIndex: async (chatId: string, turnId: string, index: number) => {
    set((state) => {
      const turns = state.messageTurns[chatId] || [];
      const updatedTurns = turns.map((turn) =>
        turn.id === turnId ? { ...turn, active_index: index } : turn
      );
      return {
        messageTurns: { ...state.messageTurns, [chatId]: updatedTurns },
      };
    });

    try {
      await api.updateTurnSwipe(chatId, turnId, index);
    } catch {
      // Retain optimistic index update
    }
  },

  sendMessage: async (chatId: string, text: string) => {
    if (!text.trim() || get().isStreaming) return;

    const userTurnId = `turn_user_${Date.now()}`;
    const assistantTurnId = `turn_assistant_${Date.now()}`;

    const userTurn: MessageTurn = {
      id: userTurnId,
      chat_id: chatId,
      role: 'user',
      active_index: 0,
      swipes: [text.trim()],
      created_at: new Date().toISOString(),
      persona_id: get().activePersonaId,
    };

    const assistantTurnPlaceholder: MessageTurn = {
      id: assistantTurnId,
      chat_id: chatId,
      role: 'assistant',
      active_index: 0,
      swipes: [''],
      created_at: new Date().toISOString(),
    };

    set((state) => {
      const currentTurns = state.messageTurns[chatId] || [];
      return {
        isStreaming: true,
        streamingError: null,
        messageTurns: {
          ...state.messageTurns,
          [chatId]: [...currentTurns, userTurn, assistantTurnPlaceholder],
        },
      };
    });

    let storedApiKey = '';
    let storedModel = '';
    let storedTemp = 0.9;
    try {
      const savedSettings = localStorage.getItem('renoog_app_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        storedApiKey = parsed.apiKey || '';
        storedModel = parsed.selectedModel || '';
        storedTemp = parsed.temperature ?? 0.9;
      }
    } catch {
      // Use defaults
    }

    await api.streamChatMessage({
      chatId,
      userMessage: text,
      modelName: storedModel || undefined,
      temperature: storedTemp,
      apiKey: storedApiKey || undefined,
      onToken: (token: string) => {
        set((state) => {
          const turns = state.messageTurns[chatId] || [];
          const updatedTurns = turns.map((turn) => {
            if (turn.id === assistantTurnId) {
              const currentSwipe = turn.swipes[0] || '';
              return {
                ...turn,
                swipes: [currentSwipe + token],
              };
            }
            return turn;
          });
          return {
            messageTurns: { ...state.messageTurns, [chatId]: updatedTurns },
          };
        });
      },
      onDone: (savedTurnId: string, fullText: string) => {
        set((state) => {
          const turns = state.messageTurns[chatId] || [];
          const updatedTurns = turns.map((turn) => {
            if (turn.id === assistantTurnId) {
              return {
                ...turn,
                id: savedTurnId,
                swipes: [fullText],
              };
            }
            return turn;
          });
          return {
            isStreaming: false,
            messageTurns: { ...state.messageTurns, [chatId]: updatedTurns },
          };
        });
      },
      onError: (err: string) => {
        set({ isStreaming: false, streamingError: err });
      },
    });
  },

  rerollMessage: async (chatId: string, turnId: string) => {
    const turns = get().messageTurns[chatId] || [];
    const turnIndex = turns.findIndex((t) => t.id === turnId);
    if (turnIndex === -1 || get().isStreaming) return;

    const prevUserTurn = turns.slice(0, turnIndex).reverse().find((t) => t.role === 'user');
    const userPrompt = prevUserTurn?.swipes[prevUserTurn.active_index] || '';

    const targetTurn = turns[turnIndex];
    const newSwipeIndex = targetTurn.swipes.length;

    set((state) => {
      const currentTurns = state.messageTurns[chatId] || [];
      const updated = currentTurns.map((t) => {
        if (t.id === turnId) {
          return {
            ...t,
            swipes: [...t.swipes, ''],
            active_index: newSwipeIndex,
          };
        }
        return t;
      });
      return {
        isStreaming: true,
        streamingError: null,
        messageTurns: { ...state.messageTurns, [chatId]: updated },
      };
    });

    let storedApiKey = '';
    let storedModel = '';
    let storedTemp = 0.9;
    try {
      const savedSettings = localStorage.getItem('renoog_app_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        storedApiKey = parsed.apiKey || '';
        storedModel = parsed.selectedModel || '';
        storedTemp = parsed.temperature ?? 0.9;
      }
    } catch {
      // Use defaults
    }

    await api.streamChatMessage({
      chatId,
      userMessage: userPrompt,
      modelName: storedModel || undefined,
      temperature: storedTemp,
      apiKey: storedApiKey || undefined,
      onToken: (token: string) => {
        set((state) => {
          const currentTurns = state.messageTurns[chatId] || [];
          const updatedTurns = currentTurns.map((turn) => {
            if (turn.id === turnId) {
              const currentSwipes = [...turn.swipes];
              currentSwipes[newSwipeIndex] = (currentSwipes[newSwipeIndex] || '') + token;
              return {
                ...turn,
                swipes: currentSwipes,
              };
            }
            return turn;
          });
          return {
            messageTurns: { ...state.messageTurns, [chatId]: updatedTurns },
          };
        });
      },
      onDone: (_savedTurnId: string, fullText: string) => {
        set((state) => {
          const currentTurns = state.messageTurns[chatId] || [];
          const updatedTurns = currentTurns.map((turn) => {
            if (turn.id === turnId) {
              const currentSwipes = [...turn.swipes];
              currentSwipes[newSwipeIndex] = fullText;
              return {
                ...turn,
                swipes: currentSwipes,
                active_index: newSwipeIndex,
              };
            }
            return turn;
          });
          return {
            isStreaming: false,
            messageTurns: { ...state.messageTurns, [chatId]: updatedTurns },
          };
        });
      },
      onError: (err: string) => {
        set({ isStreaming: false, streamingError: err });
      },
    });
  },

  createNewChat: async (characterId: string) => {
    const character = get().characters.find((c) => c.id === characterId);
    if (!character) return '';

    try {
      const { chat, turns } = await api.createChat(characterId, get().activePersonaId);
      set((state) => ({
        chats: [chat, ...state.chats],
        activeChatId: chat.id,
        activeCharacterId: characterId,
        activeView: 'chat',
        messageTurns: {
          ...state.messageTurns,
          [chat.id]: turns,
        },
      }));
      return chat.id;
    } catch {
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
      set((state) => ({
        chats: [newChat, ...state.chats],
        activeChatId: newChatId,
        activeCharacterId: characterId,
        activeView: 'chat',
      }));
      return newChatId;
    }
  },

  addPersona: async (personaData: Omit<Persona, 'id'>) => {
    try {
      const newPersona = await api.createPersona(personaData);
      set((state) => ({
        personas: [...state.personas, newPersona],
        activePersonaId: newPersona.id,
      }));
      return newPersona.id;
    } catch {
      const fallbackId = `persona_${Date.now()}`;
      const newPersona: Persona = { ...personaData, id: fallbackId };
      set((state) => ({
        personas: [...state.personas, newPersona],
        activePersonaId: fallbackId,
      }));
      return fallbackId;
    }
  },

  updatePersona: async (id: string, updates: Partial<Persona>) => {
    set((state) => ({
      personas: state.personas.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
    try {
      await api.updatePersona(id, updates);
    } catch {
      // Retain optimistic update
    }
  },

  deletePersona: async (id: string) => {
    set((state) => {
      const filtered = state.personas.filter((p) => p.id !== id);
      const newActive =
        state.activePersonaId === id && filtered.length > 0
          ? filtered[0].id
          : state.activePersonaId;
      return { personas: filtered, activePersonaId: newActive };
    });
    try {
      await api.deletePersona(id);
    } catch {
      // Retain deletion
    }
  },

  updateCharacter: async (id: string, updates: Partial<Character>) => {
    set((state) => ({
      characters: state.characters.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
    try {
      await api.updateCharacter(id, updates);
    } catch {
      // Retain optimistic update
    }
  },

  importCharacterPng: async (file: File) => {
    const newChar = await api.importCharacterFromPng(file);
    set((state) => ({
      characters: [newChar, ...state.characters],
      activeCharacterId: newChar.id,
    }));
    return newChar;
  },

  exportCharacterPng: async (characterId: string) => {
    const character = get().characters.find((c) => c.id === characterId);
    if (!character) return;
    await api.exportCharacterToPng(characterId, character.name);
  },
}));

// Automatically trigger database hydration on store load
useChatStore.getState().initializeData();
