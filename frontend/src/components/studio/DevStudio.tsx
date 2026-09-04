import React, { useState, useMemo } from 'react';
import {
  Search,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  Download,
  AlertTriangle,
  Sparkles,
  Check,
  X,
  Loader2,
  Shield,
  MessageSquare,
  Plus,
} from 'lucide-react';
import { useChatStore } from '../../stores/useChatStore';
import type { Character } from '../../types';

export const DevStudio: React.FC = () => {
  const {
    characters,
    toggleCharacterVisibility,
    deleteCharacter,
    updateCharacter,
    exportCharacterPng,
    setActiveCharacter,
    setActiveView,
    createNewChat,
  } = useChatStore();

  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'visible' | 'hidden'>('all');

  // Deletion Modal State
  const [deletingChar, setDeletingChar] = useState<Character | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit Modal State
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    tagline: string;
    description: string;
    personality: string;
    scenario: string;
    first_mes: string;
    tags: string[];
    is_hidden: boolean;
  }>({
    name: '',
    tagline: '',
    description: '',
    personality: '',
    scenario: '',
    first_mes: '',
    tags: [],
    is_hidden: false,
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  // Exporting state per character
  const [exportingId, setExportingId] = useState<string | null>(null);

  // Filtered Characters
  const filteredCharacters = useMemo(() => {
    return characters.filter((c) => {
      const isHidden = Boolean(c.is_hidden);
      if (filterTab === 'visible' && isHidden) return false;
      if (filterTab === 'hidden' && !isHidden) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.tagline?.toLowerCase().includes(q) ||
        c.creator?.toLowerCase().includes(q) ||
        c.tags?.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [characters, filterTab, search]);

  const visibleCount = characters.filter((c) => !c.is_hidden).length;
  const hiddenCount = characters.filter((c) => Boolean(c.is_hidden)).length;

  // Handlers
  const handleOpenEdit = (char: Character) => {
    setEditingChar(char);
    setEditForm({
      name: char.name,
      tagline: char.tagline || '',
      description: char.description || '',
      personality: char.personality || '',
      scenario: char.scenario || '',
      first_mes: char.first_mes || '',
      tags: [...(char.tags || [])],
      is_hidden: Boolean(char.is_hidden),
    });
  };

  const handleSaveEdit = async () => {
    if (!editingChar) return;
    setIsSavingEdit(true);
    try {
      await updateCharacter(editingChar.id, {
        name: editForm.name.trim() || editingChar.name,
        tagline: editForm.tagline.trim(),
        description: editForm.description.trim(),
        personality: editForm.personality.trim(),
        scenario: editForm.scenario.trim(),
        first_mes: editForm.first_mes.trim() || editingChar.first_mes,
        tags: editForm.tags,
        is_hidden: editForm.is_hidden,
      });
      setEditingChar(null);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingChar) return;
    setIsDeleting(true);
    try {
      await deleteCharacter(deletingChar.id);
      setDeletingChar(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportPng = async (char: Character) => {
    setExportingId(char.id);
    try {
      await exportCharacterPng(char.id);
    } finally {
      setExportingId(null);
    }
  };

  const handleStartChat = async (char: Character) => {
    setActiveCharacter(char.id);
    await createNewChat(char.id);
    setActiveView('chat');
  };

  const toggleTag = (tag: string) => {
    setEditForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const handleAddCustomTag = () => {
    const cleanTag = newTagInput.trim();
    if (cleanTag && !editForm.tags.includes(cleanTag)) {
      setEditForm((prev) => ({
        ...prev,
        tags: [...prev.tags, cleanTag],
      }));
      setNewTagInput('');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#09090b] text-zinc-100">
      {/* Header */}
      <div className="border-b border-[#27272a] bg-[#121214]/80 backdrop-blur-md sticky top-0 z-10 p-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-md">
              <Shield className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">Dev Studio & Character Manager</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Moderation
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Inspect, modify lore, toggle visibility, and safely clean up test character cards.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveView('gallery')}
              className="px-4 py-2 rounded-xl bg-[#1e1e24] hover:bg-[#27272a] text-xs font-semibold text-zinc-300 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Back to Discover</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto w-full p-6 space-y-6">
        {/* Controls Bar: Search & Status Filter */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, tagline, creator..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] focus:border-amber-500/50 text-xs text-zinc-200 placeholder-zinc-500 outline-none transition-all"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#18181b] rounded-xl border border-[#27272a] self-stretch sm:self-auto">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterTab === 'all'
                  ? 'bg-amber-500/20 text-amber-300 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All ({characters.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('visible')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                filterTab === 'visible'
                  ? 'bg-emerald-500/20 text-emerald-300 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Visible ({visibleCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('hidden')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                filterTab === 'hidden'
                  ? 'bg-zinc-800 text-zinc-200 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <EyeOff className="w-3 h-3" />
              <span>Hidden ({hiddenCount})</span>
            </button>
          </div>
        </div>

        {/* Characters Management Table */}
        <div className="rounded-2xl border border-[#27272a] bg-[#121214] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#27272a] bg-[#18181b]/60 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Companion</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Creator / Source</th>
                  <th className="py-3.5 px-4">Tags</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272a]/60 text-xs">
                {filteredCharacters.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-zinc-500">
                      No character cards found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCharacters.map((char) => {
                    const isHidden = Boolean(char.is_hidden);
                    return (
                      <tr
                        key={char.id}
                        className="hover:bg-[#18181b]/50 transition-colors group"
                      >
                        {/* Companion Info */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={char.avatar_url}
                              alt={char.name}
                              className="w-10 h-10 rounded-xl object-cover ring-1 ring-[#3f3f46] shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="font-bold text-zinc-200 block truncate max-w-xs">
                                {char.name}
                              </span>
                              <span className="text-[11px] text-zinc-400 block truncate max-w-xs">
                                {char.tagline || 'No tagline'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-4">
                          {isHidden ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                              <EyeOff className="w-3 h-3" />
                              <span>Hidden</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <Eye className="w-3 h-3" />
                              <span>Public</span>
                            </span>
                          )}
                        </td>

                        {/* Creator */}
                        <td className="py-3 px-4 text-zinc-400">
                          <span className="truncate block max-w-xs">{char.creator || 'Community'}</span>
                        </td>

                        {/* Tags */}
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {(char.tags || []).slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded-md text-[10px] bg-[#27272a] text-zinc-300 font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                            {(char.tags || []).length > 3 && (
                              <span className="text-[10px] text-zinc-500 self-center">
                                +{(char.tags || []).length - 3}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Roleplay Chat */}
                            <button
                              type="button"
                              onClick={() => handleStartChat(char)}
                              title="Start Roleplay Session"
                              className="p-2 rounded-lg bg-[#27272a] hover:bg-blue-600/20 hover:text-blue-400 text-zinc-300 transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Lore */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(char)}
                              title="Edit Character Lore"
                              className="p-2 rounded-lg bg-[#27272a] hover:bg-amber-500/20 hover:text-amber-300 text-zinc-300 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Hide / Unhide Toggle */}
                            <button
                              type="button"
                              onClick={() => toggleCharacterVisibility(char.id)}
                              title={isHidden ? 'Make Public (Visible in Discover)' : 'Hide from Discover Gallery'}
                              className={`p-2 rounded-lg transition-colors ${
                                isHidden
                                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                                  : 'bg-[#27272a] hover:bg-zinc-700 text-zinc-300'
                              }`}
                            >
                              {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>

                            {/* Export Renoog V2 PNG Card */}
                            <button
                              type="button"
                              disabled={exportingId === char.id}
                              onClick={() => handleExportPng(char)}
                              title="Export Renoog V2 PNG Card"
                              className="p-2 rounded-lg bg-[#27272a] hover:bg-indigo-600/20 hover:text-indigo-300 text-zinc-300 transition-colors disabled:opacity-50"
                            >
                              {exportingId === char.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => setDeletingChar(char)}
                              title="Delete Character Card"
                              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── Delete Confirmation Modal ────────────────────────────────────────── */}
      {deletingChar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#18181b] border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Character Card</h3>
                <p className="text-xs text-zinc-400">This action cannot be undone.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#27272a]/60 border border-[#3f3f46]">
              <img
                src={deletingChar.avatar_url}
                alt={deletingChar.name}
                className="w-12 h-12 rounded-lg object-cover ring-1 ring-zinc-600 shrink-0"
              />
              <div className="min-w-0">
                <span className="font-bold text-zinc-200 block truncate">{deletingChar.name}</span>
                <span className="text-xs text-zinc-400 block truncate">
                  {deletingChar.tagline || 'No tagline specified'}
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-zinc-200">{deletingChar.name}</strong>?
              All associated chat sessions and message histories will also be removed.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingChar(null)}
                className="px-4 py-2 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-xs font-semibold text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Character Lore Modal ─────────────────────────────────────────── */}
      {editingChar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#18181b] border border-[#27272a] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#27272a]">
              <div className="flex items-center gap-3">
                <img
                  src={editingChar.avatar_url}
                  alt={editingChar.name}
                  className="w-10 h-10 rounded-xl object-cover ring-1 ring-amber-500/50 shrink-0"
                />
                <div>
                  <h3 className="text-base font-bold text-white">Edit Character Lore</h3>
                  <p className="text-xs text-zinc-400">Modify prompt layers, greeting, and visibility.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingChar(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272a] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Character Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#121214] border border-[#27272a] focus:border-amber-500/50 text-zinc-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Tagline</label>
                  <input
                    type="text"
                    value={editForm.tagline}
                    onChange={(e) => setEditForm({ ...editForm, tagline: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#121214] border border-[#27272a] focus:border-amber-500/50 text-zinc-200 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Personality & Speech Style</label>
                <textarea
                  rows={3}
                  value={editForm.personality}
                  onChange={(e) => setEditForm({ ...editForm, personality: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#121214] border border-[#27272a] focus:border-amber-500/50 text-zinc-200 outline-none resize-y"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Scenario / Setting</label>
                <textarea
                  rows={2}
                  value={editForm.scenario}
                  onChange={(e) => setEditForm({ ...editForm, scenario: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#121214] border border-[#27272a] focus:border-amber-500/50 text-zinc-200 outline-none resize-y"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Opening Greeting (first_mes)</label>
                <textarea
                  rows={3}
                  value={editForm.first_mes}
                  onChange={(e) => setEditForm({ ...editForm, first_mes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#121214] border border-[#27272a] focus:border-amber-500/50 text-zinc-200 outline-none resize-y font-mono text-[11px]"
                />
              </div>

              {/* Tags Selector */}
              <div>
                <label className="block text-zinc-400 font-semibold mb-1.5">Genre & Archetype Tags</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {['Fantasy', 'Sci-Fi', 'Cyberpunk', 'Mystery', 'Magic', 'Adventure', 'Anime', 'Custom'].map(
                    (tag) => {
                      const isSelected = editForm.tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-[#27272a] text-zinc-400 hover:text-zinc-200 border border-transparent'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    }
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomTag())}
                    placeholder="Add custom tag..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-[#121214] border border-[#27272a] text-zinc-200 text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTag}
                    className="px-3 py-1.5 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-zinc-200 text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Visibility Checkbox */}
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#121214] border border-[#27272a]">
                <input
                  type="checkbox"
                  id="edit_is_hidden"
                  checked={editForm.is_hidden}
                  onChange={(e) => setEditForm({ ...editForm, is_hidden: e.target.checked })}
                  className="rounded bg-zinc-800 border-zinc-700 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="edit_is_hidden" className="text-xs text-zinc-300 cursor-pointer">
                  <strong>Hide character from public Discover Gallery</strong> (only accessible in Dev Studio)
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#27272a] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingChar(null)}
                className="px-4 py-2 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-xs font-semibold text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={handleSaveEdit}
                className="px-5 py-2 rounded-xl bg-linear-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-xs font-semibold text-white transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
