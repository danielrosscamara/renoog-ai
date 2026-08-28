export interface PromptItem {
  id: string;
  name: string;
  role: 'system' | 'user' | 'assistant';
  position: 'relative' | 'depth';
  depth?: number;
  content: string;
  enabled: boolean;
  trim?: boolean;
  order: number;
}

export interface Character {
  id: string;
  name: string;
  tagline: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example?: string;
  avatar_url: string;
  wallpaper_url?: string;
  prompt_items?: PromptItem[];
  tags: string[];
  is_favorite: boolean;
  is_hidden?: boolean;
  creator: string;
  created_at: string;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  avatar_url: string;
  is_default: boolean;
}

export interface MessageTurn {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  active_index: number;
  swipes: string[];
  created_at: string;
  persona_id?: string;
  model_name?: string;
  is_pinned?: boolean;
}

export interface Chat {
  id: string;
  character_id: string;
  persona_id: string | null;
  title: string;
  model_name: string;
  temperature: number;
  is_pinned: boolean;
  updated_at: string;
}

export type ViewType = 'chat' | 'gallery' | 'personas' | 'settings' | 'studio' | 'character-studio';

export type LLMProvider = 'openrouter' | 'ollama' | 'custom';

export interface AppSettings {
  provider: LLMProvider;
  openrouter_api_key: string;
  selected_model: string;
  ollama_base_url: string;
  ollama_model: string;
  custom_endpoint_url: string;
  custom_api_key?: string;
  custom_temperature: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  repetition_penalty: number;
  max_tokens: number;
  anti_impersonation: boolean;
  enable_auxiliary_prompt?: boolean;
  auxiliary_prompt?: string;
  theme: 'dark' | 'light';
}

