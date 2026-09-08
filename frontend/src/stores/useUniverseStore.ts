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

// In-flight universe stream controller to cancel hanging generations
let activeUniverseAbortController: AbortController | null = null;

/**
 * Pure helper to dynamically derive room occupancy counts directly from the
 * single source of truth (the members array).
 * Guarantees zero arithmetic drift across 0, 1, 2, or N characters.
 */
const deriveLocationOccupancy = (
  locations: UniverseLocation[],
  members: UniverseMember[]
): UniverseLocation[] => {
  return locations.map((loc) => ({
    ...loc,
    occupant_count: members.filter(
      (m) => m.current_location_id === loc.id && m.entity_type !== 'narrator' && m.is_active
    ).length,
  }));
};

export interface UniverseState {
  // Active Simulation State
  activeUniverse: Universe | null;
  activeLocationId: string | null; // Kept in sync with viewedLocationId for backwards compatibility
  physicalLocationId: string | null; // Where the player's avatar body is located
  viewedLocationId: string | null; // Which room is currently rendered on screen in the cockpit
  locations: UniverseLocation[];
  members: UniverseMember[];
  messagesByLocation: Record<string, UniverseMessage[]>;
  timelineEvents: TimelineEvent[];
  turnCount: number;

  // Pending Travel Confirmation Modal State
  pendingTravel: {
    targetLocationId: string;
    availableCompanions: UniverseMember[];
  } | null;

  // Active Input Channel
  activeInputChannel: 'player' | 'director';

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
  addCharacterToUniverse: (
    character: Character,
    targetLocationId?: string
  ) => UniverseMember | null;
  setActiveUniverse: (universe: Universe | null) => void;
  setActiveLocation: (locationId: string) => void;
  moveToLocation: (
    toLocationId: string,
    accompanyingCharacterIds?: string[]
  ) => void;
  addUserMessage: (content: string) => void;
  addNarratorMessage: (content: string, locationId?: string) => void;
  addCharacterMessage: (characterId: string, content: string, locationId?: string) => void;

  // Spatial Spectator & Travel Confirmation Actions
  spectateLocation: (locationId: string) => void;
  returnToPhysicalLocation: () => void;
  openTravelConfirmation: (targetLocationId: string) => void;
  closeTravelConfirmation: () => void;
  confirmTravel: (targetLocationId: string, accompanyingCharacterIds?: string[]) => void;

  // Scene Progression & Directing Actions
  continueRoomScene: (locationId: string) => Promise<void>; // Zero-turn-increment scene beat
  directNarratorScene: (locationId: string, directive: string) => Promise<void>;
  setUserInputChannel: (channel: 'player' | 'director') => void;

  // Atomic Turn Scenario & Message Management
  setTurnSwipeIndex: (locationId: string, turnNumber: number, newIndex: number) => void;
  rerollEntireTurn: (locationId: string, turnNumber: number) => Promise<void>;
  editUniverseMessage: (locationId: string, messageId: string, newContent: string) => void;
  deleteUniverseMessage: (locationId: string, messageId: string) => void;
  getTurnSwipeInfo: (locationId: string, turnNumber: number) => { activeIndex: number; totalSwipes: number };

  setStreaming: (
    isStreaming: boolean,
    stage?: 'idle' | 'narrator' | 'character',
    content?: string
  ) => void;
  stopStreaming: () => void;
  resetUniverse: () => void;

  // Dynamic Room Selectors (Pure derivations from members)
  getLocationOccupants: (locationId: string) => UniverseMember[];
  getRoomOccupantCount: (locationId: string) => number;
}

export const useUniverseStore = create<UniverseState>()(
  persist(
    (set, get) => ({
      activeUniverse: null,
      activeLocationId: null,
      physicalLocationId: null,
      viewedLocationId: null,
      pendingTravel: null,
      activeInputChannel: 'player',
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
        const rawLocations: UniverseLocation[] = world.starter_locations.map((loc) => ({
          id: loc.id,
          universe_id: universeId,
          name: loc.name,
          description: loc.description,
          created_by: 'system',
          created_at: now,
          occupant_count: 0, // Computed dynamically below
        }));

        // 2. Instantiate the 3-Role Trinity members (Narrator, Initial Companion, User)
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

        // 3. Dynamically compute room occupancy from initial members
        const seededLocations = deriveLocationOccupancy(rawLocations, seededMembers);

        // 4. Formulate the opening ambient scene prose for the spawn room
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
        let initialTurnCount = 1;
        if (character.first_mes) {
          initialTurnCount = 2;
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

        // 5. Seed the initial timeline events ledger
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

        // 6. Build Universe Object
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
          physicalLocationId: spawnLocationId,
          viewedLocationId: spawnLocationId,
          pendingTravel: null,
          activeInputChannel: 'player',
          locations: seededLocations,
          members: seededMembers,
          messagesByLocation: {
            [spawnLocationId]: initialMessages,
          },
          timelineEvents: initialTimelineEvents,
          turnCount: initialTurnCount,
          isStreaming: false,
          streamingStage: 'idle',
          streamingContent: '',
        });

        return newUniverse;
      },

      addCharacterToUniverse: (character, targetLocationId) => {
        const state = get();
        const { activeUniverse, activeLocationId, locations, members, messagesByLocation, timelineEvents, turnCount } = state;
        if (!activeUniverse) return null;

        const targetLocId = targetLocationId || activeLocationId || activeUniverse.active_location_id || locations[0]?.id;
        if (!targetLocId) return null;

        const targetRoom = locations.find((l) => l.id === targetLocId);
        const now = new Date().toISOString();

        // Check if character already exists as a member
        const existingMember = members.find((m) => m.entity_id === character.id);
        if (existingMember) {
          // If inactive or in another room, reactivate / reposition
          const updatedMembers = members.map((m) =>
            m.id === existingMember.id ? { ...m, current_location_id: targetLocId, is_active: true } : m
          );
          const updatedLocations = deriveLocationOccupancy(locations, updatedMembers);
          set({ members: updatedMembers, locations: updatedLocations });
          return { ...existingMember, current_location_id: targetLocId, is_active: true };
        }

        // Create new character member
        const newMember: UniverseMember = {
          id: `mem_char_${character.id}_${Date.now()}`,
          universe_id: activeUniverse.id,
          entity_type: 'character',
          entity_id: character.id,
          display_name: character.name,
          avatar_url: character.avatar_url,
          current_location_id: targetLocId,
          is_active: true,
          joined_at: now,
        };

        const updatedMembers = [...members, newMember];
        const updatedLocations = deriveLocationOccupancy(locations, updatedMembers);
        const nextTurn = turnCount + 1;

        // Optionally append introduction dialogue if provided
        const roomMessages = messagesByLocation[targetLocId] || [];
        let updatedRoomMessages = [...roomMessages];

        if (character.first_mes) {
          const introMsg: UniverseMessage = {
            id: `msg_char_join_${Date.now()}`,
            universe_id: activeUniverse.id,
            location_id: targetLocId,
            sender_type: 'character',
            sender_id: character.id,
            sender_name: character.name,
            sender_avatar: character.avatar_url,
            content: character.first_mes,
            turn_number: nextTurn,
            active_swipe_index: 0,
            swipes: [character.first_mes],
            created_at: now,
          };
          updatedRoomMessages = [...roomMessages, introMsg];
        }

        // Log timeline encounter event
        const encounterEvent: TimelineEvent = {
          id: `tl_encounter_${Date.now()}`,
          universe_id: activeUniverse.id,
          location_id: targetLocId,
          location_name: targetRoom?.name,
          event_type: 'encounter',
          summary: `${character.name} joined the simulation in ${targetRoom?.name || 'the area'}`,
          participant_names: [character.name],
          turn_number: nextTurn,
          timestamp: now,
        };

        set({
          members: updatedMembers,
          locations: updatedLocations,
          messagesByLocation: {
            ...messagesByLocation,
            [targetLocId]: updatedRoomMessages,
          },
          timelineEvents: [encounterEvent, ...timelineEvents],
          turnCount: nextTurn,
        });

        return newMember;
      },

      setActiveUniverse: (universe) => {
        set({ activeUniverse: universe });
      },

      setActiveLocation: (locationId) => {
        set({
          activeLocationId: locationId,
          viewedLocationId: locationId,
        });
      },

      moveToLocation: (toLocationId, accompanyingCharacterIds) => {
        const state = get();
        const {
          activeUniverse,
          locations,
          members,
          physicalLocationId,
          activeLocationId,
          messagesByLocation,
          timelineEvents,
          turnCount,
        } = state;

        const currentOriginId = physicalLocationId || activeLocationId;
        if (!activeUniverse || !currentOriginId || currentOriginId === toLocationId) return;

        const fromLocation = locations.find((l) => l.id === currentOriginId);
        const targetLocation = locations.find((l) => l.id === toLocationId);
        if (!targetLocation) return;

        const now = new Date().toISOString();
        const nextTurn = turnCount + 1;

        // Determine which members travel with the user:
        // 1. The user always moves.
        // 2. If accompanyingCharacterIds is explicitly provided: only those matching characters currently in currentOriginId move.
        // 3. If accompanyingCharacterIds is omitted: ALL characters currently in currentOriginId travel with user.
        // Characters in OTHER rooms stay exactly where they are!
        const updatedMembers = members.map((m) => {
          if (m.entity_type === 'user') {
            return { ...m, current_location_id: toLocationId };
          }
          if (m.entity_type === 'character' && m.current_location_id === currentOriginId) {
            const shouldMove = accompanyingCharacterIds
              ? accompanyingCharacterIds.includes(m.entity_id) || accompanyingCharacterIds.includes(m.id)
              : true;

            if (shouldMove) {
              return { ...m, current_location_id: toLocationId };
            }
          }
          return m;
        });

        // Derive updated location occupant counts purely from the updated members
        const updatedLocations = deriveLocationOccupancy(locations, updatedMembers);

        // Identify companions who actually traveled
        const movedCompanions = updatedMembers.filter(
          (m) =>
            m.entity_type === 'character' &&
            m.current_location_id === toLocationId &&
            members.find((oldM) => oldM.id === m.id)?.current_location_id === currentOriginId
        );

        // 1. Dual-Room Departure Narrative in Origin Room (Room A)
        let departureNarrative: string;
        if (movedCompanions.length === 0) {
          departureNarrative = `*Stepping through the doorway alone, you leave ${fromLocation?.name || 'the room'} behind and make your way down the corridor toward ${targetLocation.name}.*`;
        } else if (movedCompanions.length === 1) {
          departureNarrative = `*Accompanied by ${movedCompanions[0].display_name}, you depart ${fromLocation?.name || 'the room'}, footsteps echoing into the passage toward ${targetLocation.name}.*`;
        } else {
          const names = movedCompanions.map((c) => c.display_name).join(', ');
          departureNarrative = `*Alongside ${names}, you depart ${fromLocation?.name || 'the room'} and make your way toward ${targetLocation.name}.*`;
        }

        const departureMessage: UniverseMessage = {
          id: `msg_narrator_depart_${Date.now()}`,
          universe_id: activeUniverse.id,
          location_id: currentOriginId,
          sender_type: 'narrator',
          sender_id: 'narrator',
          sender_name: 'Narrator',
          sender_avatar: null,
          content: departureNarrative,
          turn_number: nextTurn,
          active_swipe_index: 0,
          swipes: [departureNarrative],
          created_at: now,
        };

        // 2. Dual-Room Arrival Narrative in Destination Room (Room B)
        let arrivalNarrative: string;
        if (movedCompanions.length === 0) {
          arrivalNarrative = `*Departing ${fromLocation?.name || 'the previous room'} alone, you arrive at ${targetLocation.name}. ${targetLocation.description}*`;
        } else if (movedCompanions.length === 1) {
          arrivalNarrative = `*Accompanied by ${movedCompanions[0].display_name}, you arrive at ${targetLocation.name}. ${targetLocation.description}*`;
        } else {
          const names = movedCompanions.map((c) => c.display_name).join(', ');
          arrivalNarrative = `*Alongside ${names}, you arrive at ${targetLocation.name}. ${targetLocation.description}*`;
        }

        const arrivalMessage: UniverseMessage = {
          id: `msg_narrator_arrive_${Date.now()}`,
          universe_id: activeUniverse.id,
          location_id: toLocationId,
          sender_type: 'narrator',
          sender_id: 'narrator',
          sender_name: 'Narrator',
          sender_avatar: null,
          content: arrivalNarrative,
          turn_number: nextTurn,
          active_swipe_index: 0,
          swipes: [arrivalNarrative],
          created_at: now,
        };

        const existingOriginMessages = messagesByLocation[currentOriginId] || [];
        const existingTargetMessages = messagesByLocation[toLocationId] || [];

        // Log timeline movement event with the exact participants who traveled
        const participantNames = [
          ...movedCompanions.map((c) => c.display_name),
          updatedMembers.find((m) => m.entity_type === 'user')?.display_name || 'You',
        ];

        const newTimelineEvent: TimelineEvent = {
          id: `tl_move_${Date.now()}`,
          universe_id: activeUniverse.id,
          location_id: toLocationId,
          location_name: targetLocation.name,
          event_type: 'movement',
          summary: `Traveled from ${fromLocation?.name || 'room'} to ${targetLocation.name}${
            movedCompanions.length > 0 ? ` with ${movedCompanions.map((c) => c.display_name).join(', ')}` : ''
          }`,
          participant_names: participantNames,
          turn_number: nextTurn,
          timestamp: now,
        };

        set({
          physicalLocationId: toLocationId,
          viewedLocationId: toLocationId,
          activeLocationId: toLocationId,
          activeInputChannel: 'player',
          pendingTravel: null,
          locations: updatedLocations,
          members: updatedMembers,
          messagesByLocation: {
            ...messagesByLocation,
            [currentOriginId]: [...existingOriginMessages, departureMessage],
            [toLocationId]: [...existingTargetMessages, arrivalMessage],
          },
          timelineEvents: [newTimelineEvent, ...timelineEvents],
          turnCount: nextTurn,
        });
      },

      spectateLocation: (locationId) => {
        const state = get();
        set({
          viewedLocationId: locationId,
          activeLocationId: locationId,
          activeInputChannel: state.physicalLocationId === locationId ? 'player' : 'director',
        });
      },

      returnToPhysicalLocation: () => {
        const state = get();
        const target = state.physicalLocationId || state.locations[0]?.id || null;
        if (target) {
          set({
            viewedLocationId: target,
            activeLocationId: target,
            activeInputChannel: 'player',
          });
        }
      },

      openTravelConfirmation: (targetLocationId) => {
        const state = get();
        const originId = state.physicalLocationId || state.activeLocationId;
        const availableCompanions = state.members.filter(
          (m) => m.current_location_id === originId && m.entity_type === 'character' && m.is_active
        );
        set({
          pendingTravel: {
            targetLocationId,
            availableCompanions,
          },
        });
      },

      closeTravelConfirmation: () => {
        set({ pendingTravel: null });
      },

      confirmTravel: (targetLocationId, accompanyingCharacterIds) => {
        set({ pendingTravel: null });
        get().moveToLocation(targetLocationId, accompanyingCharacterIds);
      },

      continueRoomScene: async (locationId) => {
        const state = get();
        if (state.isStreaming) return;

        const { activeUniverse, messagesByLocation, members, turnCount } = state;
        if (!activeUniverse) return;

        const targetRoomMessages = messagesByLocation[locationId] || [];
        // Zero turn increment: reuse current turn or last message's turn number
        const currentTurn =
          targetRoomMessages.length > 0
            ? targetRoomMessages[targetRoomMessages.length - 1].turn_number
            : turnCount;

        const roomCompanions = members.filter(
          (m) => m.current_location_id === locationId && m.entity_type === 'character' && m.is_active
        );

        if (roomCompanions.length === 0) {
          const now = new Date().toISOString();
          const emptyAmbianceProse = `*The room remains still and quiet. The subtle ambient hum of the facility continues undisturbed.*`;
          const emptyAmbianceMsg: UniverseMessage = {
            id: `msg_narrator_beat_${Date.now()}`,
            universe_id: activeUniverse.id,
            location_id: locationId,
            sender_type: 'narrator',
            sender_id: 'narrator',
            sender_name: 'Narrator',
            sender_avatar: null,
            content: emptyAmbianceProse,
            turn_number: currentTurn,
            active_swipe_index: 0,
            swipes: [emptyAmbianceProse],
            created_at: now,
          };
          set({
            messagesByLocation: {
              ...messagesByLocation,
              [locationId]: [...targetRoomMessages, emptyAmbianceMsg],
            },
          });
          return;
        }

        const lastSpeaker = targetRoomMessages[targetRoomMessages.length - 1];
        const nextSpeaker =
          roomCompanions.find((c) => c.entity_id !== lastSpeaker?.sender_id) || roomCompanions[0];

        const sampleBeats = [
          `*She pauses, glancing over the readouts with a thoughtful expression.* "We should remain vigilant. The telemetry patterns haven't settled yet."`,
          `*Adjusting her stance, she takes a quiet breath and looks toward the console.* "If we proceed carefully, we can isolate the fluctuations without triggering a surge."`,
          `*She examines the surrounding instrumentation, nodding subtly to herself.* "Everything seems stable for the moment, but let's not let our guard down."`,
        ];
        const chosenBeat = sampleBeats[Math.floor(Math.random() * sampleBeats.length)];
        const now = new Date().toISOString();

        const beatMessage: UniverseMessage = {
          id: `msg_beat_${Date.now()}`,
          universe_id: activeUniverse.id,
          location_id: locationId,
          sender_type: 'character',
          sender_id: nextSpeaker.entity_id,
          sender_name: nextSpeaker.display_name,
          sender_avatar: nextSpeaker.avatar_url,
          content: chosenBeat,
          turn_number: currentTurn,
          active_swipe_index: 0,
          swipes: [chosenBeat],
          created_at: now,
        };

        set({
          messagesByLocation: {
            ...messagesByLocation,
            [locationId]: [...targetRoomMessages, beatMessage],
          },
        });
      },

      directNarratorScene: async (locationId, directive) => {
        const state = get();
        if (state.isStreaming || !directive.trim()) return;

        const { activeUniverse, messagesByLocation, members, turnCount } = state;
        if (!activeUniverse) return;

        const targetRoomMessages = messagesByLocation[locationId] || [];
        const nextTurn = turnCount + 1;
        const now = new Date().toISOString();

        // Stage 1: Improvised Narrator Event
        const improvisedNarratorProse = `*${directive.trim()} The atmosphere shifts abruptly, drawing immediate attention to the unexpected development.*`;

        const narratorEventMsg: UniverseMessage = {
          id: `msg_narrator_dir_${Date.now()}`,
          universe_id: activeUniverse.id,
          location_id: locationId,
          sender_type: 'narrator',
          sender_id: 'narrator',
          sender_name: 'Narrator',
          sender_avatar: null,
          content: improvisedNarratorProse,
          turn_number: nextTurn,
          active_swipe_index: 0,
          swipes: [improvisedNarratorProse],
          created_at: now,
        };

        // Stage 2: Companion Reactions
        const roomCompanions = members.filter(
          (m) => m.current_location_id === locationId && m.entity_type === 'character' && m.is_active
        );

        const companionReactionMsgs: UniverseMessage[] = roomCompanions.map((comp, idx) => {
          const reactionProse = `*${comp.display_name} reacts swiftly, eyes widening as she assesses the sudden disturbance.* "Did you feel that? What caused that sudden shift?"`;
          return {
            id: `msg_reaction_${Date.now()}_${idx}`,
            universe_id: activeUniverse.id,
            location_id: locationId,
            sender_type: 'character',
            sender_id: comp.entity_id,
            sender_name: comp.display_name,
            sender_avatar: comp.avatar_url,
            content: reactionProse,
            turn_number: nextTurn,
            active_swipe_index: 0,
            swipes: [reactionProse],
            created_at: new Date(Date.now() + (idx + 1) * 50).toISOString(),
          };
        });

        set({
          messagesByLocation: {
            ...messagesByLocation,
            [locationId]: [...targetRoomMessages, narratorEventMsg, ...companionReactionMsgs],
          },
          turnCount: nextTurn,
        });
      },

      setUserInputChannel: (channel) => {
        set({ activeInputChannel: channel });
      },

      addUserMessage: (content) => {
        const state = get();
        const {
          activeUniverse,
          activeLocationId,
          physicalLocationId,
          messagesByLocation,
          members,
          turnCount,
          activeInputChannel,
        } = state;
        if (!activeUniverse || !content.trim()) return;

        // If in Director Mode: Route to directNarratorScene!
        if (activeInputChannel === 'director') {
          const targetLoc = activeLocationId || physicalLocationId;
          if (targetLoc) {
            get().directNarratorScene(targetLoc, content.trim());
          }
          return;
        }

        // In-Character Player Voice:
        const targetLocId = physicalLocationId || activeLocationId;
        if (!targetLocId) return;

        const userMember = members.find((m) => m.entity_type === 'user');
        const now = new Date().toISOString();
        const nextTurn = turnCount + 1;

        const newMessage: UniverseMessage = {
          id: `msg_user_${Date.now()}`,
          universe_id: activeUniverse.id,
          location_id: targetLocId,
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

        const roomMessages = messagesByLocation[targetLocId] || [];

        set({
          messagesByLocation: {
            ...messagesByLocation,
            [targetLocId]: [...roomMessages, newMessage],
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

      stopStreaming: () => {
        if (activeUniverseAbortController) {
          activeUniverseAbortController.abort();
          activeUniverseAbortController = null;
        }
        set({
          isStreaming: false,
          streamingStage: 'idle',
          streamingContent: '',
        });
      },

      setTurnSwipeIndex: (locationId, turnNumber, newIndex) => {
        set((state) => {
          const roomMessages = state.messagesByLocation[locationId] || [];
          const updated = roomMessages.map((msg) => {
            if (msg.turn_number === turnNumber && msg.sender_type !== 'user') {
              const clampedIndex = Math.max(0, Math.min(newIndex, msg.swipes.length - 1));
              return {
                ...msg,
                active_swipe_index: clampedIndex,
                content: msg.swipes[clampedIndex] || msg.content,
              };
            }
            return msg;
          });
          return {
            messagesByLocation: {
              ...state.messagesByLocation,
              [locationId]: updated,
            },
          };
        });
      },

      getTurnSwipeInfo: (locationId, turnNumber) => {
        const roomMessages = get().messagesByLocation[locationId] || [];
        const aiTurnMessages = roomMessages.filter(
          (m) => m.turn_number === turnNumber && m.sender_type !== 'user'
        );
        if (aiTurnMessages.length === 0) {
          return { activeIndex: 0, totalSwipes: 1 };
        }
        const activeIndex = aiTurnMessages[0]?.active_swipe_index || 0;
        const totalSwipes = Math.max(...aiTurnMessages.map((m) => m.swipes.length), 1);
        return { activeIndex, totalSwipes };
      },

      editUniverseMessage: (locationId, messageId, newContent) => {
        set((state) => {
          const roomMessages = state.messagesByLocation[locationId] || [];
          const updated = roomMessages.map((msg) => {
            if (msg.id === messageId) {
              const updatedSwipes = [...msg.swipes];
              if (updatedSwipes.length > 0) {
                updatedSwipes[msg.active_swipe_index] = newContent.trim();
              } else {
                updatedSwipes.push(newContent.trim());
              }
              return {
                ...msg,
                content: newContent.trim(),
                swipes: updatedSwipes,
              };
            }
            return msg;
          });
          return {
            messagesByLocation: {
              ...state.messagesByLocation,
              [locationId]: updated,
            },
          };
        });
      },

      deleteUniverseMessage: (locationId, messageId) => {
        set((state) => {
          const roomMessages = state.messagesByLocation[locationId] || [];
          const updated = roomMessages.filter((msg) => msg.id !== messageId);
          return {
            messagesByLocation: {
              ...state.messagesByLocation,
              [locationId]: updated,
            },
          };
        });
      },

      rerollEntireTurn: async (locationId, turnNumber) => {
        const state = get();
        if (state.isStreaming) return;

        const roomMessages = state.messagesByLocation[locationId] || [];
        const aiTurnMessages = roomMessages.filter(
          (m) => m.turn_number === turnNumber && m.sender_type !== 'user'
        );
        if (aiTurnMessages.length === 0) return;

        // Abort any active in-flight stream
        if (activeUniverseAbortController) {
          activeUniverseAbortController.abort();
        }
        activeUniverseAbortController = new AbortController();
        const currentSignal = activeUniverseAbortController.signal;

        // Capture previous indices for rollback if needed
        const prevIndices: Record<string, number> = {};
        const newIndices: Record<string, number> = {};

        aiTurnMessages.forEach((m) => {
          prevIndices[m.id] = m.active_swipe_index;
          newIndices[m.id] = m.swipes.length;
        });

        // Optimistically append empty swipe candidates across all AI messages in this turn
        set((s) => {
          const msgs = s.messagesByLocation[locationId] || [];
          const updated = msgs.map((m) => {
            if (m.turn_number === turnNumber && m.sender_type !== 'user') {
              const targetNewIndex = newIndices[m.id];
              return {
                ...m,
                swipes: [...m.swipes, ''],
                active_swipe_index: targetNewIndex,
                content: '',
              };
            }
            return m;
          });
          return {
            isStreaming: true,
            streamingStage: 'narrator',
            streamingContent: '',
            messagesByLocation: {
              ...s.messagesByLocation,
              [locationId]: updated,
            },
          };
        });

        try {
          // Sequentially regenerate each message in the turn: Stage 1 (Narrator) -> Stage 2 (Companions)
          for (const targetMsg of aiTurnMessages) {
            if (currentSignal.aborted) break;

            const isNarrator = targetMsg.sender_type === 'narrator';
            set({ streamingStage: isNarrator ? 'narrator' : 'character' });

            let candidateProse: string;
            if (isNarrator) {
              const room = state.locations.find((l) => l.id === locationId);
              const variations = [
                `*A heavy stillness blankets ${room?.name || 'the room'} before the subtle rhythm of the environment shifts. Shadows stretch across the floor, painting the chamber in quiet, atmospheric tones.*`,
                `*The ambient hum of ${room?.name || 'the area'} ebbs into a momentary lull. Air purifiers pulse softly overhead, revealing the intimate cadence of breathing and quiet movement.*`,
                `*A cool cross-breeze sweeps through ${room?.name || 'the surroundings'}, stirring suspended particles of dust and incense in the gentle lantern glow.*`,
              ];
              candidateProse = variations.find((v) => !targetMsg.swipes.includes(v)) || variations[newIndices[targetMsg.id] % variations.length];
            } else {
              const charMember = state.members.find(
                (m) => m.entity_id === targetMsg.sender_id || m.id === targetMsg.sender_id
              );
              const charName = charMember?.display_name || targetMsg.sender_name;
              const variations = [
                `*${charName} sets their attention squarely on you, eyes brightening with genuine curiosity.* "Every turn in this journey brings another mystery. Tell me, what's our next course of action?"`,
                `*A quiet smile tugs at ${charName}'s lips as they observe the room.* "No need to overthink it. As long as we stay coordinated, there's nothing here we can't handle."`,
                `*${charName} leans back slightly, exhaling a calm breath into the room.* "I trust your instinct on this one. Whenever you're ready, lead the way."`,
              ];
              candidateProse = variations.find((v) => !targetMsg.swipes.includes(v)) || variations[newIndices[targetMsg.id] % variations.length];
            }

            // Stream word-by-word into targetMsg's new swipe candidate
            const targetSwipeIndex = newIndices[targetMsg.id];
            const words = candidateProse.split(' ');
            for (let i = 0; i < words.length; i++) {
              if (currentSignal.aborted) break;

              const token = (i === 0 ? '' : ' ') + words[i];
              set((s) => {
                const msgs = s.messagesByLocation[locationId] || [];
                const nextMsgs = msgs.map((m) => {
                  if (m.id === targetMsg.id) {
                    const updatedSwipes = [...m.swipes];
                    const currentText = updatedSwipes[targetSwipeIndex] || '';
                    const nextText = currentText + token;
                    updatedSwipes[targetSwipeIndex] = nextText;
                    return {
                      ...m,
                      swipes: updatedSwipes,
                      content: nextText,
                    };
                  }
                  return m;
                });
                return {
                  messagesByLocation: { ...s.messagesByLocation, [locationId]: nextMsgs },
                  streamingContent: (s.streamingContent || '') + token,
                };
              });

              await new Promise((resolve) => setTimeout(resolve, 30));
            }

            // Brief pause between characters in the turn
            if (!currentSignal.aborted) {
              await new Promise((resolve) => setTimeout(resolve, 150));
            }
          }

          if (currentSignal.aborted) {
            // Rollback any empty swipe candidates
            set((s) => {
              const msgs = s.messagesByLocation[locationId] || [];
              const nextMsgs = msgs.map((m) => {
                if (m.turn_number === turnNumber && m.sender_type !== 'user') {
                  const targetIdx = newIndices[m.id];
                  if (!m.swipes[targetIdx] || m.swipes[targetIdx].trim() === '') {
                    const pruned = m.swipes.slice(0, targetIdx);
                    const rollbackIdx = prevIndices[m.id] ?? 0;
                    return {
                      ...m,
                      swipes: pruned,
                      active_swipe_index: rollbackIdx,
                      content: pruned[rollbackIdx] || m.content,
                    };
                  }
                }
                return m;
              });
              return {
                messagesByLocation: { ...s.messagesByLocation, [locationId]: nextMsgs },
              };
            });
          }
        } catch {
          // On exception, rollback all empty candidate swipes
          set((s) => {
            const msgs = s.messagesByLocation[locationId] || [];
            const nextMsgs = msgs.map((m) => {
              if (m.turn_number === turnNumber && m.sender_type !== 'user') {
                const targetIdx = newIndices[m.id];
                const pruned = m.swipes.slice(0, targetIdx);
                const rollbackIdx = prevIndices[m.id] ?? 0;
                return {
                  ...m,
                  swipes: pruned,
                  active_swipe_index: rollbackIdx,
                  content: pruned[rollbackIdx] || m.content,
                };
              }
              return m;
            });
            return {
              messagesByLocation: { ...s.messagesByLocation, [locationId]: nextMsgs },
            };
          });
        } finally {
          if (activeUniverseAbortController?.signal === currentSignal) {
            activeUniverseAbortController = null;
          }
          set({
            isStreaming: false,
            streamingStage: 'idle',
            streamingContent: '',
          });
        }
      },

      resetUniverse: () => {
        set({
          activeUniverse: null,
          activeLocationId: null,
          physicalLocationId: null,
          viewedLocationId: null,
          pendingTravel: null,
          activeInputChannel: 'player',
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

      // Dynamic Selectors
      getLocationOccupants: (locationId) => {
        return get().members.filter(
          (m) => m.current_location_id === locationId && m.entity_type !== 'narrator' && m.is_active
        );
      },

      getRoomOccupantCount: (locationId) => {
        return get().getLocationOccupants(locationId).length;
      },
    }),
    {
      name: 'renoog_v2_universe_store',
      partialize: (state) => ({
        activeUniverse: state.activeUniverse,
        activeLocationId: state.activeLocationId,
        physicalLocationId: state.physicalLocationId,
        viewedLocationId: state.viewedLocationId,
        activeInputChannel: state.activeInputChannel,
        locations: state.locations,
        members: state.members,
        messagesByLocation: state.messagesByLocation,
        timelineEvents: state.timelineEvents,
        turnCount: state.turnCount,
      }),
    }
  )
);
