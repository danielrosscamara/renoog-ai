import React, { useState, useEffect, useCallback } from 'react';
import { X, Compass, Eye, ArrowRight, MapPin, Users, Sparkles, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import type { UniverseLocation, UniverseMember } from '../../types/universe';
import { useUniverseStore } from '../../stores/useUniverseStore';

export interface LocationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSpectate?: (locationId: string) => void;
  onSelectEnter?: (locationId: string) => void;
}

/**
 * LocationDrawer
 *
 * Slide-over spatial room navigator for Renoog AI V2.
 * Allows the player to inspect all discovered rooms in the universe, view live
 * multi-avatar occupant stacks, remotely spectate other rooms via surveillance,
 * or trigger physical room transitions via the TravelConfirmationModal.
 */
export const LocationDrawer: React.FC<LocationDrawerProps> = ({
  isOpen,
  onClose,
  onSelectSpectate,
  onSelectEnter,
}) => {
  const locations = useUniverseStore((state) => state.locations);
  const physicalLocationId = useUniverseStore((state) => state.physicalLocationId);
  const viewedLocationId = useUniverseStore((state) => state.viewedLocationId);
  const activeLocationId = useUniverseStore((state) => state.activeLocationId);
  const spectateLocation = useUniverseStore((state) => state.spectateLocation);
  const openTravelConfirmation = useUniverseStore((state) => state.openTravelConfirmation);
  const getLocationOccupants = useUniverseStore((state) => state.getLocationOccupants);

  const currentPhysicalId = physicalLocationId || activeLocationId || locations[0]?.id || null;
  const currentPhysicalRoom = locations.find((l) => l.id === currentPhysicalId) || null;
  const otherRooms = locations.filter((l) => l.id !== currentPhysicalId);

  // Expanded room ID for occupant dropdown accordion
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);

  const toggleRoomOccupants = (roomId: string) => {
    setExpandedRoomId((prev) => (prev === roomId ? null : roomId));
  };

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Handle escape key and body scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleClose]);

  if (!isOpen) {
    return null;
  }

  const handleSpectateClick = (locationId: string) => {
    if (onSelectSpectate) {
      onSelectSpectate(locationId);
    } else {
      spectateLocation(locationId);
    }
    handleClose();
  };

  const handleEnterClick = (locationId: string) => {
    if (onSelectEnter) {
      onSelectEnter(locationId);
    } else {
      openTravelConfirmation(locationId);
    }
    handleClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-drawer-title"
    >
      {/* Dimmed Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity cursor-pointer animate-in fade-in duration-200"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Slide-Over Holo-Drawer Container */}
      <aside className="relative w-full max-w-lg bg-[#111114] border-l border-[#222228] h-full shadow-2xl flex flex-col z-10 overflow-hidden animate-in slide-in-from-right duration-300">
        {/* DRAWER HEADER */}
        <div className="p-5 border-b border-[#202026] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 id="location-drawer-title" className="text-sm font-bold text-white tracking-tight">
                Location Navigator
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close Locations Drawer"
            className="p-2 rounded-xl bg-[#18181f] text-zinc-400 hover:text-white border border-white/5 hover:border-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SCROLLABLE DRAWER BODY */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* SECTION 1: CURRENT PHYSICAL LOCATION */}
          {currentPhysicalRoom && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-2.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Current Physical Location
              </label>

              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{currentPhysicalRoom.name}</span>
                    </h3>
                    <p className="text-xs text-zinc-300 mt-1 leading-relaxed italic font-serif">
                      "{currentPhysicalRoom.description}"
                    </p>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    You Are Here
                  </span>
                </div>

                {/* Occupants Stack in Current Room */}
                {(() => {
                  const occupants = getLocationOccupants(currentPhysicalRoom.id);
                  const isExpanded = expandedRoomId === currentPhysicalRoom.id;
                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleRoomOccupants(currentPhysicalRoom.id)}
                        className="w-full pt-2 border-t border-amber-500/15 flex items-center justify-between text-left cursor-pointer group"
                      >
                        <span className="text-[11px] font-medium text-zinc-400 group-hover:text-amber-300 flex items-center gap-1.5 transition-colors">
                          <Users className="w-3.5 h-3.5 text-zinc-500 group-hover:text-amber-400" />
                          <span>Occupants ({occupants.length})</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3 text-amber-400" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300" />
                          )}
                        </span>

                        <div className="flex items-center -space-x-2">
                          {occupants.map((member: UniverseMember) => (
                            <img
                              key={member.id}
                              src={
                                member.avatar_url ||
                                (member.entity_type === 'user'
                                  ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
                                  : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100')
                              }
                              alt={member.display_name}
                              title={`${member.display_name}${member.entity_type === 'user' ? ' (You)' : ''}`}
                              className="w-7 h-7 rounded-full object-cover ring-2 ring-[#141417]"
                            />
                          ))}
                        </div>
                      </button>

                      {/* Dropdown Accordion for Current Room Occupants */}
                      {isExpanded && (
                        <div className="p-2.5 rounded-xl bg-black/40 border border-amber-500/20 space-y-2 animate-in fade-in duration-200">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80 block">
                            Currently in this room:
                          </span>
                          <div className="space-y-1.5">
                            {occupants.map((member: UniverseMember) => (
                              <div
                                key={member.id}
                                className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-[#181820]/70 border border-white/5"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <img
                                    src={
                                      member.avatar_url ||
                                      (member.entity_type === 'user'
                                        ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
                                        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100')
                                    }
                                    alt={member.display_name}
                                    className="w-6 h-6 rounded-full object-cover ring-1 ring-white/10 shrink-0"
                                  />
                                  <span className="text-xs font-semibold text-zinc-200 truncate">
                                    {member.display_name}
                                  </span>
                                </div>
                                <span
                                  className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                                    member.entity_type === 'user'
                                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                      : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                                  }`}
                                >
                                  {member.entity_type === 'user' ? 'You' : 'Companion'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* SECTION 2: AVAILABLE DESTINATIONS */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 mb-2.5">
              <MapPin className="w-3.5 h-3.5 text-zinc-500" />
              Available Rooms
            </label>

            {otherRooms.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[#16161c] border border-white/5 text-center text-xs text-zinc-500 italic">
                No other discovered rooms available in this universe yet.
              </div>
            ) : (
              <div className="space-y-3">
                {otherRooms.map((room: UniverseLocation) => {
                  const occupants = getLocationOccupants(room.id);
                  const isCurrentlySpectating = viewedLocationId === room.id;

                  return (
                    <div
                      key={room.id}
                      className={`p-4 rounded-2xl bg-[#16161c] border transition-all ${
                        isCurrentlySpectating
                          ? 'border-indigo-500/40 ring-1 ring-indigo-500/20'
                          : 'border-white/5 hover:border-white/10'
                      }`}
                    >
                      {/* Room Details Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate flex items-center gap-2">
                            <span>{room.name}</span>
                            {isCurrentlySpectating && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                Viewing Now
                              </span>
                            )}
                          </h4>
                          <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                            {room.description}
                          </p>
                        </div>
                      </div>

                      {/* Live Occupants Multi-Avatar Stack Trigger */}
                      <button
                        type="button"
                        onClick={() => toggleRoomOccupants(room.id)}
                        className="w-full py-2.5 border-y border-white/5 flex items-center justify-between my-2.5 text-left cursor-pointer group hover:bg-white/2 px-1 rounded-lg transition-colors"
                      >
                        <span className="text-[11px] text-zinc-400 group-hover:text-zinc-200 flex items-center gap-1.5 transition-colors">
                          <Users className="w-3.5 h-3.5 text-zinc-500 group-hover:text-indigo-400" />
                          {occupants.length > 0 ? (
                            <span>
                              {occupants.length} Occupant{occupants.length > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="text-zinc-600 italic">Empty / Quiet</span>
                          )}
                          {expandedRoomId === room.id ? (
                            <ChevronUp className="w-3 h-3 text-indigo-400 ml-1" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 ml-1" />
                          )}
                        </span>

                        {occupants.length > 0 && (
                          <div className="flex items-center -space-x-2">
                            {occupants.map((member: UniverseMember) => (
                              <img
                                key={member.id}
                                src={
                                  member.avatar_url ||
                                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
                                }
                                alt={member.display_name}
                                title={member.display_name}
                                className="w-6 h-6 rounded-full object-cover ring-2 ring-[#16161c]"
                              />
                            ))}
                          </div>
                        )}
                      </button>

                      {/* Dropdown Accordion for Room Occupants */}
                      {expandedRoomId === room.id && (
                        <div className="mb-3 p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-2 animate-in fade-in duration-200">
                          {occupants.length > 0 ? (
                            <>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                                Characters currently here:
                              </span>
                              <div className="space-y-1.5">
                                {occupants.map((member: UniverseMember) => (
                                  <div
                                    key={member.id}
                                    className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-[#181820]/70 border border-white/5"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <img
                                        src={
                                          member.avatar_url ||
                                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
                                        }
                                        alt={member.display_name}
                                        className="w-6 h-6 rounded-full object-cover ring-1 ring-white/10 shrink-0"
                                      />
                                      <span className="text-xs font-semibold text-zinc-200 truncate">
                                        {member.display_name}
                                      </span>
                                    </div>
                                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shrink-0">
                                      {member.entity_type === 'user' ? 'You' : 'Companion'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <p className="text-xs text-zinc-500 italic text-center py-1">
                              No characters currently in this room.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Dual Action Controls: Spectate vs Enter in Person */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleSpectateClick(room.id)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                            isCurrentlySpectating
                              ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                              : 'bg-[#181820] border-white/5 text-zinc-300 hover:text-white hover:border-white/15'
                          }`}
                          title="View room feed remotely without moving your physical body"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Spectate Room</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEnterClick(room.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black transition-colors shadow-sm cursor-pointer"
                          title="Open travel confirmation to physically relocate your party"
                        >
                          <span>Enter Room</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 3: SYSTEM TIP */}
          <div className="p-3.5 rounded-xl bg-[#16161c] border border-white/5 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              <span className="font-semibold text-zinc-200">Spectating</span> lets you observe conversations and events via security feeds without moving your character. <span className="font-semibold text-zinc-200">Entering</span> physically moves you and your chosen party members into the room.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
};
