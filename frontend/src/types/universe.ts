/**
 * Renoog AI V2 — Universe & Spatial Simulation Contracts
 * Strict TypeScript models for the multi-entity Universe engine.
 */

// ==========================================
// 1. Navigation & Onboarding Contracts
// ==========================================

export type HomeDestination = 
  | 'characters' 
  | 'worlds' 
  | 'universes' 
  | 'favorites' 
  | 'settings';

export interface PersonaPreset {
  id: string;
  name: string;
  title: string;
  tagline: string;
  description: string;
  avatar_url: string;
  icon: string;
  traits: string[];
}

// ==========================================
// 2. Core Universe & Spatial Room Contracts
// ==========================================

export type EntityType = 'narrator' | 'character' | 'user';

export interface Universe {
  id: string;
  title: string;
  world_id: string | null;
  world_name?: string;
  config_preset?: string;
  active_location_id: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface UniverseSummary {
  id: string;
  title: string;
  world_name: string;
  active_location_name: string;
  member_count: number;
  updated_at: string;
  is_favorite: boolean;
}

export interface UniverseLocation {
  id: string;
  universe_id: string;
  name: string;
  description: string;
  created_by: 'user' | 'narrator' | 'system';
  created_at: string;
  occupant_count?: number;
}

export interface UniverseMember {
  id: string;
  universe_id: string;
  entity_type: EntityType;
  entity_id: string;
  display_name: string;
  avatar_url: string | null;
  current_location_id: string;
  is_active: boolean;
  joined_at: string;
}

// ==========================================
// 3. Dialogue Stream & Message Turns
// ==========================================

export interface UniverseMessage {
  id: string;
  universe_id: string;
  location_id: string;
  sender_type: EntityType;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  content: string;
  turn_number: number;
  active_swipe_index: number;
  swipes: string[];
  created_at: string;
}

// ==========================================
// 4. Timeline Ledger Contracts (HUD Tab 4)
// ==========================================

export type TimelineEventType = 
  | 'movement' 
  | 'conversation' 
  | 'environmental' 
  | 'encounter';

export interface TimelineEvent {
  id: string;
  universe_id: string;
  location_id: string;
  location_name?: string;
  event_type: TimelineEventType;
  summary: string;
  participant_names: string[];
  turn_number: number;
  timestamp: string;
}

// ==========================================
// 5. REST & SSE Wire Payloads
// ==========================================

export interface CreateUniverseRequest {
  title: string;
  world_id?: string;
  initial_character_id?: string;
  persona_id?: string;
}

export interface MoveLocationRequest {
  entity_id: string;
  from_location_id: string;
  to_location_id: string;
}

export interface UniverseTurnRequest {
  user_message: string;
  active_location_id: string;
  target_character_ids?: string[];
}
