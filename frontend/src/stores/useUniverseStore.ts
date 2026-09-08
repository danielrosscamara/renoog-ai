import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Universe,
  UniverseLocation,
  UniverseMember,
  UniverseMessage,
  TimelineEvent,
  PersonaPreset,
} from '../types/universe';
import type { Character } from '../types';
import type { WorldPreset } from '../data/worldPresets';
import { DEFAULT_PERSONA_PRESET } from '../data/personaPresets';

export interface UniverseState {
  // Active Simulation State
  activeUniverse: Universe | null;
  activeLocationId: string | null;
  locations: UniverseLocation[];
  members: UniverseMember[];
  messagesByLocation: Record<string, UniverseMessage[]>;
  timelineEvents: TimelineEvent[];
  turnCount: number;

  // Streaming State (Dual-Stage Pipeline)
  isStreaming: boolean;
  streamingStage: 'idle' | 'narrator' | 'character';
  streamingContent: string;

  // Actions
  createUniverseFromPairing: (
    character: Character,
    world: WorldPreset,
    title: string,
    personaPreset?: PersonaPreset
  ) => Universe;
  setActiveUniverse: (universe: Universe | null) => void;
  setActiveLocation: (locationId: string) => void;
  moveToLocation: (toLocationId: string) => void;
  addUserMessage: (content: string) => void;
  addNarratorMessage: (content: string, locationId?: string) => void;
  addCharacterMessage: (characterId: string, content: string, locationId?: string) => void;
  setStreaming: (
    isStreaming: boolean,
    stage?: 'idle' | 'narrator' | 'character',
    content?: string
  ) => void;
  resetUniverse: () => void;
}

export const useUniverseStore = create<UniverseState>()(
  persist(
    (set, get) => ({
      activeUniverse: null,
      activeLocationId: null,
      locations: [],
      members: [],
      messagesByLocation: {},
      timelineEvents: [],
      turnCount: 0,

      isStreaming: false,
      streamingStage: 'idle',
      streamingContent: '',

      createUniverseFromPairing: (
        character: Character,
        world: WorldPreset,
        title: string,
        personaPreset?: PersonaPreset
      ): Universe => {
        const universeId = `uni_${Date.now()}`;
        const activePersona = personaPreset || DEFAULT_PERSONA_PRESET;
        const now = new Date().toISOString();
        const spawnLocationId = world.default_location_id;

        // 1. Instantiate the physical rooms seeded by the World Lorebook
        const seededLocations: UniverseLocation[] = world.starter_locations.map((loc) => ({
          id: loc.id,
          universe_id: universeId,
          name: loc.name,
          description: loc.description,
          created_by: 'system',
          created_at: now,
          occupant_count: loc.id === spawnLocationId ? 2 : 0, // User + Initial Companion
        }));

        // 2. Instantiate the 3-Role Trinity members (Narrator, Character, User)
        const seededMembers: UniverseMember[] = [
          {
            id: `mem_narrator_${universeId}`,
            universe_id: universeId,
            entity_type: 'narrator',
            entity_id: 'narrator',
            display_name: 'Narrator',
            avatar_url: null,
            current_location_id: spawnLocationId,
            is_active: true,
            joined_at: now,
          },
          {
            id: `mem_char_${character.id}`,
            universe_id: universeId,
            entity_type: 'character',
            entity_id: character.id,
            display_name: character.name,
            avatar_url: character.avatar_url,
            current_location_id: spawnLocationId,
            is_active: true,
            joined_at: now,
          },
          {
            id: `mem_user_${activePersona.id}`,
            universe_id: universeId,
            entity_type: 'user',
            entity_id: activePersona.id,
            display_name: activePersona.name,
            avatar_url: activePersona.avatar_url,
            current_location_id: spawnLocationId,
            is_active: true,
            joined_at: now,
          },
        ];

        // 3. Formulate the opening ambient scene prose for the spawn room
        const spawnRoom =
          world.starter_locations.find((l) => l.id === spawnLocationId) || world.starter_locations[0];
        const openingNarratorProse = `*${spawnRoom.description} Above, the ambiance of ${world.name} hangs heavy in the air.*`;

        const initialMessages: UniverseMessage[] = [
          {
            id: `msg_narrator_intro_${Date.now()}`,
            universe_id: universeId,
            location_id: spawnLocationId,
            sender_type: 'narrator',
            sender_id: 'narrator',
            sender_name: 'Narrator',
            sender_avatar: null,
            content: openingNarratorProse,
            turn_number: 1,
            active_swipe_index: 0,
            swipes: [openingNarratorProse],
            created_at: now,
          },
        ];

        // If companion has a first message / opening greeting, append as Turn 2
        if (character.first_mes) {
          initialMessages.push({
            id: `msg_char_first_${Date.now()}`,
            universe_id: universeId,
            location_id: spawnLocationId,
            sender_type: 'character',
            sender_id: character.id,
            sender_name: character.name,
            sender_avatar: character.avatar_url,
            content: character.first_mes,
            turn_number: 2,
            active_swipe_index: 0,
            swipes: [character.first_mes],
            created_at: new Date(Date.now() + 100).toISOString(),
          });
        }

        // 4. Seed the initial timeline events ledger
        const initialTimelineEvents: TimelineEvent[] = [
          {
            id: `tl_genesis_${Date.now()}`,
            universe_id: universeId,
            location_id: spawnLocationId,
            location_name: spawnRoom.name,
            event_type: 'movement',
            summary: `Arrived in ${spawnRoom.name} with ${character.name}`,
            participant_names: [activePersona.name, character.name],
            turn_number: 1,
            timestamp: now,
          },
        ];

        // 5. Build Universe Object
        const newUniverse: Universe = {
          id: universeId,
          title: title.trim() || `${character.name} in ${world.name}`,
          world_id: world.id,
          world_name: world.name,
          config_preset: 'default',
          active_location_id: spawnLocationId,
          is_favorite: false,
          created_at: now,
          updated_at: now,
        };

        // Update state
        set({
          activeUniverse: newUniverse,
          activeLocationId: spawnLocationId,
          locations: seededLocations,
          members: seededMembers,
          messagesByLocation: {
            [spawnLocationId]: initialMessages,
          },
          timelineEvents: initialTimelineEvents,
          turnCount: character.first_mes ? 2 : 1,
          isStreaming: false,
          streamingStage: 'idle',
          streamingContent: '',
        });

        return newUniverse;
      },

      setActiveUniverse: (universe) => {
        set({ activeUniverse: universe });
      },

      setActiveLocation: (locationId) => {
        set({ activeLocationId: locationId });
      },

      moveToLocation: (toLocationId) => {
        const state = get();
        const { activeUniverse, locations, members, activeLocationId, messagesByLocation, timelineEvents, turnCount } = state;
        if (!activeUniverse || !activeLocationId || activeLocationId === toLocationId) return;

        const fromLocation = locations.find((l) => l.id === activeLocationId);
        const targetLocation = locations.find((l) => l.id === toLocationId);
        if (!targetLocation) return;

        const now = new Date().toISOString();
        const nextTurn = turnCount + 1;

        // Move user and active characters to target location
        const updatedMembers = members.map((m) => {
          if (m.entity_type === 'user' || m.entity_type === 'character') {
            return { ...m, current_location_id: toLocationId };
          }
          return m;
        });

        // Update occupant counts
        const updatedLocations = locations.map((loc) => {
          if (loc.id === toLocationId) {
            return { ...loc, occupant_count: (loc.occupant_count || 0) + 2 };
          }
          if (loc.id === activeLocationId) {
            return { ...loc, occupant_count: Math.max(0, (loc.occupant_count || 0) - 2) };
          }
          return loc;
        });

        // Narrator transition prose
        const travelNarrative = `*Departing ${fromLocation?.name || 'the previous room'}, you make your way toward ${targetLocation.name}. ${targetLocation.description}*`;

        const transitionMessage: UniverseMessage = {
          id: `msg_narrator_travel_${Date.now()}`,
          universe_id: activeUniverse.id,
          location_id: toLocationId,
          sender_type: 'narrator',
          sender_id: 'narrator',
          sender_name: 'Narrator',
          sender_avatar: null,
          content: travelNarrative,
          turn_number: nextTurn,
          active_swipe_index: 0,
          swipes: [travelNarrative],
          created_at: now,
        };

        const existingRoomMessages = messagesByLocation[toLocationId] || [];

        // Log timeline movement event
        const newTimelineEvent: TimelineEvent = {
          id: `tl_move_${Date.now()}`,
          universe_id: activeUniverse.id,
          location_id: toLocationId,
          location_name: targetLocation.name,
          event_type: 'movement',
          summary: `Traveled from ${fromLocation?.name || 'room'} to ${targetLocation.name}`,
          participant_names: updatedMembers.filter((m) => m.entity_type !== 'narrator').map((m) => m.display_name),
          turn_number: nextTurn,
          timestamp: now,
        };

        set({
          activeLocationId: toLocationId,
          locations: updatedLocations,
          members: updatedMembers,
          messagesByLocation: {
            ...messagesByLocation,
            [toLocationId]: [...existingRoomMessages, transitionMessage],
          },
          timelineEvents: [newTimelineEvent, ...timelineEvents],
          turnCount: nextTurn,
        });
      },

      addUserMessage: (content) => {
        const state = get();
        const { activeUniverse, activeLocationId, messagesByLocation, members, turnCount } = state;
        if (!activeUniverse || !activeLocationId || !content.trim()) return;

        const userMember = members.find((m) => m.entity_type === 'user');
        const now = new Date().toISOString();
        const nextTurn = turnCount + 1;

        const newMessage: UniverseMessage = {
          id: `msg_user_${Date.now()}`,
          universe_id: activeUniverse.id,
          location_id: activeLocationId,
          sender_type: 'user',
          sender_id: userMember?.id || 'user',
          sender_name: userMember?.display_name || 'You',
          sender_avatar: userMember?.avatar_url || null,
          content: content.trim(),
          turn_number: nextTurn,
          active_swipe_index: 0,
          swipes: [content.trim()],
          created_at: now,
        };

        const roomMessages = messagesByLocation[activeLocationId] || [];

        set({
          messagesByLocation: {
            ...messagesByLocation,
            [activeLocationId]: [...roomMessages, newMessage],
          },
          turnCount: nextTurn,
        });
      },

      addNarratorMessage: (content, locationId) => {
        const state = get();
        const { activeUniverse, activeLocationId, messagesByLocation, turnCount } = state;
        const targetLocId = locationId || activeLocationId;
        if (!activeUniverse || !targetLocId || !content.trim()) return;

        const now = new Date().toISOString();
        const nextTurn = turnCount + 1;

        const newMessage: UniverseMessage = {
          id: `msg_narrator_${Date.now()}`,
          universe_id: activeUniverse.id,
          location_id: targetLocId,
          sender_type: 'narrator',
          sender_id: 'narrator',
          sender_name: 'Narrator',
          sender_avatar: null,
          content: content.trim(),
          turn_number: nextTurn,
          active_swipe_index: 0,
          swipes: [content.trim()],
          created_at: now,
        };

        const roomMessages = messagesByLocation[targetLocId] || [];

        set({
          messagesByLocation: {
            ...messagesByLocation,
            [targetLocId]: [...roomMessages, newMessage],
          },
          turnCount: nextTurn,
        });
      },

      addCharacterMessage: (characterId, content, locationId) => {
        const state = get();
        const { activeUniverse, activeLocationId, messagesByLocation, members, turnCount } = state;
        const targetLocId = locationId || activeLocationId;
        if (!activeUniverse || !targetLocId || !content.trim()) return;

        const charMember = members.find((m) => m.entity_id === characterId || m.id === characterId);
        const now = new Date().toISOString();
        const nextTurn = turnCount + 1;

        const newMessage: UniverseMessage = {
          id: `msg_char_${Date.now()}`,
          universe_id: activeUniverse.id,
          location_id: targetLocId,
          sender_type: 'character',
          sender_id: characterId,
          sender_name: charMember?.display_name || 'Companion',
          sender_avatar: charMember?.avatar_url || null,
          content: content.trim(),
          turn_number: nextTurn,
          active_swipe_index: 0,
          swipes: [content.trim()],
          created_at: now,
        };

        const roomMessages = messagesByLocation[targetLocId] || [];

        set({
          messagesByLocation: {
            ...messagesByLocation,
            [targetLocId]: [...roomMessages, newMessage],
          },
          turnCount: nextTurn,
        });
      },

      setStreaming: (isStreaming, stage = 'idle', content = '') => {
        set({
          isStreaming,
          streamingStage: stage,
          streamingContent: content,
        });
      },

      resetUniverse: () => {
        set({
          activeUniverse: null,
          activeLocationId: null,
          locations: [],
          members: [],
          messagesByLocation: {},
          timelineEvents: [],
          turnCount: 0,
          isStreaming: false,
          streamingStage: 'idle',
          streamingContent: '',
        });
      },
    }),
    {
      name: 'renoog_v2_universe_store',
      partialize: (state) => ({
        activeUniverse: state.activeUniverse,
        activeLocationId: state.activeLocationId,
        locations: state.locations,
        members: state.members,
        messagesByLocation: state.messagesByLocation,
        timelineEvents: state.timelineEvents,
        turnCount: state.turnCount,
      }),
    }
  )
);
