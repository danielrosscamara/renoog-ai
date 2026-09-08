import { create } from 'zustand';
import type { Chat, MessageTurn, TokenUsage } from '../types';
import { chatsApi, streamChatMessage } from '../services/api';

interface ChatState {
  chats: Chat[];
  messageTurns: Record<string, MessageTurn[]>;
  activeChatId: string | null;
  isLoading: boolean;
  streamingChatIds: Record<string, boolean>;
  streamingError: string | null;
  exactTokenUsage: Record<string, TokenUsage>;

  // Data lifecycle
  loadChats: () => Promise<void>;
  setActiveChat: (chatId: string) => Promise<void>;
  createChat: (characterId: string, personaId?: string) => Promise<string>;
  togglePinChat: (chatId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;

  // Message turns
  isChatStreaming: (chatId: string) => boolean;
  sendMessage: (
    chatId: string,
    text: string,
    opts: SendMessageOptions
  ) => Promise<void>;
  setSwipeIndex: (chatId: string, turnId: string, index: number) => Promise<void>;
  editTurnMessage: (chatId: string, turnId: string, newText: string) => Promise<void>;
  deleteTurn: (chatId: string, turnId: string) => Promise<void>;
  togglePinTurn: (chatId: string, turnId: string) => Promise<void>;
  clearStreamingError: () => void;
}

// Provider/model/sampler config is owned by useSettingsStore (not built yet) —
// sendMessage takes it as a parameter instead of reaching into localStorage itself.
export interface SendMessageOptions {
  personaId?: string;
  modelName?: string;
  provider?: 'openrouter' | 'ollama' | 'custom';
  endpointUrl?: string;
  apiKey?: string;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  repetitionPenalty?: number;
  maxTokens?: number;
  stopSequences?: string[];
  auxiliaryPrompt?: string;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  messageTurns: {},
  activeChatId: null,
  isLoading: false,
  streamingChatIds: {},
  streamingError: null,
  exactTokenUsage: {},

  loadChats: async () => {
    set({ isLoading: true });
    try {
      const chats = await chatsApi.list();
      set({ chats, isLoading: false });
    } catch (err) {
      console.error('[useChatStore] loadChats failed:', err);
      set({ isLoading: false });
    }
  },

  setActiveChat: async (chatId) => {
    set({ activeChatId: chatId, streamingError: null });
    try {
      const { turns } = await chatsApi.getWithTurns(chatId);
      set((state) => ({
        messageTurns: { ...state.messageTurns, [chatId]: turns },
      }));
    } catch (err) {
      console.error('[useChatStore] setActiveChat failed:', err);
      // Keep whatever turns are already cached for this chat
    }
  },

  createChat: async (characterId, personaId) => {
    const { chat, turns } = await chatsApi.create(characterId, personaId);
    set((state) => ({
      chats: [chat, ...state.chats],
      activeChatId: chat.id,
      messageTurns: { ...state.messageTurns, [chat.id]: turns },
    }));
    return chat.id;
  },

  togglePinChat: async (chatId) => {
    const chat = get().chats.find((c) => c.id === chatId);
    if (!chat) return;
    const nextPinned = !chat.is_pinned;

    set((state) => ({
      chats: state.chats.map((c) => (c.id === chatId ? { ...c, is_pinned: nextPinned } : c)),
    }));

    try {
      await chatsApi.update(chatId, { is_pinned: nextPinned });
    } catch (err) {
      console.error('[useChatStore] togglePinChat failed:', err);
      set((state) => ({
        chats: state.chats.map((c) => (c.id === chatId ? { ...c, is_pinned: !nextPinned } : c)),
      }));
    }
  },

  deleteChat: async (chatId) => {
    const previous = get().chats;
    set((state) => ({ chats: state.chats.filter((c) => c.id !== chatId) }));
    try {
      await chatsApi.delete(chatId);
    } catch (err) {
      console.error('[useChatStore] deleteChat failed:', err);
      set({ chats: previous });
    }
  },

  isChatStreaming: (chatId) => Boolean(get().streamingChatIds[chatId]),

  sendMessage: async (chatId, text, opts) => {
    if (!text.trim() || get().streamingChatIds[chatId]) return;

    const userTurnId = `turn_user_${Date.now()}`;
    const assistantTurnId = `turn_assistant_${Date.now()}`;

    const userTurn: MessageTurn = {
      id: userTurnId,
      chat_id: chatId,
      role: 'user',
      active_index: 0,
      swipes: [text.trim()],
      created_at: new Date().toISOString(),
      persona_id: opts.personaId,
    };

    const assistantPlaceholder: MessageTurn = {
      id: assistantTurnId,
      chat_id: chatId,
      role: 'assistant',
      active_index: 0,
      swipes: [''],
      created_at: new Date().toISOString(),
      model_name: opts.modelName,
    };

    set((state) => ({
      streamingChatIds: { ...state.streamingChatIds, [chatId]: true },
      streamingError: null,
      messageTurns: {
        ...state.messageTurns,
        [chatId]: [...(state.messageTurns[chatId] || []), userTurn, assistantPlaceholder],
      },
    }));

    const clearStreamingFlag = () =>
      set((state) => {
        const next = { ...state.streamingChatIds };
        delete next[chatId];
        return { streamingChatIds: next };
      });

    await streamChatMessage({
      chatId,
      userMessage: text,
      modelName: opts.modelName,
      provider: opts.provider,
      endpointUrl: opts.endpointUrl,
      apiKey: opts.apiKey,
      temperature: opts.temperature,
      topP: opts.topP,
      frequencyPenalty: opts.frequencyPenalty,
      presencePenalty: opts.presencePenalty,
      repetitionPenalty: opts.repetitionPenalty,
      maxTokens: opts.maxTokens,
      stopSequences: opts.stopSequences,
      auxiliaryPrompt: opts.auxiliaryPrompt,

      onToken: (token) => {
        set((state) => ({
          messageTurns: {
            ...state.messageTurns,
            [chatId]: (state.messageTurns[chatId] || []).map((turn) =>
              turn.id === assistantTurnId
                ? { ...turn, swipes: [(turn.swipes[0] || '') + token] }
                : turn
            ),
          },
        }));
      },

      onDone: (savedTurnId, fullText, usage) => {
        clearStreamingFlag();
        set((state) => ({
          messageTurns: {
            ...state.messageTurns,
            [chatId]: (state.messageTurns[chatId] || []).map((turn) =>
              turn.id === assistantTurnId
                ? { ...turn, id: savedTurnId, swipes: [fullText] }
                : turn
            ),
          },
          exactTokenUsage:
            usage && usage.prompt_tokens > 0
              ? { ...state.exactTokenUsage, [chatId]: usage }
              : state.exactTokenUsage,
        }));
      },

      onError: (err) => {
        clearStreamingFlag();
        set({ streamingError: err });
      },
    });
  },

  setSwipeIndex: async (chatId, turnId, index) => {
    set((state) => ({
      messageTurns: {
        ...state.messageTurns,
        [chatId]: (state.messageTurns[chatId] || []).map((t) =>
          t.id === turnId ? { ...t, active_index: index } : t
        ),
      },
    }));
    try {
      await chatsApi.updateTurnSwipe(chatId, turnId, index);
    } catch (err) {
      console.error('[useChatStore] setSwipeIndex failed:', err);
    }
  },

  editTurnMessage: async (chatId, turnId, newText) => {
    const turns = get().messageTurns[chatId] || [];
    const target = turns.find((t) => t.id === turnId);
    if (!target) return;

    const updatedSwipes = [...target.swipes];
    updatedSwipes[target.active_index] = newText;

    set((state) => ({
      messageTurns: {
        ...state.messageTurns,
        [chatId]: (state.messageTurns[chatId] || []).map((t) =>
          t.id === turnId ? { ...t, swipes: updatedSwipes } : t
        ),
      },
    }));

    try {
      await chatsApi.updateTurn(chatId, turnId, {
        swipes: updatedSwipes,
        active_index: target.active_index,
      });
    } catch (err) {
      console.error('[useChatStore] editTurnMessage failed:', err);
    }
  },

  deleteTurn: async (chatId, turnId) => {
    set((state) => ({
      messageTurns: {
        ...state.messageTurns,
        [chatId]: (state.messageTurns[chatId] || []).filter((t) => t.id !== turnId),
      },
    }));
    try {
      await chatsApi.deleteTurn(chatId, turnId);
    } catch (err) {
      console.error('[useChatStore] deleteTurn failed:', err);
    }
  },

  togglePinTurn: async (chatId, turnId) => {
    const turns = get().messageTurns[chatId] || [];
    const target = turns.find((t) => t.id === turnId);
    if (!target) return;
    const nextPinned = !target.is_pinned;

    set((state) => ({
      messageTurns: {
        ...state.messageTurns,
        [chatId]: (state.messageTurns[chatId] || []).map((t) =>
          t.id === turnId ? { ...t, is_pinned: nextPinned } : t
        ),
      },
    }));

    try {
      await chatsApi.updateTurn(chatId, turnId, { is_pinned: nextPinned });
    } catch (err) {
      console.error('[useChatStore] togglePinTurn failed:', err);
    }
  },

  clearStreamingError: () => set({ streamingError: null }),
}));