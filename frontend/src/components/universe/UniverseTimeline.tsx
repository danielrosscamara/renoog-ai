import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Clock,
  Users,
  Globe,
  User,
  Maximize2,
  Minimize2,
  List,
  Grid3x3,
  MessageSquare,
  MapPin,
  Calendar,
  Layers,
  Activity,
  ArrowRight,
} from 'lucide-react';
import type {
  TimelineEvent,
  TimelineEventType,
  UniverseMember,
  UniverseMessage,
} from '../../types/universe';
import { useUniverseStore } from '../../stores/useUniverseStore';

export interface UniverseTimelineProps {
  /** Optional timeline events override; defaults to useUniverseStore */
  events?: TimelineEvent[];
  /** Optional members override */
  members?: UniverseMember[];
  /** Display mode: docked inside RightSidebar or expanded theater modal */
  isExpanded?: boolean;
  /** Callback to toggle expanded mode */
  onToggleExpand?: () => void;
  /** Callback when user scrubs or clicks a turn */
  onSelectTurn?: (turnNumber: number) => void;
  /** Callback when user clicks a location tag to view that room */
  onSelectLocation?: (locationId: string) => void;
}

export type TimelineViewMode = 'matrix' | 'ledger';
export type TemporalScale = 'turn' | 'hour';
export type SubProjectTab = 'chats' | 'ordering' | 'timeline';

interface EntityRow {
  id: string;
  name: string;
  avatarUrl: string | null;
  type: 'character' | 'narrator' | 'user';
  roleLabel: string;
}

interface TurnCellData {
  turnNumber: number;
  entityId: string;
  messages: UniverseMessage[];
  events: TimelineEvent[];
  locationNames: string[];
}

interface TurnColumnData {
  turnNumber: number;
  label: string;
  hourLabel: string;
  participants: Set<string>;
  cellDataByEntity: Map<string, TurnCellData>;
  sharedSceneLocations: Map<string, string[]>; // locationId -> entityIds
  minRowIndex: number;
  maxRowIndex: number;
  hasMultiCharacterScene: boolean;
}

const ROW_HEIGHT_PX = 56; // Fixed height per entity row for exact SVG chord calculation

export const UniverseTimeline: React.FC<UniverseTimelineProps> = ({
  events: propEvents,
  members: propMembers,
  isExpanded = false,
  onToggleExpand,
  onSelectTurn,
  onSelectLocation,
}) => {
  // Store Subscriptions
  const storeUniverse = useUniverseStore((s) => s.activeUniverse);
  const storeLocations = useUniverseStore((s) => s.locations);
  const storeMembers = useUniverseStore((s) => s.members);
  const storeMessagesByLocation = useUniverseStore((s) => s.messagesByLocation);
  const storeTimelineEvents = useUniverseStore((s) => s.timelineEvents);
  const storeTurnCount = useUniverseStore((s) => s.turnCount);

  // Local State
  const [viewMode, setViewMode] = useState<TimelineViewMode>('matrix');
  const [activeSubTab, setActiveSubTab] = useState<SubProjectTab>('timeline');
  const [scaleMode, setScaleMode] = useState<TemporalScale>('turn');
  const [selectedTurn, setSelectedTurn] = useState<number>(storeTurnCount || 1);
  const [hoveredCell, setHoveredCell] = useState<{
    turnNumber: number;
    entity: EntityRow;
    messages: UniverseMessage[];
    events: TimelineEvent[];
    locations: string[];
    x: number;
    y: number;
  } | null>(null);
  const [ledgerFilter, setLedgerFilter] = useState<TimelineEventType | 'all'>('all');

  const matrixScrollRef = useRef<HTMLDivElement>(null);

  // Resolve Active Events and Members
  const activeEvents = useMemo(
    () => (propEvents !== undefined ? propEvents : storeTimelineEvents),
    [propEvents, storeTimelineEvents]
  );
  const activeMembers = useMemo(
    () => (propMembers !== undefined ? propMembers : storeMembers),
    [propMembers, storeMembers]
  );

  // Derive All Messages Flat Array
  const allMessages = useMemo(() => {
    const list: UniverseMessage[] = [];
    Object.values(storeMessagesByLocation).forEach((roomMsgs) => {
      list.push(...roomMsgs);
    });
    return list;
  }, [storeMessagesByLocation]);

  // Derive Maximum Turn
  const maxTurn = useMemo(() => {
    let max = Math.max(1, storeTurnCount);
    allMessages.forEach((m) => {
      if (m.turn_number > max) max = m.turn_number;
    });
    activeEvents.forEach((e) => {
      if (e.turn_number > max) max = e.turn_number;
    });
    return max;
  }, [storeTurnCount, allMessages, activeEvents]);

  // Build Entity Rows (Y-Axis)
  const entityRows: EntityRow[] = useMemo(() => {
    const rows: EntityRow[] = [];

    // 1. Companions (Characters)
    const characters = activeMembers.filter((m) => m.entity_type === 'character');
    characters.forEach((c) => {
      rows.push({
        id: c.id,
        name: c.display_name,
        avatarUrl: c.avatar_url,
        type: 'character',
        roleLabel: 'Companion',
      });
    });

    // 2. World / Narrator Row
    rows.push({
      id: 'narrator_world',
      name: 'World (Narrator)',
      avatarUrl: null,
      type: 'narrator',
      roleLabel: 'Environmental & Lore',
    });

    // 3. Player Persona Row
    const userMember = activeMembers.find((m) => m.entity_type === 'user');
    rows.push({
      id: userMember?.id || 'player_persona',
      name: userMember?.display_name || 'Player Persona',
      avatarUrl: userMember?.avatar_url || null,
      type: 'user',
      roleLabel: 'Your Identity',
    });

    return rows;
  }, [activeMembers]);

  // Map Entity IDs to their 0-indexed row position for instant SVG chord math
  const entityRowIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    entityRows.forEach((row, idx) => {
      map.set(row.id, idx);
      // Also map companion character IDs
      map.set(row.name.toLowerCase(), idx);
    });
    return map;
  }, [entityRows]);

  // Derive In-World Calendar Metadata
  const calendarMetadata = useMemo(() => {
    const baseYear = 203;
    const yearProgression = Math.floor((maxTurn - 1) / 30);
    const year = baseYear + yearProgression;
    const day = 1 + (Math.floor((maxTurn - 1) / 4) % 30);
    const hour = 18 + ((maxTurn - 1) % 6);
    const cycle = storeUniverse?.world_name || 'Simulated Realm';
    return {
      year,
      month: 'Highflame (6)',
      day,
      hour: `Hour ${hour}:00`,
      cycle,
    };
  }, [maxTurn, storeUniverse?.world_name]);

  // Build 2D Turn Columns (X-Axis Data Matrix)
  const turnColumns: TurnColumnData[] = useMemo(() => {
    const columns: TurnColumnData[] = [];

    for (let t = 1; t <= maxTurn; t++) {
      const turnMsgs = allMessages.filter((m) => m.turn_number === t);
      const turnEvts = activeEvents.filter((e) => e.turn_number === t);

      const participants = new Set<string>();
      const cellDataByEntity = new Map<string, TurnCellData>();
      const locationGroupings = new Map<string, string[]>();

      // Ingest messages
      turnMsgs.forEach((msg) => {
        let matchedEntity = entityRows.find(
          (r) =>
            r.name.toLowerCase() === msg.sender_name.toLowerCase() ||
            (msg.sender_type === 'narrator' && r.type === 'narrator') ||
            (msg.sender_type === 'user' && r.type === 'user')
        );

        if (!matchedEntity) {
          matchedEntity =
            msg.sender_type === 'narrator'
              ? entityRows.find((r) => r.type === 'narrator')
              : entityRows.find((r) => r.type === 'user');
        }

        if (matchedEntity) {
          participants.add(matchedEntity.id);

          const existing = cellDataByEntity.get(matchedEntity.id) || {
            turnNumber: t,
            entityId: matchedEntity.id,
            messages: [],
            events: [],
            locationNames: [],
          };
          existing.messages.push(msg);

          const room = storeLocations.find((l) => l.id === msg.location_id);
          if (room && !existing.locationNames.includes(room.name)) {
            existing.locationNames.push(room.name);
          }
          cellDataByEntity.set(matchedEntity.id, existing);

          // Track shared room location grouping for vertical chords
          const locId = msg.location_id;
          const locEntities = locationGroupings.get(locId) || [];
          if (!locEntities.includes(matchedEntity.id)) {
            locEntities.push(matchedEntity.id);
            locationGroupings.set(locId, locEntities);
          }
        }
      });

      // Ingest events
      turnEvts.forEach((evt) => {
        let matchedEntity: EntityRow | undefined;
        if (evt.event_type === 'environmental') {
          matchedEntity = entityRows.find((r) => r.type === 'narrator');
        } else {
          matchedEntity = entityRows.find((r) =>
            evt.participant_names.some((p) => p.toLowerCase() === r.name.toLowerCase())
          );
        }

        if (matchedEntity) {
          participants.add(matchedEntity.id);
          const existing = cellDataByEntity.get(matchedEntity.id) || {
            turnNumber: t,
            entityId: matchedEntity.id,
            messages: [],
            events: [],
            locationNames: [],
          };
          existing.events.push(evt);
          if (evt.location_name && !existing.locationNames.includes(evt.location_name)) {
            existing.locationNames.push(evt.location_name);
          }
          cellDataByEntity.set(matchedEntity.id, existing);
        }
      });

      // Calculate row bounds for vertical scene chords
      let minRow = 999;
      let maxRow = -1;
      let hasMulti = false;

      locationGroupings.forEach((entities) => {
        if (entities.length >= 2) {
          hasMulti = true;
          entities.forEach((entId) => {
            const rowIdx = entityRowIndexMap.get(entId);
            if (rowIdx !== undefined) {
              if (rowIdx < minRow) minRow = rowIdx;
              if (rowIdx > maxRow) maxRow = rowIdx;
            }
          });
        }
      });

      columns.push({
        turnNumber: t,
        label: `Turn ${t}`,
        hourLabel: `Hour ${18 + ((t - 1) % 6)}`,
        participants,
        cellDataByEntity,
        sharedSceneLocations: locationGroupings,
        minRowIndex: minRow === 999 ? 0 : minRow,
        maxRowIndex: maxRow === -1 ? 0 : maxRow,
        hasMultiCharacterScene: hasMulti,
      });
    }

    return columns;
  }, [maxTurn, allMessages, activeEvents, entityRows, storeLocations, entityRowIndexMap]);

  // Handle Scrubber Interaction
  const handleScrubberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value, 10);
      setSelectedTurn(val);
      if (onSelectTurn) {
        onSelectTurn(val);
      }

      // Smoothly scroll the horizontal matrix to keep the active column in view
      if (matrixScrollRef.current) {
        const colWidth = 96; // 96px per turn column
        const targetScrollLeft = Math.max(0, (val - 1) * colWidth - 120);
        matrixScrollRef.current.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
      }
    },
    [onSelectTurn]
  );

  // Filtered Ledger Events
  const filteredLedgerEvents = useMemo(() => {
    if (ledgerFilter === 'all') return activeEvents;
    return activeEvents.filter((e) => e.event_type === ledgerFilter);
  }, [activeEvents, ledgerFilter]);

  return (
    <div
      className={`flex flex-col bg-[#121216] border border-[#202026] text-zinc-200 select-none ${
        isExpanded
          ? 'fixed inset-4 md:inset-8 z-50 rounded-2xl shadow-2xl overflow-hidden'
          : 'h-full w-full rounded-none'
      }`}
    >
      {/* ─── ZONE 1: TOP BANNER & PROJECT HEADER ─── */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#16161c] border-b border-[#202026] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/25 shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white tracking-wide truncate">
                {storeUniverse?.title || 'Universe Flight Recorder'}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#202028] text-amber-400 font-semibold border border-white/5 uppercase">
                2D Matrix
              </span>
            </div>
            <span className="text-[11px] text-zinc-400 block truncate">
              {calendarMetadata.cycle} · {turnColumns.length} Temporal Turns
            </span>
          </div>
        </div>

        {/* View Controls & Expansion */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* View Toggle */}
          <div className="flex items-center bg-[#1a1a22] p-0.5 rounded-lg border border-white/5">
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-amber-500 text-black font-bold shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Switch to 2D Coordinate Matrix"
            >
              <Grid3x3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('ledger')}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'ledger'
                  ? 'bg-amber-500 text-black font-bold shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Switch to Linear Ledger Feed"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Fullscreen / Theater Toggle */}
          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="p-1.5 rounded-lg bg-[#1a1a22] hover:bg-[#242430] text-zinc-400 hover:text-amber-400 border border-white/5 transition-colors cursor-pointer"
              title={isExpanded ? 'Dock to Sidebar' : 'Expand to Full Theater Mode'}
            >
              {isExpanded ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* ─── ZONE 2: PROJECT SUB-NAVIGATION ─── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#141418] border-b border-[#202026] text-xs shrink-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveSubTab('chats')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'chats'
                ? 'bg-zinc-800 text-white font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <MessageSquare className="w-3 h-3 text-sky-400" />
            <span>Chats</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('ordering')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'ordering'
                ? 'bg-zinc-800 text-white font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Layers className="w-3 h-3 text-violet-400" />
            <span>Ordering</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('timeline')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'timeline'
                ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Timeline</span>
          </button>
        </div>

        {/* Temporal Granularity Scale */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold text-zinc-500 hidden sm:inline">
            Scale:
          </span>
          <select
            value={scaleMode}
            onChange={(e) => setScaleMode(e.target.value as TemporalScale)}
            className="bg-[#1a1a22] text-zinc-300 text-[11px] font-medium px-2 py-0.5 rounded border border-white/5 focus:outline-hidden cursor-pointer"
          >
            <option value="turn">Turn</option>
            <option value="hour">In-Game Hour</option>
          </select>
        </div>
      </div>

      {/* ─── ZONE 3: TEMPORAL SCRUBBER & IN-WORLD CALENDAR ─── */}
      <div className="p-3 bg-[#16161c] border-b border-[#202026] space-y-2 shrink-0">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {scaleMode === 'turn' ? `Turn #${selectedTurn}` : `Hour ${18 + ((selectedTurn - 1) % 6)}:00`}
              </span>
            </span>
            <span className="text-[11px] text-zinc-400">/ {maxTurn} total</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
            <Calendar className="w-3 h-3 text-zinc-500" />
            <span>
              ERA {calendarMetadata.year} · {calendarMetadata.month} · DAY {calendarMetadata.day}
            </span>
          </div>
        </div>

        {/* Interactive Range Scrubber */}
        <div className="relative flex items-center">
          <input
            type="range"
            min={1}
            max={Math.max(1, maxTurn)}
            value={selectedTurn}
            onChange={handleScrubberChange}
            className="w-full h-1.5 bg-[#242430] rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* ─── ZONE 4: MAIN CONTENT (2D MATRIX OR LEDGER) ─── */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === 'matrix' ? (
          <div className="flex h-full w-full overflow-hidden">
            {/* STICKY LEFT ENTITY AXIS (COORDINATE) */}
            <div className="w-40 sm:w-48 bg-[#141418] border-r border-[#202026] shrink-0 flex flex-col z-20 shadow-lg select-none">
              {/* Header Cell */}
              <div className="h-9 px-3 flex items-center text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-[#202026] bg-[#16161c]">
                COORDINATE
              </div>

              {/* Entity Rows */}
              <div className="flex-1 overflow-y-hidden">
                {entityRows.map((entity) => (
                  <div
                    key={entity.id}
                    style={{ height: `${ROW_HEIGHT_PX}px` }}
                    className="flex items-center gap-2 px-3 border-b border-[#202026]/70 hover:bg-white/5 transition-colors"
                  >
                    {/* Avatar */}
                    {entity.type === 'narrator' ? (
                      <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
                        <Globe className="w-4 h-4" />
                      </div>
                    ) : entity.avatarUrl ? (
                      <img
                        src={entity.avatarUrl}
                        alt={entity.name}
                        className="w-8 h-8 rounded-lg object-cover ring-1 ring-amber-500/40 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                    )}

                    {/* Entity Details */}
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{entity.name}</div>
                      <div className="text-[10px] text-zinc-400 truncate">{entity.roleLabel}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* HORIZONTALLY SCROLLABLE TURN MATRIX */}
            <div
              ref={matrixScrollRef}
              className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[#101014]"
            >
              <div
                className="flex flex-col h-full"
                style={{ width: `${turnColumns.length * 96}px`, minWidth: '100%' }}
              >
                {/* Column Headers (X-Axis: Turns) */}
                <div className="h-9 flex border-b border-[#202026] bg-[#16161c] sticky top-0 z-10">
                  {turnColumns.map((col) => {
                    const isColSelected = col.turnNumber === selectedTurn;
                    return (
                      <button
                        key={col.turnNumber}
                        type="button"
                        onClick={() => {
                          setSelectedTurn(col.turnNumber);
                          if (onSelectTurn) onSelectTurn(col.turnNumber);
                        }}
                        style={{ width: '96px' }}
                        className={`px-2 flex flex-col justify-center items-center border-r border-[#202026] transition-colors cursor-pointer shrink-0 ${
                          isColSelected
                            ? 'bg-amber-500/15 text-amber-300 font-bold border-b-2 border-b-amber-500'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span className="text-[11px] font-semibold leading-tight">
                          {scaleMode === 'turn' ? col.label : col.hourLabel}
                        </span>
                        {col.hasMultiCharacterScene && (
                          <span className="text-[8px] text-amber-400 font-mono leading-none">
                            ● shared
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Matrix Grid Body with Cells & SVG Chords */}
                <div className="flex-1 relative">
                  {/* SVG OVERLAY FOR VERTICAL SCENE CHORDS */}
                  <svg
                    className="absolute inset-0 pointer-events-none z-10"
                    style={{
                      width: `${turnColumns.length * 96}px`,
                      height: `${entityRows.length * ROW_HEIGHT_PX}px`,
                    }}
                  >
                    {turnColumns.map((col, colIdx) => {
                      if (!col.hasMultiCharacterScene) return null;
                      const xPos = colIdx * 96 + 48; // center of the column
                      const y1 = col.minRowIndex * ROW_HEIGHT_PX + ROW_HEIGHT_PX / 2;
                      const y2 = col.maxRowIndex * ROW_HEIGHT_PX + ROW_HEIGHT_PX / 2;

                      return (
                        <g key={`chord_${col.turnNumber}`}>
                          {/* Ambient Golden Glow Line */}
                          <line
                            x1={xPos}
                            y1={y1}
                            x2={xPos}
                            y2={y2}
                            stroke="#f59e0b"
                            strokeWidth="3"
                            strokeOpacity="0.3"
                            strokeLinecap="round"
                          />
                          {/* Sharp Golden Center Line */}
                          <line
                            x1={xPos}
                            y1={y1}
                            x2={xPos}
                            y2={y2}
                            stroke="#fbbf24"
                            strokeWidth="1.5"
                            strokeOpacity="0.85"
                            strokeLinecap="round"
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Cell Columns */}
                  <div className="flex h-full">
                    {turnColumns.map((col) => {
                      const isColSelected = col.turnNumber === selectedTurn;

                      return (
                        <div
                          key={col.turnNumber}
                          style={{ width: '96px' }}
                          className={`flex flex-col border-r border-[#202026]/70 shrink-0 transition-colors ${
                            isColSelected ? 'bg-amber-500/5' : ''
                          }`}
                        >
                          {entityRows.map((entity) => {
                            const cell = col.cellDataByEntity.get(entity.id);
                            const hasActivity = !!cell;
                            const messageCount = cell?.messages.length || 0;
                            const eventCount = cell?.events.length || 0;

                            return (
                              <div
                                key={`${col.turnNumber}_${entity.id}`}
                                style={{ height: `${ROW_HEIGHT_PX}px` }}
                                onMouseEnter={(e) => {
                                  if (hasActivity && cell) {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setHoveredCell({
                                      turnNumber: col.turnNumber,
                                      entity,
                                      messages: cell.messages,
                                      events: cell.events,
                                      locations: cell.locationNames,
                                      x: rect.right + 8,
                                      y: rect.top,
                                    });
                                  }
                                }}
                                onMouseLeave={() => setHoveredCell(null)}
                                onClick={() => {
                                  setSelectedTurn(col.turnNumber);
                                  if (onSelectTurn) onSelectTurn(col.turnNumber);
                                }}
                                className={`flex items-center justify-center border-b border-[#202026]/50 relative transition-all cursor-pointer ${
                                  hasActivity
                                    ? 'hover:bg-amber-500/10'
                                    : 'hover:bg-white/2 opacity-60'
                                }`}
                              >
                                {hasActivity && (
                                  <div className="relative z-20 flex items-center justify-center">
                                    {/* STACKED AVATAR BADGES FOR MULTIPLE ACTIONS */}
                                    <div className="flex -space-x-2.5 items-center">
                                      {/* Token 1 */}
                                      <div
                                        className={`w-7 h-7 rounded-full flex items-center justify-center ring-2 shadow-md transition-transform hover:scale-110 ${
                                          entity.type === 'narrator'
                                            ? 'bg-violet-600 ring-violet-400 text-white'
                                            : entity.type === 'user'
                                            ? 'bg-emerald-600 ring-emerald-400 text-white'
                                            : 'bg-amber-500 ring-amber-300 text-black font-bold'
                                        }`}
                                      >
                                        {entity.type === 'narrator' ? (
                                          <Globe className="w-3.5 h-3.5" />
                                        ) : entity.avatarUrl ? (
                                          <img
                                            src={entity.avatarUrl}
                                            alt={entity.name}
                                            className="w-full h-full rounded-full object-cover"
                                          />
                                        ) : (
                                          <User className="w-3.5 h-3.5" />
                                        )}
                                      </div>

                                      {/* Stack Chip 2 (if multiple messages/events in turn) */}
                                      {messageCount + eventCount > 1 && (
                                        <div className="w-6 h-6 rounded-full bg-amber-400 text-black ring-1 ring-black flex items-center justify-center text-[10px] font-bold shadow-xs">
                                          +{messageCount + eventCount - 1}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ─── ALTERNATIVE VIEW: LINEAR CHRONOLOGICAL LEDGER ─── */
          <div className="h-full flex flex-col p-4 overflow-y-auto space-y-3">
            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1.5 pb-2 border-b border-[#202026]">
              {(['all', 'movement', 'conversation', 'environmental', 'encounter'] as const).map(
                (filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setLedgerFilter(filter)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                      ledgerFilter === filter
                        ? 'bg-amber-500 text-black font-bold shadow-xs'
                        : 'bg-[#181820] hover:bg-[#22222c] text-zinc-400 hover:text-white border border-white/5'
                    }`}
                  >
                    {filter}
                  </button>
                )
              )}
            </div>

            {/* Event Cards */}
            {filteredLedgerEvents.length > 0 ? (
              <div className="space-y-2.5">
                {filteredLedgerEvents.map((evt) => (
                  <div
                    key={evt.id}
                    onClick={() => {
                      if (onSelectTurn) onSelectTurn(evt.turn_number);
                      if (onSelectLocation && evt.location_id) onSelectLocation(evt.location_id);
                    }}
                    className="p-3 rounded-xl bg-[#16161c] hover:bg-[#1c1c24] border border-[#202026] hover:border-amber-500/40 transition-all cursor-pointer space-y-1.5 group"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          Turn #{evt.turn_number}
                        </span>
                        <span className="text-zinc-400 capitalize">{evt.event_type}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500">{evt.timestamp}</span>
                    </div>

                    <p className="text-xs text-zinc-200 leading-relaxed group-hover:text-white">
                      {evt.summary}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400">
                      {evt.location_name && (
                        <span className="flex items-center gap-1 text-zinc-400">
                          <MapPin className="w-3 h-3 text-amber-400" />
                          <span>{evt.location_name}</span>
                        </span>
                      )}
                      {evt.participant_names.length > 0 && (
                        <span className="flex items-center gap-1 text-zinc-400">
                          <Users className="w-3 h-3 text-sky-400" />
                          <span>{evt.participant_names.join(', ')}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
                <Clock className="w-8 h-8 text-zinc-600" />
                <p>No timeline ledger events recorded for this filter.</p>
              </div>
            )}
          </div>
        )}

        {/* ─── HOVER POPOVER TOOLTIP ─── */}
        {hoveredCell && (
          <div
            className="fixed z-50 w-64 p-3 rounded-xl bg-[#181820] border border-amber-500/30 shadow-2xl text-xs space-y-2 pointer-events-none animate-in fade-in zoom-in-95 duration-100"
            style={{
              left: `${Math.min(window.innerWidth - 280, hoveredCell.x)}px`,
              top: `${Math.min(window.innerHeight - 200, hoveredCell.y)}px`,
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-amber-400">Turn #{hoveredCell.turnNumber}</span>
                <span className="text-zinc-400">· {hoveredCell.entity.name}</span>
              </div>
              {hoveredCell.locations.length > 0 && (
                <span className="text-[10px] text-zinc-400 truncate max-w-24">
                  {hoveredCell.locations[0]}
                </span>
              )}
            </div>

            {/* Messages Snippet */}
            {hoveredCell.messages.length > 0 && (
              <div className="space-y-1">
                {hoveredCell.messages.slice(0, 2).map((m) => (
                  <p key={m.id} className="text-[11px] text-zinc-300 line-clamp-3 italic">
                    "{m.content}"
                  </p>
                ))}
              </div>
            )}

            {/* Events Snippet */}
            {hoveredCell.events.length > 0 && (
              <div className="text-[11px] text-amber-300/90 font-medium">
                {hoveredCell.events[0].summary}
              </div>
            )}

            <div className="pt-1 text-[10px] text-zinc-400 flex items-center justify-between border-t border-white/5">
              <span>Click to scrub timeline</span>
              <ArrowRight className="w-3 h-3 text-amber-400" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
