import React, { useState, useEffect, useCallback } from 'react';
import { X, ArrowRight, Compass, Users, Check, MapPin, Sparkles } from 'lucide-react';
import type { UniverseMember } from '../../types/universe';
import { useUniverseStore } from '../../stores/useUniverseStore';

export interface TravelConfirmationModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  targetLocationId?: string | null;
  onConfirm?: (targetLocationId: string, accompanyingCharacterIds: string[]) => void;
}

/**
 * TravelConfirmationModal
 * 
 * Guards against accidental room hops in the spatial universe simulation.
 * Displays route details, destination ambiance preview, and companion party
 * accompaniment checkboxes (who travels vs. who stays behind in origin).
 */
export const TravelConfirmationModal: React.FC<TravelConfirmationModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
  targetLocationId: propTargetLocationId,
  onConfirm: propOnConfirm,
}) => {
  // Store integration
  const pendingTravel = useUniverseStore((state) => state.pendingTravel);
  const closeTravelConfirmation = useUniverseStore((state) => state.closeTravelConfirmation);
  const confirmTravel = useUniverseStore((state) => state.confirmTravel);
  const locations = useUniverseStore((state) => state.locations);
  const members = useUniverseStore((state) => state.members);
  const physicalLocationId = useUniverseStore((state) => state.physicalLocationId);
  const activeLocationId = useUniverseStore((state) => state.activeLocationId);

  // Dual-mode resolution: prop-driven or store-driven
  const isModalOpen = propIsOpen !== undefined ? propIsOpen : !!pendingTravel;
  const effectiveTargetId = propTargetLocationId || pendingTravel?.targetLocationId || null;

  const currentOriginId = physicalLocationId || activeLocationId || locations[0]?.id || null;
  const originLocation = locations.find((l) => l.id === currentOriginId) || null;
  const targetLocation = locations.find((l) => l.id === effectiveTargetId) || null;

  // Available companions in the origin room who could travel with the user
  const availableCompanions = pendingTravel?.availableCompanions ||
    members.filter(
      (m) => m.current_location_id === currentOriginId && m.entity_type === 'character' && m.is_active
    );

  // Selected companions defaults to all active room companions
  const [selectedCompanionIds, setSelectedCompanionIds] = useState<string[]>([]);
  const [prevTargetId, setPrevTargetId] = useState<string | null>(null);

  // Sync selected companions when target location changes
  if (effectiveTargetId && effectiveTargetId !== prevTargetId) {
    setPrevTargetId(effectiveTargetId);
    setSelectedCompanionIds(availableCompanions.map((c) => c.entity_id));
  }

  const handleClose = useCallback(() => {
    if (propOnClose) {
      propOnClose();
    } else {
      closeTravelConfirmation();
    }
  }, [propOnClose, closeTravelConfirmation]);

  // Handle escape key and body scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isModalOpen, handleClose]);

  if (!isModalOpen || !targetLocation) {
    return null;
  }

  const handleToggleCompanion = (entityId: string) => {
    setSelectedCompanionIds((prev) =>
      prev.includes(entityId) ? prev.filter((id) => id !== entityId) : [...prev, entityId]
    );
  };

  const handleConfirm = () => {
    if (!effectiveTargetId) return;

    if (propOnConfirm) {
      propOnConfirm(effectiveTargetId, selectedCompanionIds);
    } else {
      confirmTravel(effectiveTargetId, selectedCompanionIds);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="travel-modal-title"
    >
      {/* Dimmed Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg bg-[#141417] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200 flex flex-col">
        {/* MODAL HEADER */}
        <div className="p-5 border-b border-[#202026] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2 id="travel-modal-title" className="text-sm font-bold text-white tracking-tight">
                Confirm Room Travel
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close Travel Modal"
            className="p-1.5 rounded-lg bg-[#18181f] text-zinc-400 hover:text-white border border-white/5 hover:border-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* ROUTE PILL BANNER */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#181820] border border-white/5">
            <div className="flex-1 min-w-0 pr-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-0.5">
                Origin
              </span>
              <span className="text-xs font-semibold text-zinc-200 truncate block">
                {originLocation?.name || 'Current Room'}
              </span>
            </div>

            <div className="w-7 h-7 rounded-full bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-400 shrink-0">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>

            <div className="flex-1 min-w-0 pl-2 text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-0.5">
                Destination
              </span>
              <span className="text-xs font-semibold text-white truncate block">
                {targetLocation.name}
              </span>
            </div>
          </div>

          {/* DESTINATION SENSORY PREVIEW */}
          <div className="p-3.5 rounded-xl bg-amber-500/4 border border-amber-500/20">
            <div className="flex items-center gap-1.5 mb-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-amber-300">
                {targetLocation.name}
              </span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed italic font-serif">
              "{targetLocation.description}"
            </p>
          </div>

          {/* PARTY COMPANION SELECTION */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-zinc-500" />
                Who Is Traveling With You?
              </label>
              <span className="text-[10px] text-zinc-500">
                {selectedCompanionIds.length} of {availableCompanions.length} joining
              </span>
            </div>

            {availableCompanions.length === 0 ? (
              <div className="p-3 rounded-xl bg-[#181820] border border-white/5 text-center text-xs text-zinc-500 italic">
                Traveling solo — no companions are currently in this room.
              </div>
            ) : (
              <div className="space-y-2">
                {availableCompanions.map((companion: UniverseMember) => {
                  const isSelected = selectedCompanionIds.includes(companion.entity_id);
                  return (
                    <div
                      key={companion.id}
                      onClick={() => handleToggleCompanion(companion.entity_id)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-violet-500/10 border-violet-500/30 text-white'
                          : 'bg-[#181820] border-white/5 text-zinc-400 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={
                            companion.avatar_url ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
                          }
                          alt={companion.display_name}
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10 shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-zinc-200 block truncate">
                            {companion.display_name}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {isSelected ? 'Accompanying your party' : `Staying in ${originLocation?.name || 'current room'}`}
                          </span>
                        </div>
                      </div>

                      {/* Toggle Checkbox Pill */}
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-violet-600 border-violet-500 text-white'
                            : 'bg-zinc-800/80 border-zinc-700 text-transparent'
                        }`}
                      >
                        <Check className="w-3 h-3 stroke-3" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* DUAL-ROOM NARRATIVE NOTICE */}
          <div className="p-3 rounded-xl bg-[#18181f] border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Dual-Room Narrative Impact</span>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              • A departure prose log will be recorded in <span className="text-zinc-300">{originLocation?.name || 'the room'}</span>.
              <br />
              • An arrival scene and ambient description will begin in <span className="text-zinc-300">{targetLocation.name}</span>.
            </p>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-5 border-t border-[#202026] flex items-center justify-end gap-2.5 bg-[#121215] shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors cursor-pointer"
          >
            Cancel / Stay Here
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <span>Depart & Enter</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
