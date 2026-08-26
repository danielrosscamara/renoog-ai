import { create } from 'zustand';
import type { Character, Persona, Chat, MessageTurn, ViewType } from '../types';
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
  activeView: ViewType;
  isSidebarOpen: boolean;
  isStreaming: boolean;
  isLoading: boolean;
  streamingError: string | null;
  exactTokenUsage: Record<string, { prompt_tokens: number; completion_tokens: number; total_tokens: number }>;
  hasUnsavedSettings: boolean;
  pendingView: ViewType | null;
  pendingChatId: string | null;
  editingCharacter: Character | null;

  // Actions
  initializeData: () => Promise<void>;
  setActiveChat: (chatId: string) => Promise<void>;
  setActiveCharacter: (characterId: string) => void;
  setActivePersona: (personaId: string) => void;
  setActiveView: (view: ViewType) => void;
  setHasUnsavedSettings: (isDirty: boolean) => void;
  setPendingView: (view: ViewType | null) => void;
  proceedNavigation: () => void;
  toggleSidebar: () => void;
  setSwipeIndex: (chatId: string, turnId: string, index: number) => Promise<void>;
  sendMessage: (chatId: string, text: string) => Promise<void>;
  rerollMessage: (chatId: string, turnId: string) => Promise<void>;
  createNewChat: (characterId: string) => Promise<string>;
  togglePinChat: (chatId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  addPersona: (personaData: Omit<Persona, 'id'>) => Promise<string>;
  updatePersona: (id: string, updates: Partial<Persona>) => Promise<void>;
  deletePersona: (id: string) => Promise<void>;
  createCharacter: (characterData: Partial<Character>) => Promise<Character>;
  setEditingCharacter: (char: Character | null) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => Promise<void>;
  toggleCharacterVisibility: (characterId: string) => Promise<void>;
  deleteCharacter: (characterId: string) => Promise<void>;
  importCharacterPng: (file: File) => Promise<Character>;
  exportCharacterPng: (characterId: string) => Promise<void>;
  editTurnMessage: (chatId: string, turnId: string, newText: string) => Promise<void>;
  deleteTurn: (chatId: string, turnId: string) => Promise<void>;
  togglePinTurn: (chatId: string, turnId: string) => Promise<void>;
  retryLastMessage: (chatId: string) => Promise<void>;
  rerollUserMessage: (chatId: string, userTurnId: string) => Promise<void>;
  generateGhostwriterSuggestion: (chatId: string) => Promise<string>;
}

// Helper: Loads advanced generation samplers and stop sequences from localStorage
const getStoredGenerationSamplers = (activePersonaName?: string) => {
  const topP = parseFloat(localStorage.getItem('renoog_top_p') || '0.95');
  const frequencyPenalty = parseFloat(localStorage.getItem('renoog_freq_penalty') || '0.0');
  const presencePenalty = parseFloat(localStorage.getItem('renoog_pres_penalty') || '0.0');
  const repetitionPenalty = parseFloat(localStorage.getItem('renoog_rep_penalty') || '1.15');
  const maxTokens = parseInt(localStorage.getItem('renoog_max_tokens') || '1024', 10);
  const antiImpersonation = localStorage.getItem('renoog_anti_impersonation') !== 'false';

  const stopSequences: string[] = [];
  if (antiImpersonation) {
    stopSequences.push('\nUser:', '\n{{user}}:');
    if (activePersonaName) {
      stopSequences.push(`\n${activePersonaName}:`);
    }
  }

  return {
    topP,
    frequencyPenalty,
    presencePenalty,
    repetitionPenalty,
    maxTokens,
    stopSequences,
  };
};

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
  exactTokenUsage: {},
  hasUnsavedSettings: false,
  pendingView: null,
  pendingChatId: null,
  editingCharacter: null,

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
    // Intercept navigation if there are unsaved settings
    if (get().hasUnsavedSettings && get().activeView === 'settings') {
      set({ pendingView: 'chat', pendingChatId: chatId });
      return;
    }

    const chat = get().chats.find((c) => c.id === chatId);
    set({
      activeChatId: chatId,
      activeCharacterId: chat ? chat.character_id : get().activeCharacterId,
      activeView: 'chat',
      pendingView: null,
      pendingChatId: null,
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

  setActiveView: (view: ViewType) => {
    // Intercept navigation if there are unsaved settings
    if (get().hasUnsavedSettings && get().activeView === 'settings' && view !== 'settings') {
      set({ pendingView: view, pendingChatId: null });
      return;
    }
    set({ activeView: view, pendingView: null, pendingChatId: null });
  },

  setHasUnsavedSettings: (isDirty: boolean) => {
    set({ hasUnsavedSettings: isDirty });
  },

  setPendingView: (view: ViewType | null) => {
    set({ pendingView: view, pendingChatId: null });
  },

  proceedNavigation: () => {
    const { pendingView, pendingChatId } = get();
    set({ hasUnsavedSettings: false, pendingView: null });
    if (pendingChatId) {
      get().setActiveChat(pendingChatId);
    } else if (pendingView) {
      set({ activeView: pendingView, pendingChatId: null });
    }
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

    const activePersona = get().personas.find((p) => p.id === get().activePersonaId);
    const samplers = getStoredGenerationSamplers(activePersona?.name);

    await api.streamChatMessage({
      chatId,
      userMessage: text,
      modelName: storedModel || undefined,
      temperature: storedTemp,
      topP: samplers.topP,
      frequencyPenalty: samplers.frequencyPenalty,
      presencePenalty: samplers.presencePenalty,
      repetitionPenalty: samplers.repetitionPenalty,
      maxTokens: samplers.maxTokens,
      stopSequences: samplers.stopSequences,
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
      onDone: (savedTurnId: string, fullText: string, usage) => {
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
            exactTokenUsage:
              usage && usage.prompt_tokens > 0
                ? { ...state.exactTokenUsage, [chatId]: usage }
                : state.exactTokenUsage,
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

    const activePersona = get().personas.find((p) => p.id === get().activePersonaId);
    const samplers = getStoredGenerationSamplers(activePersona?.name);

    await api.streamChatMessage({
      chatId,
      userMessage: userPrompt,
      modelName: storedModel || undefined,
      temperature: storedTemp,
      topP: samplers.topP,
      frequencyPenalty: samplers.frequencyPenalty,
      presencePenalty: samplers.presencePenalty,
      repetitionPenalty: samplers.repetitionPenalty,
      maxTokens: samplers.maxTokens,
      stopSequences: samplers.stopSequences,
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
      onDone: (_savedTurnId: string, fullText: string, usage) => {
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
            exactTokenUsage:
              usage && usage.prompt_tokens > 0
                ? { ...state.exactTokenUsage, [chatId]: usage }
                : state.exactTokenUsage,
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

  togglePinChat: async (chatId: string) => {
    const chat = get().chats.find((c) => c.id === chatId);
    if (!chat) return;
    const newPinned = !chat.is_pinned;
    set((state) => ({
      chats: state.chats.map((c) =>
        c.id === chatId ? { ...c, is_pinned: newPinned } : c
      ),
    }));
    try {
      await api.updateChat(chatId, { is_pinned: newPinned });
    } catch {
      // Retain optimistic update
    }
  },

  deleteChat: async (chatId: string) => {
    const remainingChats = get().chats.filter((c) => c.id !== chatId);
    const newActiveId =
      get().activeChatId === chatId
        ? remainingChats[0]?.id || null
        : get().activeChatId;

    set({
      chats: remainingChats,
      activeChatId: newActiveId,
    });

    if (newActiveId) {
      await get().setActiveChat(newActiveId);
    }

    try {
      await api.deleteChat(chatId);
    } catch {
      // Retain optimistic deletion
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

  createCharacter: async (characterData: Partial<Character>) => {
    try {
      const newChar = await api.createCharacter(characterData);
      set((state) => ({
        characters: [newChar, ...state.characters],
        activeCharacterId: newChar.id,
        editingCharacter: null,
      }));
      return newChar;
    } catch {
      const fallbackChar: Character = {
        id: `char_${Date.now()}`,
        name: characterData.name || 'New Character',
        tagline: characterData.tagline || '',
        description: characterData.description || '',
        personality: characterData.personality || '',
        scenario: characterData.scenario || '',
        first_mes: characterData.first_mes || 'Hello!',
        mes_example: characterData.mes_example || '',
        avatar_url: characterData.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=60',
        wallpaper_url: characterData.wallpaper_url || '',
        prompt_items: characterData.prompt_items || [],
        tags: characterData.tags || ['Custom'],
        is_favorite: false,
        is_hidden: false,
        creator: characterData.creator || 'You',
        created_at: new Date().toISOString(),
      };
      set((state) => ({
        characters: [fallbackChar, ...state.characters],
        activeCharacterId: fallbackChar.id,
        editingCharacter: null,
      }));
      return fallbackChar;
    }
  },

  setEditingCharacter: (char: Character | null) => {
    set({ editingCharacter: char });
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

  rerollUserMessage: async (chatId: string, userTurnId: string) => {
    const turns = get().messageTurns[chatId] || [];
    const userIndex = turns.findIndex((t) => t.id === userTurnId);
    if (userIndex === -1 || get().isStreaming) return;

    // Find subsequent assistant turn directly following this user turn
    const subsequentAssistantTurn = turns.slice(userIndex + 1).find((t) => t.role === 'assistant');
    if (subsequentAssistantTurn) {
      await get().rerollMessage(chatId, subsequentAssistantTurn.id);
    } else {
      const userPrompt = turns[userIndex].swipes[turns[userIndex].active_index] || '';
      await get().sendMessage(chatId, userPrompt);
    }
  },

  generateGhostwriterSuggestion: async (chatId: string): Promise<string> => {
    const state = get();
    const currentChat = state.chats.find((c) => c.id === chatId);
    const character = state.characters.find((c) => c.id === currentChat?.character_id);
    const persona = state.personas.find((p) => p.id === state.activePersonaId);
    const turns = state.messageTurns[chatId] || [];

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

    const recentDialogue = turns
      .slice(-4)
      .map((t) => {
        const author = t.role === 'user' ? (persona?.name || 'You') : (character?.name || 'Character');
        return `${author}: ${t.swipes[t.active_index] || ''}`;
      })
      .join('\n');

    if (!storedApiKey) {
      return `*smiles at ${character?.name || 'them'} and steps forward* "Tell me more about what you have in mind."`;
    }

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${storedApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'Renoog AI Ghostwriter',
        },
        body: JSON.stringify({
          model: storedModel,
          messages: [
            {
              role: 'system',
              content: `You are ghostwriting for the roleplay persona "${persona?.name || 'Adventurer'}" (${persona?.description || 'A wanderer in the scene'}). Based on the recent dialogue with "${character?.name || 'Character'}", write a single concise immersive response for ${persona?.name || 'the persona'}. Include *actions in asterisks* and spoken dialogue in quotes. Output ONLY the response itself without commentary.`,
            },
            {
              role: 'user',
              content: `Recent context:\n${recentDialogue}\n\nWrite the next response for ${persona?.name || 'Adventurer'}:`,
            },
          ],
          temperature: 0.85,
          max_tokens: 120,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate ghostwriter suggestion');
      const data = await res.json();
      const suggestion = data.choices?.[0]?.message?.content?.trim();
      return suggestion || `*nods in agreement with ${character?.name || 'them'}* "I understand."`;
    } catch {
      return `*glances at ${character?.name || 'them'} with an intrigued expression* "Let's see where this leads."`;
    }
  },
}));

// Automatically trigger database hydration on store load
useChatStore.getState().initializeData();
