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

export interface AppSettings {
  openrouter_api_key: string;
  selected_model: string;
  custom_temperature: number;
  telemetry_enabled: boolean;
  theme: 'dark' | 'light';
}
