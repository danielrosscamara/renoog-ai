import type { Character, Persona, Chat, MessageTurn, TokenUsage } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// ─── Shared fetch helper ─────────────────────────────────────────────────
// Every call goes through this so error handling is consistent in one place,
// instead of each function reinventing its own try/catch shape.
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    ...options,
  });

  if (!res.ok) {
    const errJson: { detail?: string } = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errJson.detail || `Request failed: ${res.status}`);
  }

  // 204 No Content has no body to parse
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Characters ──────────────────────────────────────────────────────────
export const charactersApi = {
  list: (includeHidden = false) =>
    request<Character[]>(`/characters${includeHidden ? '?include_hidden=true' : ''}`),

  create: (data: Partial<Character>) =>
    request<Character>('/characters', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, updates: Partial<Character>) =>
    request<Character>(`/characters/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),

  toggleVisibility: (id: string) =>
    request<Character>(`/characters/${id}/visibility`, { method: 'PATCH' }),

  delete: (id: string) => request<void>(`/characters/${id}`, { method: 'DELETE' }),

  importFromPng: async (file: File): Promise<Character> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE_URL}/characters/import-png`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const errJson: { detail?: string } = await res
        .json()
        .catch(() => ({ detail: 'Failed to parse character PNG' }));
      throw new Error(errJson.detail || 'Failed to import character PNG');
    }
    return res.json();
  },

  exportToPng: async (id: string, name: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/characters/${id}/export-png`);
    if (!res.ok) throw new Error('Failed to export character PNG');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/[^a-z0-9_-]/gi, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};

// ─── Personas ────────────────────────────────────────────────────────────
export const personasApi = {
  list: () => request<Persona[]>('/personas'),

  create: (data: Omit<Persona, 'id'>) =>
    request<Persona>('/personas', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<Persona>) =>
    request<Persona>(`/personas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) => request<void>(`/personas/${id}`, { method: 'DELETE' }),
};

// ─── Chats ───────────────────────────────────────────────────────────────
export const chatsApi = {
  list: () => request<Chat[]>('/chats'),

  getWithTurns: (chatId: string) =>
    request<Chat & { turns: MessageTurn[] }>(`/chats/${chatId}`).then((data) => {
      const { turns, ...chat } = data;
      return { chat: chat as Chat, turns };
    }),

  create: (characterId: string, personaId?: string, title?: string) =>
    request<Chat & { turns: MessageTurn[] }>('/chats', {
      method: 'POST',
      body: JSON.stringify({ character_id: characterId, persona_id: personaId, title }),
    }).then((data) => {
      const { turns, ...chat } = data;
      return { chat: chat as Chat, turns };
    }),

  update: (chatId: string, updates: Partial<Chat>) =>
    request<Chat>(`/chats/${chatId}`, { method: 'PUT', body: JSON.stringify(updates) }),

  delete: (chatId: string) => request<void>(`/chats/${chatId}`, { method: 'DELETE' }),

  updateTurnSwipe: (chatId: string, turnId: string, activeIndex: number) =>
    request<MessageTurn>(`/chats/${chatId}/turns/${turnId}/swipe`, {
      method: 'PUT',
      body: JSON.stringify({ active_index: activeIndex }),
    }),

  updateTurn: (
    chatId: string,
    turnId: string,
    updates: { swipes?: string[]; active_index?: number; is_pinned?: boolean }
  ) =>
    request<MessageTurn>(`/chats/${chatId}/turns/${turnId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteTurn: (chatId: string, turnId: string) =>
    request<void>(`/chats/${chatId}/turns/${turnId}`, { method: 'DELETE' }),
};

// ─── Streaming chat completion (SSE) ─────────────────────────────────────
export interface StreamChatParams {
  chatId: string;
  userMessage: string;
  modelName?: string;
  provider?: 'openrouter' | 'ollama' | 'custom';
  endpointUrl?: string;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  repetitionPenalty?: number;
  maxTokens?: number;
  stopSequences?: string[];
  auxiliaryPrompt?: string;
  apiKey?: string;
  onToken: (token: string) => void;
  onThought?: (thoughtToken: string) => void;
  onDone: (turnId: string, fullText: string, usage?: TokenUsage) => void;
  onError: (err: string) => void;
}

export async function streamChatMessage(params: StreamChatParams): Promise<void> {
  const {
    chatId, userMessage, modelName, provider = 'openrouter', endpointUrl,
    temperature, topP, frequencyPenalty, presencePenalty, repetitionPenalty,
    maxTokens, stopSequences, auxiliaryPrompt, apiKey,
    onToken, onThought, onDone, onError,
  } = params;

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['X-OpenRouter-Key'] = apiKey;

    const res = await fetch(`${API_BASE_URL}/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        chat_id: chatId,
        user_message: userMessage,
        model_name: modelName,
        temperature,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        repetition_penalty: repetitionPenalty,
        max_tokens: maxTokens,
        stop: stopSequences,
        auxiliary_prompt: auxiliaryPrompt,
        provider,
        endpoint_url: endpointUrl,
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errJson.detail || `Server responded with ${res.status}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No readable stream available in response.');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const jsonStr = trimmed.replace(/^data:\s*/, '');
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.event === 'token' && parsed.token) {
            onToken(parsed.token);
          } else if (parsed.event === 'thought' && parsed.thought) {
            onThought?.(parsed.thought);
          } else if (parsed.event === 'done') {
            onDone(parsed.turn_id, parsed.full_text, {
              prompt_tokens: parsed.prompt_tokens || 0,
              completion_tokens: parsed.completion_tokens || 0,
              total_tokens: parsed.total_tokens || 0,
              thought: parsed.thought || '',
              speed_tok_s: parsed.speed_tok_s,
              latency_ms: parsed.latency_ms,
            });
          } else if (parsed.event === 'error') {
            onError(parsed.error);
          }
        } catch {
          // Partial SSE framing chunk — wait for more data
        }
      }
    }
  } catch (error: unknown) {
    onError(error instanceof Error ? error.message : 'Unknown streaming error');
  }
}

// ─── Ollama local health check ───────────────────────────────────────────
export async function testOllamaConnection(
  baseUrl = 'http://localhost:11434'
): Promise<{ ok: boolean; models: string[]; error?: string }> {
  try {
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    const res = await fetch(`${cleanUrl}/api/tags`, { method: 'GET' });
    if (!res.ok) throw new Error(`Ollama responded with status ${res.status}`);
    const data = await res.json();
    const models: string[] = (data.models || []).map((m: { name: string }) => m.name);
    return { ok: true, models };
  } catch (err: unknown) {
    return {
      ok: false,
      models: [],
      error: err instanceof Error ? err.message : 'Could not connect to Ollama server',
    };
  }
}