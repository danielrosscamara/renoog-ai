import React, { useState, useRef } from 'react';
import { Search, MessageSquare, Sparkles, Tag, Plus, Upload, Download, Loader2, AlertCircle, CheckCircle2, X, Edit3, Image as ImageIcon } from 'lucide-react';
import { useChatStore } from '../../stores/useChatStore';
import type { Character } from '../../types';
import { CharacterCardSkeleton } from '../common/Skeleton';

const GENRE_TAGS = [
  'All',
  'Fantasy',
  'Sci-Fi',
  'Cyberpunk',
  'Mystery',
  'Magic',
  'Detective',
  'Anime',
  'Action',
  'Adventure',
];

const AVAILABLE_PILL_TAGS = [
  'Fantasy',
  'Sci-Fi',
  'Cyberpunk',
  'Mystery',
  'Magic',
  'Anime',
  'Action',
  'Adventure',
  'Lore Heavy',
  'Custom',
];

export const CharacterGallery: React.FC = () => {
  const {
    characters,
    isLoading,
    createNewChat,
    importCharacterPng,
    exportCharacterPng,
    updateCharacter,
    setEditingCharacter,
    setActiveView,
  } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // In-modal draft customizer state
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter characters based on search query and selected genre tags
  const filteredCharacters = characters.filter((char) => {
    // Exclude hidden characters from the public Discover gallery
    if (char.is_hidden) return false;

    const matchesTag =
      selectedTag === 'All' ||
      char.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase());

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      query === '' ||
      char.name.toLowerCase().includes(query) ||
      char.tagline.toLowerCase().includes(query) ||
      char.tags.some((t) => t.toLowerCase().includes(query));

    return matchesTag && matchesSearch;
  });

  const handleStartChat = (characterId: string) => {
    createNewChat(characterId);
  };

  const handleFileProcess = async (file: File) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
    const hasValidExt = allowed.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setImportStatus({
        type: 'error',
        message: 'Please upload an image (.png, .jpg, .jpeg, or .webp).',
      });
      return;
    }

    try {
      setIsImporting(true);
      setImportStatus(null);
      const newChar = await importCharacterPng(file);
      setIsImporting(false);
      setEditingChar(newChar);
      setImportStatus({
        type: 'success',
        message: `Imported "${newChar.name}"!`,
      });
    } catch (err: unknown) {
      setIsImporting(false);
      const msg = err instanceof Error ? err.message : 'Failed to process image';
      setImportStatus({
        type: 'error',
        message: msg,
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file) await handleFileProcess(file);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file) await handleFileProcess(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExport = async (e: React.MouseEvent, charId: string) => {
    e.stopPropagation();
    try {
      await exportCharacterPng(charId);
    } catch {
      // Ignore export error
    }
  };

  const handleToggleTag = (tagToToggle: string) => {
    if (!editingChar) return;
    const currentTags = editingChar.tags || [];
    const exists = currentTags.includes(tagToToggle);
    const updatedTags = exists
      ? currentTags.filter((t) => t !== tagToToggle)
      : [...currentTags, tagToToggle];
    setEditingChar({ ...editingChar, tags: updatedTags });
  };

  const handleSaveAndStart = async () => {
    if (!editingChar) return;
    setIsSavingEdit(true);
    try {
      await updateCharacter(editingChar.id, {
        name: editingChar.name,
        tagline: editingChar.tagline,
        description: editingChar.description,
        personality: editingChar.personality,
        scenario: editingChar.scenario,
        first_mes: editingChar.first_mes,
        tags: editingChar.tags,
      });
      const charId = editingChar.id;
      setEditingChar(null);
      setIsSavingEdit(false);
      handleStartChat(charId);
    } catch {
      setIsSavingEdit(false);
    }
  };

  return (
    <div
      className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#121214] text-zinc-100 p-6 md:p-10"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden File Input for Card Uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl w-full mx-auto mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Discover Characters
            </h1>
          </div>
          <p className="text-sm text-zinc-400">
            Choose a companion or drag & drop any character card or image to import
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1e1e22] hover:bg-[#27272a] border border-[#2e2e36] text-xs font-medium text-zinc-300 transition-colors shadow-sm disabled:opacity-50"
          >
            {isImporting ? (
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 text-indigo-400" />
            )}
            <span>{isImporting ? 'Processing Image...' : 'Import Image / Card'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingCharacter({
                id: `char_${Date.now()}`,
                name: 'New Companion',
                tagline: 'A mysterious new character waiting to be written.',
                description: '',
                personality: '',
                scenario: '',
                first_mes:
                  '*looks up as you enter, acknowledging your presence with a subtle nod* "Welcome. Who might you be?"',
                mes_example: '',
                avatar_url:
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=60',
                tags: ['Custom'],
                is_favorite: false,
                creator: 'You',
                created_at: new Date().toISOString(),
              });
              setActiveView('character-studio');
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-semibold text-white transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Character</span>
          </button>
        </div>
      </div>

      {/* Drag & Drop Hero Zone */}
      <div className="max-w-7xl w-full mx-auto mb-6">
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer border-2 border-dashed rounded-2xl p-6 transition-all duration-300 flex flex-col sm:flex-row items-center justify-between gap-4 ${
            isDraggingOver
              ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10 scale-[1.01]'
              : 'border-[#27272a] hover:border-indigo-500/40 bg-[#161619] hover:bg-[#1a1a1e]'
          }`}
        >
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">
                Drag & drop any Character Card or Image (.png, .jpg, .webp)
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                Automatically parses character card metadata or creates a customizable character draft.
              </p>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-lg bg-[#222226] border border-[#2e2e36] text-xs font-medium text-indigo-300 shrink-0">
            Browse File
          </span>
        </div>
      </div>

      {/* Import Status Alert Banner */}
      {importStatus && (
        <div className="max-w-7xl w-full mx-auto mb-6">
          <div
            className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-medium ${
              importStatus.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {importStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{importStatus.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setImportStatus(null)}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Controls: Search & Tag Filter Pills */}
      <div className="max-w-7xl w-full mx-auto mb-8 space-y-4">
        {/* Search Bar */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search characters by name, tagline, or genre..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 text-sm text-zinc-200 placeholder-zinc-400 outline-none transition-all"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {GENRE_TAGS.map((tag) => {
            const isActive = selectedTag === tag;
            return (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
                  isActive
                    ? 'bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'bg-[#18181b] border border-[#27272a] text-zinc-400 hover:text-zinc-200 hover:border-[#3f3f46]'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Character Cards Grid */}
      <div className="max-w-7xl w-full mx-auto pb-12">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <CharacterCardSkeleton key={`gallery-skeleton-${i}`} />
            ))}
          </div>
        ) : filteredCharacters.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCharacters.map((character: Character) => (
              <div
                key={character.id}
                onClick={() => handleStartChat(character.id)}
                className="group relative flex flex-col rounded-2xl bg-[#18181b] border border-[#27272a] hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 overflow-hidden cursor-pointer"
              >
                {/* Image Container with Vignette */}
                <div className="relative aspect-4/3 w-full overflow-hidden bg-zinc-900">
                  <img
                    src={character.avatar_url}
                    alt={character.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-[#18181b] via-[#18181b]/30 to-transparent" />

                  {/* Primary Tag Badge */}
                  {character.tags[0] && (
                    <span className="absolute top-3 left-3 px-2 py-1 rounded-md text-[10px] font-semibold bg-black/60 backdrop-blur-md text-zinc-300 border border-white/10 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-indigo-400" />
                      {character.tags[0]}
                    </span>
                  )}

                  {/* Card Action Buttons on Image */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      title="Edit in Character Prompt Studio"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCharacter(character);
                        setActiveView('character-studio');
                      }}
                      className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-zinc-300 hover:text-white border border-white/10 hover:border-indigo-400/50 transition-all cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Export as Renoog V2 PNG Card"
                      onClick={(e) => handleExport(e, character.id)}
                      className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-zinc-300 hover:text-white border border-white/10 hover:border-indigo-400/50 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Card Body */}
                <div className="flex-1 flex flex-col p-4 -mt-6 relative z-10">
                  <h3 className="font-bold text-base text-white group-hover:text-indigo-400 transition-colors truncate">
                    {character.name}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 mb-3 line-clamp-2 leading-relaxed">
                    {character.tagline}
                  </p>

                  <div className="mt-auto pt-3 border-t border-[#232326] flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400 truncate">
                      by {character.creator}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleStartChat(character.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">No characters found</h3>
            <p className="text-xs text-zinc-400 max-w-sm mb-4">
              We couldn't find any characters matching &quot;{searchQuery}&quot;. Try searching for something else or clearing your filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedTag('All');
              }}
              className="px-4 py-2 rounded-xl bg-[#222226] border border-[#2e2e36] text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Interactive Card Customizer / Preview Modal */}
      {editingChar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  {editingChar.creator.includes('No Metadata')
                    ? 'Customize New Character'
                    : 'Character Card Details'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingChar(null)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metadata Source Alert Banner */}
            {editingChar.creator.includes('No Metadata') ? (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs leading-relaxed">
                <ImageIcon className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <p className="font-semibold text-amber-200">Standard Image (No Embedded Lore)</p>
                  <p className="text-amber-300/80">
                    This image has no embedded character card metadata. Customize {editingChar.name}&apos;s backstory, personality, and greeting below:
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Rich Renoog V2 Card metadata successfully extracted!</span>
              </div>
            )}

            {/* Avatar & Name / Tagline Inputs */}
            <div className="flex items-start gap-4">
              <img
                src={editingChar.avatar_url}
                alt={editingChar.name}
                className="w-20 h-20 rounded-2xl object-cover border border-[#2e2e36] shrink-0"
              />
              <div className="flex-1 space-y-2.5 min-w-0">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                    Character Name
                  </label>
                  <input
                    type="text"
                    value={editingChar.name}
                    onChange={(e) => setEditingChar({ ...editingChar, name: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#121214] border border-[#27272a] focus:border-indigo-500 text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                    Tagline / One-line Summary
                  </label>
                  <input
                    type="text"
                    value={editingChar.tagline}
                    onChange={(e) => setEditingChar({ ...editingChar, tagline: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#121214] border border-[#27272a] focus:border-indigo-500 text-xs text-zinc-200 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Genre Tags Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-400 block">
                Genre Tags (Click to toggle)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_PILL_TAGS.map((tag) => {
                  const isSelected = editingChar.tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-[#1e1e22] text-zinc-400 hover:text-zinc-200 border border-[#27272a]'
                      }`}
                    >
                      {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Personality & Backstory */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400 block">
                Personality & Attributes
              </label>
              <textarea
                rows={2}
                value={editingChar.personality}
                onChange={(e) => setEditingChar({ ...editingChar, personality: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#121214] border border-[#27272a] focus:border-indigo-500 text-xs text-zinc-200 outline-none leading-relaxed"
                placeholder="Character's personality traits, quirks, and mannerisms..."
              />
            </div>

            {/* First Greeting (Opening Message) */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400 block">
                First Opening Greeting (*action* &quot;dialogue&quot;)
              </label>
              <textarea
                rows={3}
                value={editingChar.first_mes}
                onChange={(e) => setEditingChar({ ...editingChar, first_mes: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#121214] border border-[#27272a] focus:border-indigo-500 text-xs text-zinc-200 italic outline-none leading-relaxed"
                placeholder="Opening message the AI will send when starting a new chat..."
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#27272a]">
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
                onClick={handleSaveAndStart}
                className="px-5 py-2 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-semibold text-white transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSavingEdit ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <MessageSquare className="w-3.5 h-3.5" />
                )}
                <span>Save & Start Roleplay</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
