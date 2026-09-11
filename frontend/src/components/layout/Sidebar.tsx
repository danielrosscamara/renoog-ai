import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Compass,
  UserCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Search,
  MoreHorizontal,
  Trash2,
  ChevronDown,
  Home,
  Mail,
  User,
  LogOut,
  RefreshCw,
  Star,
  Code2,
  Globe,
  Rocket,
  Plus,
  Zap,
  Orbit,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { useChatStore } from '../../stores/useChatStore';
import { useUniverseStore } from '../../stores/useUniverseStore';
import { useWorldStore } from '../../stores/useWorldStore';
import type { SavedUniverseRecord } from '../../stores/useUniverseStore';
import type { WorldPresetWithMeta } from '../../stores/useWorldStore';

// ─── Universe Context Menu ───────────────────────────────────────────────────
interface UniverseContextMenuProps {
  universeId: string;
  onClose: () => void;
  onRequestDelete: () => void;
  onResume: () => void;
}

const UniverseContextMenu: React.FC<UniverseContextMenuProps> = ({
  onClose,
  onRequestDelete,
  onResume,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute right-2 top-8 z-50 w-44 rounded-xl bg-[#27272a] border border-[#3f3f46] shadow-2xl py-1 text-xs animate-in fade-in duration-100"
    >
      <button
        onClick={() => {
          onResume();
          onClose();
        }}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-zinc-300 hover:bg-[#3f3f46] hover:text-white transition-colors cursor-pointer text-left font-medium"
      >
        <Play className="w-3.5 h-3.5 text-emerald-400" />
        <span>Resume Simulation</span>
      </button>
      <div className="my-1 border-t border-[#3f3f46]" />
      <button
        onClick={() => {
          onRequestDelete();
          onClose();
        }}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors cursor-pointer text-left font-medium"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Delete Simulation</span>
      </button>
    </div>
  );
};

// ─── Format Relative Time Helper ─────────────────────────────────────────────
function formatPlayedDate(isoDate?: string): string {
  if (!isoDate) return 'Recently';
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return 'Recently';

    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d`;

    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}

// ─── Universe Sidebar Item Component ─────────────────────────────────────────
interface UniverseSidebarItemProps {
  record: SavedUniverseRecord;
  isActive: boolean;
  isSidebarOpen: boolean;
  worlds: WorldPresetWithMeta[];
  onSelect: () => void;
  onRequestDelete: (record: SavedUniverseRecord) => void;
}

const UniverseSidebarItem: React.FC<UniverseSidebarItemProps> = ({
  record,
  isActive,
  isSidebarOpen,
  worlds,
  onSelect,
  onRequestDelete,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Resolve world details (Option A)
  const world = worlds.find((w) => w.id === record.universe.world_id);
  const bannerUrl = world?.banner_url;
  const genre = world?.genre || 'Fantasy';
  const leadCompanion = record.members.find((m) => m.entity_type === 'character');
  const companionCount = record.members.filter((m) => m.entity_type === 'character').length;

  // Active room name
  const currentRoom = record.locations.find(
    (l) => l.id === (record.viewedLocationId || record.physicalLocationId)
  );

  const tooltipText = `${record.universe.title}\n📍 ${currentRoom?.name || 'In Scene'} • Turn ${
    record.turnCount
  } • ${companionCount} ${companionCount === 1 ? 'Companion' : 'Companions'}`;

  // Render Genre Emblem if no banner image is available
  const renderGenreIcon = () => {
    const g = genre.toLowerCase();
    if (g.includes('cyber')) return <Zap className="w-4 h-4 text-cyan-400" />;
    if (g.includes('sci')) return <Orbit className="w-4 h-4 text-indigo-400" />;
    if (g.includes('fant')) return <Sparkles className="w-4 h-4 text-amber-400" />;
    if (g.includes('horror') || g.includes('noir')) return <Compass className="w-4 h-4 text-rose-400" />;
    return <Globe className="w-4 h-4 text-violet-400" />;
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setMenuOpen(false);
      }}
    >
      <button
        type="button"
        onClick={onSelect}
        title={!isSidebarOpen ? tooltipText : undefined}
        className={`flex items-center gap-3 w-full p-2 rounded-xl text-left transition-all cursor-pointer ${
          isActive
            ? 'bg-[#27272a] text-white ring-1 ring-violet-500/70 shadow-md shadow-violet-500/10'
            : 'text-zinc-300 hover:bg-[#202024] hover:text-white'
        }`}
      >
        {/* Thumbnail (Option A: World Banner with Active Dot & Fallbacks) */}
        <div className="relative shrink-0">
          {bannerUrl ? (
            <img
              src={bannerUrl}
              alt={world?.name || record.universe.title}
              className={`w-9 h-9 rounded-xl object-cover ring-1 transition-all ${
                isActive ? 'ring-violet-400' : 'ring-zinc-700'
              }`}
            />
          ) : leadCompanion?.avatar_url ? (
            <img
              src={leadCompanion.avatar_url}
              alt={leadCompanion.display_name}
              className={`w-9 h-9 rounded-xl object-cover ring-1 transition-all ${
                isActive ? 'ring-violet-400' : 'ring-zinc-700'
              }`}
            />
          ) : (
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center bg-violet-500/10 ring-1 ${
                isActive ? 'ring-violet-400' : 'ring-zinc-700'
              }`}
            >
              {renderGenreIcon()}
            </div>
          )}

          {/* Active Status Pip */}
          {isActive && (
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#18181b]"
              title="Active Simulation"
            />
          )}
        </div>

        {/* Expanded Details */}
        {isSidebarOpen && (
          <div className="flex-1 min-w-0 pr-5">
            <div className="flex items-center justify-between gap-1">
              <span className="font-semibold text-xs truncate text-zinc-200">
                {record.universe.title}
              </span>
              <span className="text-[10px] text-zinc-500 shrink-0">
                {formatPlayedDate(record.lastActiveAt)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 truncate mt-0.5">
              <span className="text-zinc-300 truncate font-medium">
                {currentRoom?.name || 'In Scene'}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-violet-400 font-semibold shrink-0">
                T{record.turnCount}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400 shrink-0">
                {companionCount} {companionCount === 1 ? 'npc' : 'npcs'}
              </span>
            </div>
          </div>
        )}
      </button>

      {/* Context Menu Trigger — shows on hover when sidebar is open */}
      {isSidebarOpen && hovered && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className="absolute right-2 top-2.5 p-1 rounded-md text-zinc-400 hover:text-white hover:bg-[#3f3f46] transition-colors z-10 cursor-pointer"
          aria-label="Universe options"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      )}

      {/* Popover Context Menu */}
      {menuOpen && (
        <UniverseContextMenu
          universeId={record.universe.id}
          onClose={() => setMenuOpen(false)}
          onResume={onSelect}
          onRequestDelete={() => onRequestDelete(record)}
        />
      )}
    </div>
  );
};

// ─── Main Sidebar Component ──────────────────────────────────────────────────
export const Sidebar: React.FC = () => {
  const { activeView, setActiveView } = useChatStore();
  const { savedUniverses, activeUniverse, loadUniverse, deleteUniverse } = useUniverseStore();
  const { worlds } = useWorldStore();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [search, setSearch] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<SavedUniverseRecord | null>(null);

  const accountRef = useRef<HTMLDivElement>(null);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Close account menu on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [accountOpen]);

  // Filter saved universes by search query
  const filteredUniverses = useMemo(() => {
    if (!search.trim()) return savedUniverses;
    const q = search.toLowerCase();
    return savedUniverses.filter((record) => {
      const titleMatch = record.universe.title.toLowerCase().includes(q);
      const worldMatch = (record.universe.world_name || record.universe.world_id || '')
        .toLowerCase()
        .includes(q);
      const memberMatch = record.members.some((m) =>
        m.display_name.toLowerCase().includes(q)
      );
      return titleMatch || worldMatch || memberMatch;
    });
  }, [savedUniverses, search]);

  const handleSelectUniverse = (universeId: string) => {
    loadUniverse(universeId);
    setActiveView('universe');
  };

  const handleConfirmDelete = () => {
    if (!deletingRecord) return;
    deleteUniverse(deletingRecord.universe.id);
    setDeletingRecord(null);
  };

  return (
    <aside
      className={`relative flex flex-col h-screen bg-[#18181b] border-r border-[#27272a] transition-all duration-300 ease-in-out z-20 ${
        isSidebarOpen ? 'w-72' : 'w-18'
      }`}
    >
      {/* Zone 1: Brand Header & Collapse Toggle */}
      <div className="flex items-center justify-between p-4 border-b border-[#27272a]">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br from-blue-600 to-indigo-600 shadow-md shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-base tracking-tight text-white truncate">
                Renoog AI
              </span>
              <span className="text-[11px] text-zinc-400 font-medium">
                Interactive Storytelling
              </span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272a] transition-colors cursor-pointer"
        >
          {isSidebarOpen ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Zone 2: Primary Action — New Universe Simulation */}
      <div className="p-3">
        <button
          type="button"
          onClick={() => setActiveView('create-universe')}
          title="Create New Universe Simulation"
          className={`flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition-all cursor-pointer ${
            !isSidebarOpen ? 'px-0' : ''
          }`}
        >
          <Rocket className="w-4 h-4 shrink-0" />
          {isSidebarOpen && <span>New Universe</span>}
        </button>
      </div>

      {/* Zone 3: Navigation Links */}
      <div className="px-3 pb-2 space-y-1">
        <button
          type="button"
          onClick={() => setActiveView('hub')}
          className={`flex items-center gap-3 w-full p-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
            activeView === 'hub'
              ? 'bg-[#27272a] text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#202024]'
          }`}
          title="Home"
        >
          <Home className="w-5 h-5 shrink-0 text-violet-400" />
          {isSidebarOpen && <span>Home</span>}
        </button>

        <button
          type="button"
          onClick={() => setActiveView('gallery')}
          className={`flex items-center gap-3 w-full p-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
            activeView === 'gallery'
              ? 'bg-[#27272a] text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#202024]'
          }`}
          title="Discover"
        >
          <Compass className="w-5 h-5 shrink-0 text-indigo-400" />
          {isSidebarOpen && <span>Discover</span>}
        </button>

        <button
          type="button"
          onClick={() => setActiveView('favorites')}
          className={`flex items-center gap-3 w-full p-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
            activeView === 'favorites'
              ? 'bg-[#27272a] text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#202024]'
          }`}
          title="Favorites"
        >
          <Star className="w-5 h-5 shrink-0 text-amber-400 fill-amber-400/20" />
          {isSidebarOpen && <span>Favorites</span>}
        </button>

        <button
          type="button"
          onClick={() => setActiveView('personas')}
          className={`flex items-center gap-3 w-full p-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
            activeView === 'personas'
              ? 'bg-[#27272a] text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#202024]'
          }`}
          title="Personas"
        >
          <UserCircle className="w-5 h-5 shrink-0 text-emerald-400" />
          {isSidebarOpen && <span>Personas</span>}
        </button>

        <button
          type="button"
          onClick={() => setActiveView('studio')}
          className={`flex items-center gap-3 w-full p-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
            activeView === 'studio'
              ? 'bg-[#27272a] text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#202024]'
          }`}
          title="Dev Studio"
        >
          <Code2 className="w-5 h-5 shrink-0 text-amber-400" />
          {isSidebarOpen && <span>Dev Studio</span>}
        </button>
      </div>

      {/* Zone 4A: Search Universes */}
      {isSidebarOpen && (
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#202024] border border-[#27272a] focus-within:border-indigo-500/50 transition-colors">
            <Search className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search universes, worlds..."
              className="flex-1 bg-transparent text-xs text-zinc-200 placeholder-zinc-500 outline-none"
            />
          </div>
        </div>
      )}

      {/* Zone 4B: Scrollable Universe Simulation Sessions */}
      <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-1">
        {filteredUniverses.length > 0 && isSidebarOpen && (
          <div className="flex items-center justify-between px-2 py-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-violet-400" />
              <span>Recent Universes</span>
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              ({filteredUniverses.length})
            </span>
          </div>
        )}

        {filteredUniverses.map((record) => {
          const isActive =
            activeUniverse?.id === record.universe.id && activeView === 'universe';

          return (
            <UniverseSidebarItem
              key={record.universe.id}
              record={record}
              isActive={isActive}
              isSidebarOpen={isSidebarOpen}
              worlds={worlds}
              onSelect={() => handleSelectUniverse(record.universe.id)}
              onRequestDelete={(r) => setDeletingRecord(r)}
            />
          );
        })}

        {/* Empty State */}
        {filteredUniverses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center px-2">
            <Globe className="w-8 h-8 text-zinc-700 mb-2" />
            {isSidebarOpen && (
              <>
                <p className="text-xs font-semibold text-zinc-400">
                  {search ? 'No universes match search' : 'No universe simulations yet'}
                </p>
                <p className="text-[11px] text-zinc-600 mt-1 max-w-xs">
                  {search
                    ? 'Try searching by world or companion name'
                    : 'Pair companions with a world to begin.'}
                </p>
                {!search && (
                  <button
                    type="button"
                    onClick={() => setActiveView('create-universe')}
                    className="mt-3 px-3 py-1.5 rounded-xl bg-[#27272a] hover:bg-indigo-600/20 hover:text-indigo-300 text-xs font-semibold text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Start Universe</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Zone 5: Footer — Settings & User Account Popover */}
      <div className="p-3 border-t border-[#27272a] space-y-1">
        <button
          type="button"
          onClick={() => setActiveView('settings')}
          className={`flex items-center gap-3 w-full p-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
            activeView === 'settings'
              ? 'bg-[#27272a] text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#202024]'
          }`}
          title="Settings"
        >
          <Settings className="w-5 h-5 shrink-0 text-zinc-400" />
          {isSidebarOpen && <span>Settings</span>}
        </button>

        {/* User Account Widget */}
        <div ref={accountRef} className="relative mt-1">
          <button
            type="button"
            onClick={() => setAccountOpen((v) => !v)}
            aria-haspopup="true"
            aria-expanded={accountOpen}
            className="flex items-center gap-3 w-full p-2 rounded-xl bg-[#202024] border border-[#2e2e36] hover:border-[#3f3f46] transition-colors group cursor-pointer"
            title="dale@renoog.ai (Local Account)"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            {isSidebarOpen && (
              <>
                <div className="flex-1 min-w-0 text-left">
                  <span className="block text-xs font-semibold text-zinc-200 truncate group-hover:text-indigo-300 transition-colors">
                    dale@renoog.ai
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse shrink-0" />
                    Local Account
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${
                    accountOpen ? 'rotate-180' : ''
                  }`}
                />
              </>
            )}
          </button>

          {/* Account Popover */}
          {accountOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1.5 rounded-xl bg-[#27272a] border border-[#3f3f46] shadow-2xl p-2.5 z-50 text-xs animate-in fade-in slide-in-from-bottom-2 duration-150 min-w-52.5">
              <div className="px-2 py-1.5 mb-1 bg-[#18181b] rounded-lg border border-zinc-700/60">
                <div className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
                  Logged In As
                </div>
                <div className="text-xs font-medium text-zinc-100 truncate mt-0.5">
                  dale@renoog.ai
                </div>
                <div className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  Local Workspace Session
                </div>
              </div>

              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setAccountOpen(false);
                    setActiveView('settings');
                  }}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 text-zinc-300 hover:text-zinc-100 hover:bg-[#3f3f46] rounded-lg transition-colors cursor-pointer text-left"
                >
                  <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>View Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAccountOpen(false);
                    setActiveView('settings');
                  }}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 text-zinc-300 hover:text-zinc-100 hover:bg-[#3f3f46] rounded-lg transition-colors cursor-pointer text-left"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>Account Settings</span>
                </button>

                <div className="my-1 border-t border-zinc-700/80" />

                <button
                  type="button"
                  onClick={() => {
                    setAccountOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer text-left"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Delete Simulation Confirmation Modal ──────────────────────────── */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#18181b] border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Universe Simulation</h3>
                <p className="text-xs text-zinc-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-zinc-200">{deletingRecord.universe.title}</strong>? All
              location chat logs, room message history, and timeline events will be removed.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRecord(null)}
                className="px-4 py-2 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Simulation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
