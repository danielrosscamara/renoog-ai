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

  // Message Management & Multi-Swipe Reroll
  setSwipeIndex: (locationId: string, messageId: string, newIndex: number) => void;
  rerollUniverseMessage: (locationId: string, messageId: string) => Promise<void>;
  editUniverseMessage: (locationId: string, messageId: string, newContent: string) => void;
  deleteUniverseMessage: (locationId: string, messageId: string) => void;

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
        set({ activeLocationId: locationId });
      },

      moveToLocation: (toLocationId, accompanyingCharacterIds) => {
        const state = get();
        const {
          activeUniverse,
          locations,
          members,
          activeLocationId,
          messagesByLocation,
          timelineEvents,
          turnCount,
        } = state;

        if (!activeUniverse || !activeLocationId || activeLocationId === toLocationId) return;

        const fromLocation = locations.find((l) => l.id === activeLocationId);
        const targetLocation = locations.find((l) => l.id === toLocationId);
        if (!targetLocation) return;

        const now = new Date().toISOString();
        const nextTurn = turnCount + 1;

        // Determine which members travel with the user:
        // 1. The user always moves.
        // 2. If accompanyingCharacterIds is explicitly provided: only those matching characters currently in fromLocation move.
        // 3. If accompanyingCharacterIds is omitted: ALL characters currently in fromLocation travel with user.
        // Characters in OTHER rooms stay exactly where they are!
        const updatedMembers = members.map((m) => {
          if (m.entity_type === 'user') {
            return { ...m, current_location_id: toLocationId };
          }
          if (m.entity_type === 'character' && m.current_location_id === activeLocationId) {
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
            members.find((oldM) => oldM.id === m.id)?.current_location_id === activeLocationId
        );

        // Formulate dynamic narrative transition prose
        let travelNarrative: string;
        if (movedCompanions.length === 0) {
          travelNarrative = `*Departing ${fromLocation?.name || 'the previous room'} alone, you make your way toward ${targetLocation.name}. ${targetLocation.description}*`;
        } else if (movedCompanions.length === 1) {
          travelNarrative = `*Accompanied by ${movedCompanions[0].display_name}, you depart ${fromLocation?.name || 'the previous room'} and arrive at ${targetLocation.name}. ${targetLocation.description}*`;
        } else {
          const names = movedCompanions.map((c) => c.display_name).join(', ');
          travelNarrative = `*Alongside ${names}, you make your way from ${fromLocation?.name || 'the previous room'} to ${targetLocation.name}. ${targetLocation.description}*`;
        }

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

      setSwipeIndex: (locationId, messageId, newIndex) => {
        set((state) => {
          const roomMessages = state.messagesByLocation[locationId] || [];
          const updated = roomMessages.map((msg) => {
            if (msg.id === messageId) {
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

      rerollUniverseMessage: async (locationId, messageId) => {
        const state = get();
        if (state.isStreaming) return;

        const roomMessages = state.messagesByLocation[locationId] || [];
        const targetMsg = roomMessages.find((m) => m.id === messageId);
        if (!targetMsg || targetMsg.sender_type === 'user') return;

        const prevSwipeIndex = targetMsg.active_swipe_index;
        const newSwipeIndex = targetMsg.swipes.length;

        // Abort any existing in-flight generation
        if (activeUniverseAbortController) {
          activeUniverseAbortController.abort();
        }
        activeUniverseAbortController = new AbortController();
        const currentSignal = activeUniverseAbortController.signal;

        // Optimistically append empty candidate swipe
        set((s) => {
          const msgs = s.messagesByLocation[locationId] || [];
          const nextMsgs = msgs.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  swipes: [...m.swipes, ''],
                  active_swipe_index: newSwipeIndex,
                  content: '',
                }
              : m
          );
          return {
            isStreaming: true,
            streamingStage: targetMsg.sender_type === 'narrator' ? 'narrator' : 'character',
            streamingContent: '',
            messagesByLocation: {
              ...s.messagesByLocation,
              [locationId]: nextMsgs,
            },
          };
        });

        // Determine entity-specific generation candidates
        let candidateProse: string;
        if (targetMsg.sender_type === 'narrator') {
          const room = state.locations.find((l) => l.id === locationId);
          const variations = [
            `*A sudden draft rustles through ${room?.name || 'the room'}, carrying the distant murmur of the surrounding world. Shadows lengthen across the floor as ambient light flickers gently.*`,
            `*The atmosphere inside ${room?.name || 'the chamber'} settles into an expectant quiet. Outside, ambient currents pulse in steady rhythms, framing the occupants in contemplative silence.*`,
            `*A crisp hum resonates through the boundaries of ${room?.name || 'this space'}. The environmental air purifiers cycle with a soft sigh, revealing subtle sensory details previously overlooked.*`,
          ];
          candidateProse = variations.find((v) => !targetMsg.swipes.includes(v)) || variations[newSwipeIndex % variations.length];
        } else {
          // Character Dialogue Reroll
          const charMember = state.members.find(
            (m) => m.entity_id === targetMsg.sender_id || m.id === targetMsg.sender_id
          );
          const charName = charMember?.display_name || targetMsg.sender_name;
          const variations = [
            `*${charName} pauses for a thoughtful beat, tilting their head as they reconsider their words.* "Looking at it another way... maybe the path ahead isn't as perilous as we first thought. We just need to stay focused."`,
            `*A subtle change of expression passes over ${charName}'s face before they speak with renewed clarity.* "There is something else I should mention. Keep your senses sharp, traveler. We aren't the only ones watching this room."`,
            `*${charName} offers a reassuring nod, leaning slightly closer.* "No matter what unfolds next, we move together. What's your immediate call?"`,
          ];
          candidateProse = variations.find((v) => !targetMsg.swipes.includes(v)) || variations[newSwipeIndex % variations.length];
        }

        try {
          // Stream word-by-word with room-partitioned targeting and abort checks
          const words = candidateProse.split(' ');
          for (let i = 0; i < words.length; i++) {
            if (currentSignal.aborted) break;

            const token = (i === 0 ? '' : ' ') + words[i];
            set((s) => {
              const msgs = s.messagesByLocation[locationId] || [];
              const nextMsgs = msgs.map((m) => {
                if (m.id === messageId) {
                  const updatedSwipes = [...m.swipes];
                  const currentText = updatedSwipes[newSwipeIndex] || '';
                  const nextText = currentText + token;
                  updatedSwipes[newSwipeIndex] = nextText;
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

            // Realistic token pacing
            await new Promise((resolve) => setTimeout(resolve, 35));
          }

          if (currentSignal.aborted) {
            // If aborted with empty tokens, rollback
            const checkMsg = get().messagesByLocation[locationId]?.find((m) => m.id === messageId);
            if (!checkMsg?.swipes[newSwipeIndex] || checkMsg.swipes[newSwipeIndex].trim() === '') {
              set((s) => {
                const msgs = s.messagesByLocation[locationId] || [];
                const nextMsgs = msgs.map((m) => {
                  if (m.id === messageId) {
                    const pruned = m.swipes.slice(0, newSwipeIndex);
                    return {
                      ...m,
                      swipes: pruned,
                      active_swipe_index: prevSwipeIndex,
                      content: pruned[prevSwipeIndex] || m.content,
                    };
                  }
                  return m;
                });
                return {
                  messagesByLocation: { ...s.messagesByLocation, [locationId]: nextMsgs },
                };
              });
            }
          }
        } catch {
          // On exception, rollback empty swipe candidate
          set((s) => {
            const msgs = s.messagesByLocation[locationId] || [];
            const nextMsgs = msgs.map((m) => {
              if (m.id === messageId) {
                const pruned = m.swipes.slice(0, newSwipeIndex);
                return {
                  ...m,
                  swipes: pruned,
                  active_swipe_index: prevSwipeIndex,
                  content: pruned[prevSwipeIndex] || m.content,
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
        locations: state.locations,
        members: state.members,
        messagesByLocation: state.messagesByLocation,
        timelineEvents: state.timelineEvents,
        turnCount: state.turnCount,
      }),
    }
  )
);
