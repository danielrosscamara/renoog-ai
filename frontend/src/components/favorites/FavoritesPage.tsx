import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Star,
  Search,
  ArrowLeft,
  FolderPlus,
  Folder,
  Trash2,
  Edit3,
  Globe,
  Users,
  Sparkles,
  X,
  Check,
  Compass,
  Wrench,
  ChevronRight,
  Bookmark,
} from 'lucide-react';
import type { Character, ViewType } from '../../types';
import type { WorldPreset } from '../../data/worldPresets';
import { useChatStore } from '../../stores/useChatStore';
import { useWorldStore } from '../../stores/useWorldStore';
import { useCollectionStore } from '../../stores/useCollectionStore';
import type { UserCollection } from '../../stores/useCollectionStore';

export interface FavoritesPageProps {
  onBack: () => void;
  onSelectCharacter: (character: Character) => void;
  onStartRoleplayWithCharacter: (character: Character) => void;
  onSelectWorld: (world: WorldPreset) => void;
  onCreateUniverseWithWorld: (worldId: string) => void;
  onEditWorldInStudio: (worldId: string) => void;
  onNavigate: (view: ViewType) => void;
}

type TabType = 'all' | 'characters' | 'worlds' | 'created-worlds' | string;

export const FavoritesPage: React.FC<FavoritesPageProps> = ({
  onBack,
  onSelectCharacter,
  onStartRoleplayWithCharacter,
  onSelectWorld,
  onCreateUniverseWithWorld,
  onEditWorldInStudio,
  onNavigate,
}) => {
  // Store subscriptions
  const characters = useChatStore((s) => s.characters);
  const updateCharacter = useChatStore((s) => s.updateCharacter);

  const worlds = useWorldStore((s) => s.worlds);
  const favoriteWorldIds = useWorldStore((s) => s.favoriteWorldIds);
  const toggleFavoriteWorld = useWorldStore((s) => s.toggleFavoriteWorld);

  const collections = useCollectionStore((s) => s.collections);
  const createCollection = useCollectionStore((s) => s.createCollection);
  const renameCollection = useCollectionStore((s) => s.renameCollection);
  const deleteCollection = useCollectionStore((s) => s.deleteCollection);
  const toggleItemInCollection = useCollectionStore((s) => s.toggleItemInCollection);

  // Local navigation & search state
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewCollectionInput, setShowNewCollectionInput] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  // Collection Renaming State
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [editingCollectionName, setEditingCollectionName] = useState('');

  // Category Assignment Popover State
  const [assigningItemId, setAssigningItemId] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverNewCollectionName, setPopoverNewCollectionName] = useState('');

  // Close assignment popover on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setAssigningItemId(null);
      }
    };
    if (assigningItemId) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [assigningItemId]);

  // Favorited Characters Subset
  const favoriteCharacters = useMemo(() => {
    return characters.filter((c) => c.is_favorite);
  }, [characters]);

  // Favorited Worlds Subset
  const favoriteWorlds = useMemo(() => {
    return worlds.filter((w) => favoriteWorldIds.includes(w.id));
  }, [worlds, favoriteWorldIds]);

  // User-Created Worlds Subset
  const createdWorlds = useMemo(() => {
    return worlds.filter((w) => w.is_custom === true);
  }, [worlds]);

  // Active Custom Collection (if a user collection tab is active)
  const activeCustomCollection = useMemo(() => {
    if (
      activeTab === 'all' ||
      activeTab === 'characters' ||
      activeTab === 'worlds' ||
      activeTab === 'created-worlds'
    ) {
      return null;
    }
    return collections.find((col) => col.id === activeTab) || null;
  }, [activeTab, collections]);

  // Filtered Characters based on tab, collection, and search
  const filteredCharacters = useMemo(() => {
    let list: Character[] = [];

    if (activeTab === 'all' || activeTab === 'characters') {
      list = favoriteCharacters;
    } else if (activeCustomCollection) {
      list = characters.filter((c) => activeCustomCollection.item_ids.includes(c.id));
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.tagline.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [activeTab, favoriteCharacters, activeCustomCollection, characters, searchQuery]);

  // Filtered Worlds based on tab, collection, and search
  const filteredWorlds = useMemo(() => {
    let list: WorldPreset[] = [];

    if (activeTab === 'all' || activeTab === 'worlds') {
      list = favoriteWorlds;
    } else if (activeCustomCollection) {
      list = worlds.filter((w) => activeCustomCollection.item_ids.includes(w.id));
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.genre.toLowerCase().includes(q) ||
        w.tagline.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q)
    );
  }, [activeTab, favoriteWorlds, activeCustomCollection, worlds, searchQuery]);

  // Filtered Created Worlds based on tab, collection, and search
  const filteredCreatedWorlds = useMemo(() => {
    let list: WorldPreset[] = [];

    if (activeTab === 'all' || activeTab === 'created-worlds') {
      list = createdWorlds;
    } else if (activeCustomCollection) {
      list = createdWorlds.filter((w) => activeCustomCollection.item_ids.includes(w.id));
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.genre.toLowerCase().includes(q) ||
        w.tagline.toLowerCase().includes(q)
    );
  }, [activeTab, createdWorlds, activeCustomCollection, searchQuery]);

  // Total items in vault
  const totalVaultCount = favoriteCharacters.length + favoriteWorlds.length + createdWorlds.length;

  // Handlers for Collection Management
  const handleCreateCollection = () => {
    const trimmed = newCollectionName.trim();
    if (!trimmed) return;
    const created = createCollection(trimmed);
    setActiveTab(created.id);
    setNewCollectionName('');
    setShowNewCollectionInput(false);
  };

  const handleStartRename = (col: UserCollection) => {
    setEditingCollectionId(col.id);
    setEditingCollectionName(col.name);
  };

  const handleSaveRename = (colId: string) => {
    renameCollection(colId, editingCollectionName);
    setEditingCollectionId(null);
  };

  const handleDeleteCollection = (colId: string) => {
    deleteCollection(colId);
    if (activeTab === colId) {
      setActiveTab('all');
    }
  };

  const handleToggleCharacterFavorite = async (charId: string) => {
    const target = characters.find((c) => c.id === charId);
    if (target) {
      await updateCharacter(charId, { is_favorite: !target.is_favorite });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#0a0b0e] text-white">
      {/* 1. TOP APP BAR & COCKPIT HEADER */}
      <header className="sticky top-0 z-30 bg-[#12131a]/90 backdrop-blur-md border-b border-[#27272a] px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1e2029] hover:bg-[#282b37] text-zinc-300 hover:text-white border border-white/5 text-xs font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Hub</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <h1 className="text-lg font-bold text-white tracking-wide">
                Favorites
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                {totalVaultCount} Saved
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Your curated roleplay companions, worlds, and custom collections.
            </p>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, tag, or genre..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#1a1b24] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* 2. CATEGORY NAVIGATION PILLS & COLLECTION MANAGER */}
      <nav className="px-6 py-3 bg-[#0f1016] border-b border-white/5 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
        {/* System: All */}
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === 'all'
              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
              : 'bg-[#181922] text-zinc-400 hover:text-white border border-white/5'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>All Favorites</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
            {totalVaultCount}
          </span>
        </button>

        {/* System: Characters */}
        <button
          type="button"
          onClick={() => setActiveTab('characters')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === 'characters'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-[#181922] text-zinc-400 hover:text-white border border-white/5'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span>Characters</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10">
            {favoriteCharacters.length}
          </span>
        </button>

        {/* System: Worlds */}
        <button
          type="button"
          onClick={() => setActiveTab('worlds')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === 'worlds'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-[#181922] text-zinc-400 hover:text-white border border-white/5'
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <span>Worlds</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10">
            {favoriteWorlds.length}
          </span>
        </button>

        {/* System: My Created Worlds */}
        <button
          type="button"
          onClick={() => setActiveTab('created-worlds')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === 'created-worlds'
              ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
              : 'bg-[#181922] text-zinc-400 hover:text-white border border-white/5'
          }`}
        >
          <Wrench className="w-3.5 h-3.5 text-violet-400" />
          <span>My Created Worlds</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10">
            {createdWorlds.length}
          </span>
        </button>

        {/* Divider */}
        <div className="h-4 w-px bg-zinc-800 mx-1 shrink-0" />

        {/* Custom User Collections */}
        {collections.map((col) => {
          const isSelected = activeTab === col.id;
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => setActiveTab(col.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : 'bg-[#181922] text-zinc-400 hover:text-white border border-white/5'
              }`}
            >
              <Folder className="w-3.5 h-3.5 text-amber-400" />
              <span>{col.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10">
                {col.item_ids.length}
              </span>
            </button>
          );
        })}

        {/* Inline New Category Creator */}
        {showNewCollectionInput ? (
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="Collection name..."
              className="px-2.5 py-1 rounded-xl bg-[#20222d] border border-amber-500 text-xs text-white focus:outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateCollection();
                if (e.key === 'Escape') setShowNewCollectionInput(false);
              }}
            />
            <button
              type="button"
              onClick={handleCreateCollection}
              className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setShowNewCollectionInput(false)}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowNewCollectionInput(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#181922] hover:bg-[#232532] text-xs text-amber-400 font-semibold border border-dashed border-amber-500/30 transition-colors shrink-0 cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>+ New Category</span>
          </button>
        )}
      </nav>

      {/* Active Custom Collection Sub-Header (Allows Rename & Delete) */}
      {activeCustomCollection && (
        <div className="px-6 py-2.5 bg-[#14151f] border-b border-white/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-amber-400" />
            {editingCollectionId === activeCustomCollection.id ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={editingCollectionName}
                  onChange={(e) => setEditingCollectionName(e.target.value)}
                  className="px-2 py-0.5 rounded-lg bg-[#20222d] border border-amber-500 text-xs text-white"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRename(activeCustomCollection.id);
                    if (e.key === 'Escape') setEditingCollectionId(null);
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSaveRename(activeCustomCollection.id)}
                  className="p-1 rounded bg-emerald-600 text-white cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span className="font-bold text-white tracking-wide">
                {activeCustomCollection.name}
              </span>
            )}
            <span className="text-zinc-500">
              ({activeCustomCollection.item_ids.length} items in collection)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleStartRename(activeCustomCollection)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#20222d] hover:bg-[#2b2d3d] text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
              <span>Rename</span>
            </button>
            <button
              type="button"
              onClick={() => handleDeleteCollection(activeCustomCollection.id)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete Category</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. MAIN CONTENT SHELVES & GRIDS */}
      <main className="flex-1 p-6 space-y-8 max-w-7xl w-full mx-auto">
        {/* Global Empty State (Nothing Favorited & No Created Worlds) */}
        {totalVaultCount === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/10">
              <Star className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Your Vault is Empty</h2>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Star your favorite companions in the Discover Gallery or craft custom realms in the World Studio. They will appear here for 1-click access and custom categorization.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => onNavigate('gallery')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md cursor-pointer"
              >
                Browse Characters
              </button>
              <button
                type="button"
                onClick={() => onNavigate('world-studio')}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white shadow-md cursor-pointer"
              >
                Create a World
              </button>
            </div>
          </div>
        )}

        {/* SECTION A: FAVORITE COMPANIONS */}
        {(activeTab === 'all' || activeTab === 'characters' || activeCustomCollection) && (
          <section className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Favorited Characters
                </h2>
                <span className="text-xs text-zinc-500">
                  ({filteredCharacters.length})
                </span>
              </div>
              {activeTab === 'all' && filteredCharacters.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('characters')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {filteredCharacters.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#12131b] border border-dashed border-white/10 text-center">
                <p className="text-xs text-zinc-400">
                  {activeCustomCollection
                    ? `No characters assigned to category "${activeCustomCollection.name}" yet.`
                    : 'No favorited characters found.'}
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('gallery')}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-[#1e2029] hover:bg-[#272935] text-xs text-indigo-300 font-semibold border border-indigo-500/20 cursor-pointer"
                >
                  Explore Characters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredCharacters.map((char) => {
                  const assignedCollections = collections.filter((c) =>
                    c.item_ids.includes(char.id)
                  );

                  return (
                    <div
                      key={char.id}
                      className="group relative flex flex-col rounded-2xl bg-[#14151e] border border-[#262836] hover:border-indigo-500/50 transition-all duration-200 overflow-hidden shadow-md hover:shadow-indigo-500/10"
                    >
                      {/* Card Header & Avatar */}
                      <div className="p-4 flex items-start gap-3">
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-zinc-800 shrink-0 border border-white/10">
                          <img
                            src={char.avatar_url}
                            alt={char.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                            }}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h3 className="text-sm font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                              {char.name}
                            </h3>
                            {/* Star Toggle */}
                            <button
                              type="button"
                              onClick={() => handleToggleCharacterFavorite(char.id)}
                              className="p-1 text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                              title="Toggle Favorite"
                            >
                              <Star className="w-4 h-4 fill-amber-400" />
                            </button>
                          </div>
                          <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                            {char.tagline || char.description}
                          </p>
                        </div>
                      </div>

                      {/* Tags & Assigned Category Badges */}
                      <div className="px-4 pb-3 flex items-center gap-1.5 flex-wrap">
                        {assignedCollections.map((col) => (
                          <span
                            key={col.id}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1"
                          >
                            <Folder className="w-2.5 h-2.5" />
                            <span>{col.name}</span>
                          </span>
                        ))}
                        {char.tags.slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/5"
                          >
                            {t}
                          </span>
                        ))}
                      </div>

                      {/* Card Action Footer */}
                      <div className="mt-auto p-3 bg-[#101118] border-t border-white/5 flex items-center gap-2">
                        {/* Collection Assignment Popover Trigger */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setAssigningItemId(
                                assigningItemId === char.id ? null : char.id
                              )
                            }
                            className="p-2 rounded-xl bg-[#1c1d27] hover:bg-[#252636] text-zinc-400 hover:text-white border border-white/5 transition-colors cursor-pointer"
                            title="Assign to Collections"
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                          </button>

                          {/* Collection Dropdown Popover */}
                          {assigningItemId === char.id && (
                            <div
                              ref={popoverRef}
                              className="absolute left-0 bottom-full mb-2 w-56 rounded-2xl bg-[#191a24] border border-[#2e3042] shadow-2xl p-3 z-50 text-xs space-y-2.5 animate-in fade-in zoom-in-95"
                            >
                              <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                                <span className="font-bold text-white flex items-center gap-1">
                                  <Folder className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Collections</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setAssigningItemId(null)}
                                  className="text-zinc-500 hover:text-white"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {collections.length === 0 ? (
                                <p className="text-[11px] text-zinc-500 py-1">
                                  No collections created yet.
                                </p>
                              ) : (
                                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                  {collections.map((col) => {
                                    const inCol = col.item_ids.includes(char.id);
                                    return (
                                      <label
                                        key={col.id}
                                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={inCol}
                                          onChange={() =>
                                            toggleItemInCollection(col.id, char.id)
                                          }
                                          className="rounded text-amber-500 focus:ring-amber-400"
                                        />
                                        <span className="text-zinc-300 truncate">
                                          {col.name}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Inline Quick Add Collection */}
                              <div className="pt-1.5 border-t border-white/5 flex items-center gap-1">
                                <input
                                  type="text"
                                  value={popoverNewCollectionName}
                                  onChange={(e) =>
                                    setPopoverNewCollectionName(e.target.value)
                                  }
                                  placeholder="+ New category..."
                                  className="flex-1 px-2 py-1 rounded-lg bg-[#232432] border border-white/10 text-[11px] text-white focus:outline-none focus:border-amber-500"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && popoverNewCollectionName.trim()) {
                                      const newCol = createCollection(
                                        popoverNewCollectionName.trim()
                                      );
                                      toggleItemInCollection(newCol.id, char.id);
                                      setPopoverNewCollectionName('');
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (popoverNewCollectionName.trim()) {
                                      const newCol = createCollection(
                                        popoverNewCollectionName.trim()
                                      );
                                      toggleItemInCollection(newCol.id, char.id);
                                      setPopoverNewCollectionName('');
                                    }
                                  }}
                                  className="p-1 rounded-lg bg-amber-500 text-black cursor-pointer"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => onSelectCharacter(char)}
                          className="px-3 py-1.5 rounded-xl bg-[#1c1d27] hover:bg-[#252636] text-xs font-semibold text-zinc-300 hover:text-white border border-white/5 transition-colors cursor-pointer"
                        >
                          Dossier
                        </button>

                        <button
                          type="button"
                          onClick={() => onStartRoleplayWithCharacter(char)}
                          className="flex-1 py-1.5 rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-xs font-bold text-white shadow-md transition-all cursor-pointer text-center"
                        >
                          Roleplay
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* SECTION B: MY CREATED WORLDS */}
        {(activeTab === 'all' || activeTab === 'created-worlds' || activeCustomCollection) && (
          <section className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-violet-400" />
                <h2 className="text-sm font-bold text-white tracking-wide">
                  My Created Worlds
                </h2>
                <span className="text-xs text-zinc-500">
                  ({filteredCreatedWorlds.length})
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('world-studio')}
                  className="text-xs text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>+ Create World</span>
                </button>
                {activeTab === 'all' && filteredCreatedWorlds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('created-worlds')}
                    className="text-xs text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {filteredCreatedWorlds.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#12131b] border border-dashed border-white/10 text-center">
                <p className="text-xs text-zinc-400">
                  {activeCustomCollection
                    ? `No custom created worlds in category "${activeCustomCollection.name}".`
                    : "You haven't crafted any custom realms yet."}
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('world-studio')}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-[#1e2029] hover:bg-[#272935] text-xs text-violet-300 font-semibold border border-violet-500/20 cursor-pointer"
                >
                  Launch World Studio
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredCreatedWorlds.map((world) => {
                  const assignedCollections = collections.filter((c) =>
                    c.item_ids.includes(world.id)
                  );

                  return (
                    <div
                      key={world.id}
                      className="group relative flex flex-col rounded-2xl bg-[#14151e] border border-violet-500/30 hover:border-violet-500/60 transition-all duration-200 overflow-hidden shadow-lg shadow-violet-500/5"
                    >
                      {/* Banner Header */}
                      <div className="relative h-36 w-full overflow-hidden bg-zinc-800">
                        <img
                          src={world.banner_url}
                          alt={world.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80';
                          }}
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-[#14151e] via-transparent to-black/40" />

                        {/* Badges */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-violet-600 text-white font-bold tracking-wide shadow-md">
                            Authored Realm
                          </span>
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-zinc-300 border border-white/10 font-semibold">
                            {world.genre}
                          </span>
                        </div>

                        {/* Star Toggle */}
                        <button
                          type="button"
                          onClick={() => toggleFavoriteWorld(world.id)}
                          className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 backdrop-blur-md text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              favoriteWorldIds.includes(world.id)
                                ? 'fill-amber-400'
                                : 'text-zinc-400'
                            }`}
                          />
                        </button>
                      </div>

                      {/* World Details */}
                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="text-base font-bold text-white group-hover:text-violet-300 transition-colors">
                          {world.name}
                        </h3>
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                          {world.tagline || world.description}
                        </p>

                        {/* Topo / Faction counts & collections */}
                        <div className="mt-3 flex items-center gap-2 flex-wrap text-[11px] text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Compass className="w-3.5 h-3.5 text-violet-400" />
                            <span>{world.starter_locations.length} Chambers</span>
                          </span>
                          <span className="text-zinc-600">•</span>
                          <span>{world.tags?.slice(0, 2).join(', ')}</span>

                          {assignedCollections.map((col) => (
                            <span
                              key={col.id}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1"
                            >
                              <Folder className="w-2.5 h-2.5" />
                              <span>{col.name}</span>
                            </span>
                          ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-5 pt-3 border-t border-white/5 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onEditWorldInStudio(world.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#20222e] hover:bg-[#2c2f40] text-xs font-semibold text-violet-300 hover:text-white border border-violet-500/20 transition-colors cursor-pointer"
                            title="Edit world in World Studio"
                          >
                            <Wrench className="w-3 h-3" />
                            <span>Edit Studio</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onSelectWorld(world)}
                            className="px-2.5 py-1.5 rounded-xl bg-[#1c1d27] hover:bg-[#252636] text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                          >
                            Details
                          </button>

                          <button
                            type="button"
                            onClick={() => onCreateUniverseWithWorld(world.id)}
                            className="flex-1 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white shadow-md transition-colors cursor-pointer text-center"
                          >
                            Launch Universe
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* SECTION C: FAVORITE WORLDS (Built-in + Presets) */}
        {(activeTab === 'all' || activeTab === 'worlds' || activeCustomCollection) && (
          <section className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Favorited Worlds & Settings
                </h2>
                <span className="text-xs text-zinc-500">
                  ({filteredWorlds.length})
                </span>
              </div>
              {activeTab === 'all' && filteredWorlds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('worlds')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {filteredWorlds.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#12131b] border border-dashed border-white/10 text-center">
                <p className="text-xs text-zinc-400">
                  {activeCustomCollection
                    ? `No worlds assigned to category "${activeCustomCollection.name}".`
                    : 'No favorited worlds found.'}
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('worlds')}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-[#1e2029] hover:bg-[#272935] text-xs text-emerald-300 font-semibold border border-emerald-500/20 cursor-pointer"
                >
                  Explore Worlds
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredWorlds.map((world) => {
                  const assignedCollections = collections.filter((c) =>
                    c.item_ids.includes(world.id)
                  );

                  return (
                    <div
                      key={world.id}
                      className="group relative flex flex-col rounded-2xl bg-[#14151e] border border-[#262836] hover:border-emerald-500/50 transition-all duration-200 overflow-hidden shadow-md hover:shadow-emerald-500/5"
                    >
                      {/* Banner Header */}
                      <div className="relative h-36 w-full overflow-hidden bg-zinc-800">
                        <img
                          src={world.banner_url}
                          alt={world.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80';
                          }}
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-[#14151e] via-transparent to-black/40" />

                        {/* Genre Badge */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-emerald-300 border border-emerald-500/30 font-semibold">
                            {world.genre}
                          </span>
                        </div>

                        {/* Star Toggle */}
                        <button
                          type="button"
                          onClick={() => toggleFavoriteWorld(world.id)}
                          className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 backdrop-blur-md text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star className="w-4 h-4 fill-amber-400" />
                        </button>
                      </div>

                      {/* World Details */}
                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                          {world.name}
                        </h3>
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                          {world.tagline || world.description}
                        </p>

                        {/* Topo / Faction info & collections */}
                        <div className="mt-3 flex items-center gap-2 flex-wrap text-[11px] text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Compass className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{world.starter_locations.length} Chambers</span>
                          </span>
                          <span className="text-zinc-600">•</span>
                          <span>{world.tags?.slice(0, 2).join(', ')}</span>

                          {assignedCollections.map((col) => (
                            <span
                              key={col.id}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1"
                            >
                              <Folder className="w-2.5 h-2.5" />
                              <span>{col.name}</span>
                            </span>
                          ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-5 pt-3 border-t border-white/5 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectWorld(world)}
                            className="px-3 py-1.5 rounded-xl bg-[#1c1d27] hover:bg-[#252636] text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                          >
                            Details
                          </button>

                          <button
                            type="button"
                            onClick={() => onCreateUniverseWithWorld(world.id)}
                            className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md transition-colors cursor-pointer text-center"
                          >
                            Pair & Launch
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};
