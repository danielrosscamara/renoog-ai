import type { Character, Persona, Chat, MessageTurn } from '../types';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export const api = {
  // Characters
  async getCharacters(includeHidden = false): Promise<Character[]> {
    const url = includeHidden
      ? `${API_BASE_URL}/characters?include_hidden=true`
      : `${API_BASE_URL}/characters`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch characters');
    return res.json();
  },

  async updateCharacter(id: string, updates: Partial<Character>): Promise<Character> {
    const res = await fetch(`${API_BASE_URL}/characters/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update character');
    return res.json();
  },

  async toggleCharacterVisibility(characterId: string): Promise<Character> {
    const res = await fetch(`${API_BASE_URL}/characters/${characterId}/visibility`, {
      method: 'PATCH',
    });
    if (!res.ok) throw new Error('Failed to toggle character visibility');
    return res.json();
  },

  async deleteCharacter(characterId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/characters/${characterId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete character');
  },

  // Personas
  async getPersonas(): Promise<Persona[]> {
    const res = await fetch(`${API_BASE_URL}/personas`);
    if (!res.ok) throw new Error('Failed to fetch personas');
    return res.json();
  },

  async createPersona(data: Omit<Persona, 'id'>): Promise<Persona> {
    const res = await fetch(`${API_BASE_URL}/personas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create persona');
    return res.json();
  },

  async updatePersona(id: string, data: Partial<Persona>): Promise<Persona> {
    const res = await fetch(`${API_BASE_URL}/personas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update persona');
    return res.json();
  },

  async deletePersona(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/personas/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete persona');
  },

  // Chats
  async getChats(): Promise<Chat[]> {
    const res = await fetch(`${API_BASE_URL}/chats`);
    if (!res.ok) throw new Error('Failed to fetch chats');
    return res.json();
  },

  async getChatWithTurns(chatId: string): Promise<{ chat: Chat; turns: MessageTurn[] }> {
    const res = await fetch(`${API_BASE_URL}/chats/${chatId}`);
    if (!res.ok) throw new Error(`Failed to fetch chat ${chatId}`);
    const data = await res.json();
    return {
      chat: {
        id: data.id,
        character_id: data.character_id,
        persona_id: data.persona_id,
        title: data.title,
        model_name: data.model_name,
        temperature: data.temperature,
        is_pinned: data.is_pinned,
        updated_at: data.updated_at,
      },
      turns: data.turns || [],
    };
  },

  async createChat(characterId: string, personaId?: string, title?: string): Promise<{ chat: Chat; turns: MessageTurn[] }> {
    const res = await fetch(`${API_BASE_URL}/chats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ character_id: characterId, persona_id: personaId, title }),
    });
    if (!res.ok) throw new Error('Failed to create chat');
    const data = await res.json();
    return {
      chat: {
        id: data.id,
        character_id: data.character_id,
        persona_id: data.persona_id,
        title: data.title,
        model_name: data.model_name,
        temperature: data.temperature,
        is_pinned: data.is_pinned,
        updated_at: data.updated_at,
      },
      turns: data.turns || [],
    };
  },

  async updateTurnSwipe(chatId: string, turnId: string, activeIndex: number): Promise<MessageTurn> {
    const res = await fetch(`${API_BASE_URL}/chats/${chatId}/turns/${turnId}/swipe`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active_index: activeIndex }),
    });
    if (!res.ok) throw new Error('Failed to update swipe index');
    return res.json();
  },

  async updateMessageTurn(
    chatId: string,
    turnId: string,
    updates: { swipes?: string[]; active_index?: number; is_pinned?: boolean }
  ): Promise<MessageTurn> {
    const res = await fetch(`${API_BASE_URL}/chats/${chatId}/turns/${turnId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update message turn');
    return res.json();
  },

  async deleteMessageTurn(chatId: string, turnId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/chats/${chatId}/turns/${turnId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete message turn');
  },

  // Real-time SSE Token Streaming
  async streamChatMessage({
    chatId,
    userMessage,
    modelName,
    temperature,
    apiKey,
    onToken,
    onDone,
    onError,
  }: {
    chatId: string;
    userMessage: string;
    modelName?: string;
    temperature?: number;
    apiKey?: string;
    onToken: (token: string) => void;
    onDone: (turnId: string, fullText: string) => void;
    onError: (err: string) => void;
  }): Promise<void> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['X-OpenRouter-Key'] = apiKey;
      }

      const res = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          chat_id: chatId,
          user_message: userMessage,
          model_name: modelName,
          temperature,
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
            } else if (parsed.event === 'done') {
              onDone(parsed.turn_id, parsed.full_text);
            } else if (parsed.event === 'error') {
              onError(parsed.error);
            }
          } catch {
            // Ignore partial SSE framing chunks
          }
        }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown streaming error';
      onError(msg);
    }
  },

  // TavernAI PNG Import & Export
  async importCharacterFromPng(file: File): Promise<Character> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/characters/import-png`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({ detail: 'Failed to parse character PNG' }));
      throw new Error(errJson.detail || 'Failed to import character PNG');
    }
    return res.json();
  },

  async exportCharacterToPng(characterId: string, characterName: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/characters/${characterId}/export-png`);
    if (!res.ok) throw new Error('Failed to export character PNG');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${characterName.replace(/[^a-z0-9_-]/gi, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
