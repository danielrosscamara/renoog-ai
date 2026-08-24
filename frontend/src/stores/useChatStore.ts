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
  activeView: 'chat' | 'gallery' | 'personas' | 'settings' | 'studio';
  isSidebarOpen: boolean;
  isStreaming: boolean;
  isLoading: boolean;
  streamingError: string | null;

  // Actions
  initializeData: () => Promise<void>;
  setActiveChat: (chatId: string) => Promise<void>;
  setActiveCharacter: (characterId: string) => void;
  setActivePersona: (personaId: string) => void;
  setActiveView: (view: 'chat' | 'gallery' | 'personas' | 'settings' | 'studio') => void;
  toggleSidebar: () => void;
  setSwipeIndex: (chatId: string, turnId: string, index: number) => Promise<void>;
  sendMessage: (chatId: string, text: string) => Promise<void>;
  rerollMessage: (chatId: string, turnId: string) => Promise<void>;
  createNewChat: (characterId: string) => Promise<string>;
  addPersona: (personaData: Omit<Persona, 'id'>) => Promise<string>;
  updatePersona: (id: string, updates: Partial<Persona>) => Promise<void>;
  deletePersona: (id: string) => Promise<void>;
  updateCharacter: (id: string, updates: Partial<Character>) => Promise<void>;
  toggleCharacterVisibility: (characterId: string) => Promise<void>;
  deleteCharacter: (characterId: string) => Promise<void>;
  importCharacterPng: (file: File) => Promise<Character>;
  exportCharacterPng: (characterId: string) => Promise<void>;
  editTurnMessage: (chatId: string, turnId: string, newText: string) => Promise<void>;
  deleteTurn: (chatId: string, turnId: string) => Promise<void>;
  togglePinTurn: (chatId: string, turnId: string) => Promise<void>;
  retryLastMessage: (chatId: string) => Promise<void>;
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
        api.getCharacters(true),
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

  setActiveView: (view: 'chat' | 'gallery' | 'personas' | 'settings' | 'studio') => {
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

    const storedApiKey =
      localStorage.getItem('renoog_api_key') ||
      (() => {
        try {
          return JSON.parse(localStorage.getItem('renoog_app_settings') || '{}').apiKey || '';
        } catch {
          return '';
        }
      })();

    const storedModel =
      localStorage.getItem('renoog_model') ||
      (() => {
        try {
          return JSON.parse(localStorage.getItem('renoog_app_settings') || '{}').selectedModel || '';
        } catch {
          return '';
        }
      })() || 'anthropic/claude-3.5-sonnet';

    const storedTemp = parseFloat(localStorage.getItem('renoog_temp') || '0.90');

    const assistantTurnPlaceholder: MessageTurn = {
      id: assistantTurnId,
      chat_id: chatId,
      role: 'assistant',
      active_index: 0,
      swipes: [''],
      created_at: new Date().toISOString(),
      model_name: storedModel,
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

    // Update active chat model in store if model is selected
    if (storedModel) {
      set((state) => ({
        chats: state.chats.map((c) => (c.id === chatId ? { ...c, model_name: storedModel } : c)),
      }));
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
                model_name: storedModel,
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
                model_name: storedModel,
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

    const storedApiKey =
      localStorage.getItem('renoog_api_key') ||
      (() => {
        try {
          return JSON.parse(localStorage.getItem('renoog_app_settings') || '{}').apiKey || '';
        } catch {
          return '';
        }
      })();

    const storedModel =
      localStorage.getItem('renoog_model') ||
      (() => {
        try {
          return JSON.parse(localStorage.getItem('renoog_app_settings') || '{}').selectedModel || '';
        } catch {
          return '';
        }
      })();

    const storedTemp = parseFloat(localStorage.getItem('renoog_temp') || '0.90');

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
                model_name: storedModel,
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

  toggleCharacterVisibility: async (characterId: string) => {
    set((state) => ({
      characters: state.characters.map((c) =>
        c.id === characterId ? { ...c, is_hidden: !c.is_hidden } : c
      ),
    }));
    try {
      await api.toggleCharacterVisibility(characterId);
    } catch {
      // Retain optimistic update
    }
  },

  deleteCharacter: async (characterId: string) => {
    set((state) => {
      const filtered = state.characters.filter((c) => c.id !== characterId);
      const newActive =
        state.activeCharacterId === characterId && filtered.length > 0
          ? filtered[0].id
          : state.activeCharacterId;
      return { characters: filtered, activeCharacterId: newActive };
    });
    try {
      await api.deleteCharacter(characterId);
    } catch {
      // Retain deletion
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

  editTurnMessage: async (chatId: string, turnId: string, newText: string) => {
    const currentTurns = get().messageTurns[chatId] || [];
    const targetTurn = currentTurns.find((t) => t.id === turnId);
    if (!targetTurn) return;

    const activeIdx = targetTurn.active_index || 0;
    const updatedSwipes = [...targetTurn.swipes];
    updatedSwipes[activeIdx] = newText;

    set((state) => ({
      messageTurns: {
        ...state.messageTurns,
        [chatId]: (state.messageTurns[chatId] || []).map((t) =>
          t.id === turnId ? { ...t, swipes: updatedSwipes } : t
        ),
      },
    }));

    try {
      await api.updateMessageTurn(chatId, turnId, {
        swipes: updatedSwipes,
        active_index: activeIdx,
      });
    } catch {
      // retain optimistic update
    }
  },

  deleteTurn: async (chatId: string, turnId: string) => {
    set((state) => ({
      messageTurns: {
        ...state.messageTurns,
        [chatId]: (state.messageTurns[chatId] || []).filter((t) => t.id !== turnId),
      },
    }));

    try {
      await api.deleteMessageTurn(chatId, turnId);
    } catch {
      // retain deletion
    }
  },

  togglePinTurn: async (chatId: string, turnId: string) => {
    const currentTurns = get().messageTurns[chatId] || [];
    const targetTurn = currentTurns.find((t) => t.id === turnId);
    if (!targetTurn) return;

    const newPinned = !targetTurn.is_pinned;

    set((state) => ({
      messageTurns: {
        ...state.messageTurns,
        [chatId]: (state.messageTurns[chatId] || []).map((t) =>
          t.id === turnId ? { ...t, is_pinned: newPinned } : t
        ),
      },
    }));

    try {
      await api.updateMessageTurn(chatId, turnId, { is_pinned: newPinned });
    } catch {
      // retain optimistic update
    }
  },

  retryLastMessage: async (chatId: string) => {
    const turns = get().messageTurns[chatId] || [];
    if (turns.length === 0 || get().isStreaming) return;

    // Find last user turn
    const lastUserTurn = [...turns].reverse().find((t) => t.role === 'user');
    if (!lastUserTurn) return;

    const userPrompt = lastUserTurn.swipes[lastUserTurn.active_index] || '';

    // Remove any failed or empty assistant turns at the end
    const lastTurn = turns[turns.length - 1];
    if (lastTurn && lastTurn.role === 'assistant' && (!lastTurn.swipes[0] || lastTurn.swipes[0].trim() === '')) {
      set((state) => ({
        streamingError: null,
        messageTurns: {
          ...state.messageTurns,
          [chatId]: (state.messageTurns[chatId] || []).filter((t) => t.id !== lastTurn.id),
        },
      }));
    } else {
      set({ streamingError: null });
    }

    await get().sendMessage(chatId, userPrompt);
  },
}));

// Automatically trigger database hydration on store load
useChatStore.getState().initializeData();
