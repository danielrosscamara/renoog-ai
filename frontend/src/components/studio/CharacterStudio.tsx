import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Save,
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  Download,
  Tag,
  Loader2,
  ChevronUp,
  ChevronDown,
  Layers,
  Bot,
  User,
  Shield,
  Image as ImageIcon,
} from 'lucide-react';
import { useChatStore } from '../../stores/useChatStore';
import type { Character, PromptItem } from '../../types';

const AVAILABLE_GENRE_TAGS = [
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

const countTokens = (text: string): number => {
  if (!text) return 0;
  return Math.ceil(text.length / 3.8);
};

export const CharacterStudio: React.FC = () => {
  const {
    editingCharacter,
    setEditingCharacter,
    createCharacter,
    updateCharacter,
    createNewChat,
    setActiveView,
    exportCharacterPng,
  } = useChatStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);

  // Character Identity State
  const [charId] = useState<string>(() => editingCharacter?.id || `char_${Date.now()}`);
  const [name, setName] = useState<string>(() => editingCharacter?.name || 'New Companion');
  const [tagline, setTagline] = useState<string>(
    () => editingCharacter?.tagline || 'A mysterious new character waiting to be written.'
  );
  const [creator, setCreator] = useState<string>(() => editingCharacter?.creator || 'You');
  const [avatarUrl, setAvatarUrl] = useState<string>(
    () =>
      editingCharacter?.avatar_url ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=60'
  );
  const [wallpaperUrl, setWallpaperUrl] = useState<string>(
    () => editingCharacter?.wallpaper_url || ''
  );
  const [tags, setTags] = useState<string[]>(() => editingCharacter?.tags || ['Custom']);

  // Initial Prompt Items Builder (TavernAI Prompt Manager Standard)
  const [promptItems, setPromptItems] = useState<PromptItem[]>(() => {
    if (editingCharacter?.prompt_items && editingCharacter.prompt_items.length > 0) {
      return editingCharacter.prompt_items;
    }
    return [
      {
        id: 'item_desc',
        name: 'Description & Personality',
        role: 'system',
        position: 'relative',
        content: editingCharacter?.personality
          ? `${editingCharacter.description}\n\n[Personality: ${editingCharacter.personality}]`
          : '{{char}} is an intriguing companion with a distinct presence, expressive personality, and rich backstory.',
        enabled: true,
        trim: true,
        order: 0,
      },
      {
        id: 'item_scenario',
        name: 'Scenario & World Lore',
        role: 'system',
        position: 'relative',
        content:
          editingCharacter?.scenario ||
          '{{char}} and {{user}} meet in an evocative setting where their story begins.',
        enabled: true,
        trim: true,
        order: 1,
      },
      {
        id: 'item_dialogue',
        name: 'Sample Dialogues',
        role: 'system',
        position: 'relative',
        content:
          editingCharacter?.mes_example ||
          '<START>\n{{user}}: "Greetings, who are you?"\n{{char}}: *glances over with a thoughtful smile* "I could ask you the same question."',
        enabled: true,
        trim: true,
        order: 2,
      },
      {
        id: 'item_greeting',
        name: 'First Opening Greeting',
        role: 'assistant',
        position: 'relative',
        content:
          editingCharacter?.first_mes ||
          '*looks up as you enter, acknowledging your presence with a subtle nod* "Welcome. What brings you here today?"',
        enabled: true,
        trim: true,
        order: 3,
      },
    ];
  });

  const [selectedItemId, setSelectedItemId] = useState<string>('item_desc');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Active Prompt Item being edited
  const activeItem = promptItems.find((i) => i.id === selectedItemId) || promptItems[0];

  // Helper to update active item fields
  const updateActiveItem = (updates: Partial<PromptItem>) => {
    if (!activeItem) return;
    setPromptItems((items) =>
      items.map((i) => (i.id === activeItem.id ? { ...i, ...updates } : i))
    );
  };

  // Toggle item enable/disable switch
  const toggleItemEnabled = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPromptItems((items) =>
      items.map((i) => (i.id === id ? { ...i, enabled: !i.enabled } : i))
    );
  };

  // Add a new Custom Prompt Block
  const handleCreatePromptItem = () => {
    const newItem: PromptItem = {
      id: `item_custom_${Date.now()}`,
      name: `Custom Lore Block ${promptItems.length + 1}`,
      role: 'system',
      position: 'relative',
      content: '<lore>\nEnter custom world info, scene directives, or combat rules here...\n</lore>',
      enabled: true,
      trim: true,
      order: promptItems.length,
    };
    setPromptItems((items) => [...items, newItem]);
    setSelectedItemId(newItem.id);
  };

  // Delete a prompt block
  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (promptItems.length <= 1) return;
    const remaining = promptItems.filter((i) => i.id !== id);
    setPromptItems(remaining);
    if (selectedItemId === id) {
      setSelectedItemId(remaining[0]?.id || '');
    }
  };

  // Move prompt item up/down
  const moveItem = (index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === promptItems.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...promptItems];
    const temp = reordered[index];
    const target = reordered[targetIndex];
    if (temp && target) {
      reordered[index] = target;
      reordered[targetIndex] = temp;
      setPromptItems(reordered.map((item, idx) => ({ ...item, order: idx })));
    }
  };

  // Toggle genre tags
  const handleToggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  // Handle Avatar image file upload
  const handleAvatarFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        setAvatarUrl(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Save Character and immediately start chat
  const handleSaveAndStart = async () => {
    setIsSaving(true);

    const descItem = promptItems.find((i) => i.id === 'item_desc')?.content || '';
    const scenarioItem = promptItems.find((i) => i.id === 'item_scenario')?.content || '';
    const dialogueItem = promptItems.find((i) => i.id === 'item_dialogue')?.content || '';
    const greetingItem = promptItems.find((i) => i.id === 'item_greeting')?.content || '';

    const characterPayload: Partial<Character> = {
      id: charId,
      name: name.trim() || 'Unnamed Character',
      tagline: tagline.trim() || 'AI Companion',
      description: descItem,
      personality: descItem,
      scenario: scenarioItem,
      first_mes: greetingItem,
      mes_example: dialogueItem,
      avatar_url: avatarUrl,
      wallpaper_url: wallpaperUrl,
      prompt_items: promptItems,
      tags: tags.length > 0 ? tags : ['Custom'],
      creator: creator.trim() || 'You',
    };

    try {
      if (editingCharacter) {
        await updateCharacter(editingCharacter.id, characterPayload);
        setEditingCharacter(null);
        await createNewChat(editingCharacter.id);
      } else {
        const created = await createCharacter(characterPayload);
        setEditingCharacter(null);
        await createNewChat(created.id);
      }
    } catch {
      // Retain optimistic workflow
    } finally {
      setIsSaving(false);
    }
  };

  // Export card
  const handleExportCard = async () => {
    if (!editingCharacter) return;
    setIsExporting(true);
    try {
      await exportCharacterPng(editingCharacter.id);
    } catch {
      // Handled in store
    } finally {
      setIsExporting(false);
    }
  };

  // Total prompt weight calculation
  const totalTokens = promptItems
    .filter((i) => i.enabled)
    .reduce((sum, item) => sum + countTokens(item.content), 0);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#121214] text-zinc-100">
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleAvatarFile(file);
        }}
      />
      <input
        ref={wallpaperInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              if (typeof event.target?.result === 'string') {
                setWallpaperUrl(event.target.result);
              }
            };
            reader.readAsDataURL(file);
          }
        }}
      />

      {/* Top Header Bar */}
      <header className="h-14 px-6 border-b border-[#27272a] bg-[#18181b]/80 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setEditingCharacter(null);
              setActiveView('gallery');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#222226] hover:bg-[#2c2c32] text-xs font-semibold text-zinc-300 hover:text-white transition-colors border border-[#2e2e36]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Discover Gallery</span>
          </button>
          <div className="h-4 w-px bg-zinc-700 mx-1" />
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h1 className="text-sm font-bold text-white tracking-wide">
              Character Prompt Studio
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 font-semibold">
              V1
            </span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5">
          {editingCharacter && (
            <button
              type="button"
              onClick={handleExportCard}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#222226] hover:bg-[#2c2c32] text-xs font-semibold text-zinc-300 border border-[#2e2e36] transition-colors"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Export Card</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveAndStart}
            disabled={isSaving || !name.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-semibold text-white transition-all shadow-md disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save & Start Roleplay</span>
          </button>
        </div>
      </header>

      {/* Main 2-Column Cockpit Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: Active Prompt Item Editor */}
        <section className="flex-1 flex flex-col border-r border-[#27272a] bg-[#121214] overflow-y-auto p-6 space-y-4">
          {activeItem ? (
            <>
              {/* Item Header & Controls */}
              <div className="flex items-center justify-between pb-3 border-b border-[#232326]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      Edit Prompt Item:
                      <span className="text-indigo-400 font-mono">{activeItem.name}</span>
                    </h2>
                    <p className="text-[11px] text-zinc-500">
                      Configure message role, depth placement, and lore content.
                    </p>
                  </div>
                </div>

                {promptItems.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteItem(activeItem.id, e)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Block</span>
                  </button>
                )}
              </div>

              {/* Name, Role & Position Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Item Name */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Item Name <span className="text-indigo-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={activeItem.name}
                    onChange={(e) => updateActiveItem({ name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#18181b] border border-[#27272a] focus:border-indigo-500 text-zinc-100 outline-none"
                    placeholder="e.g. Current Location, Combat Style"
                  />
                </div>

                {/* Message Role */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Message Role
                  </label>
                  <select
                    value={activeItem.role}
                    onChange={(e) =>
                      updateActiveItem({
                        role: e.target.value as 'system' | 'user' | 'assistant',
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#18181b] border border-[#27272a] focus:border-indigo-500 text-zinc-200 outline-none cursor-pointer"
                  >
                    <option value="system">System (Directive / Lore)</option>
                    <option value="user">User (Persona Framing)</option>
                    <option value="assistant">Assistant (Character Dialogue)</option>
                  </select>
                </div>

                {/* Injection Position */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Injection Position
                  </label>
                  <select
                    value={activeItem.position}
                    onChange={(e) =>
                      updateActiveItem({
                        position: e.target.value as 'relative' | 'depth',
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#18181b] border border-[#27272a] focus:border-indigo-500 text-zinc-200 outline-none cursor-pointer"
                  >
                    <option value="relative">Relative (System Header Order)</option>
                    <option value="depth">At Depth (Near Recent History)</option>
                  </select>
                </div>
              </div>

              {/* Depth Offset Input if position === 'depth' */}
              {activeItem.position === 'depth' && (
                <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-indigo-300">
                      Injection Depth Offset
                    </span>
                    <p className="text-[11px] text-zinc-400">
                      Number of turns from the bottom of recent chat history (e.g. 2 = 2 turns above bottom).
                    </p>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={activeItem.depth || 2}
                    onChange={(e) =>
                      updateActiveItem({ depth: parseInt(e.target.value, 10) || 2 })
                    }
                    className="w-20 px-3 py-1.5 text-center text-xs font-mono font-bold rounded-lg bg-[#18181b] border border-indigo-500/30 text-indigo-300 outline-none"
                  />
                </div>
              )}

              {/* Prompt Text Editor */}
              <div className="flex-1 flex flex-col space-y-2 min-h-80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300">
                    Prompt Body Content
                  </label>
                  {/* Macro Quick Insert Pills */}
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-zinc-500 font-semibold">Macros:</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateActiveItem({ content: `${activeItem.content} {{char}}` })
                      }
                      className="px-1.5 py-0.5 rounded bg-[#1f1f23] hover:bg-[#2a2a30] text-indigo-300 border border-[#2e2e36]"
                    >
                      {'{{char}}'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateActiveItem({ content: `${activeItem.content} {{user}}` })
                      }
                      className="px-1.5 py-0.5 rounded bg-[#1f1f23] hover:bg-[#2a2a30] text-indigo-300 border border-[#2e2e36]"
                    >
                      {'{{user}}'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateActiveItem({ content: `${activeItem.content} <{{this_card}}>` })
                      }
                      className="px-1.5 py-0.5 rounded bg-[#1f1f23] hover:bg-[#2a2a30] text-indigo-300 border border-[#2e2e36]"
                    >
                      {'<{{this_card}}>'}
                    </button>
                  </div>
                </div>

                <textarea
                  value={activeItem.content}
                  onChange={(e) => updateActiveItem({ content: e.target.value })}
                  className="flex-1 w-full p-4 rounded-2xl bg-[#18181b] border border-[#27272a] focus:border-indigo-500/60 text-xs font-mono text-zinc-200 placeholder-zinc-500 outline-none resize-none leading-relaxed"
                  placeholder="Enter the prompt instructions, lore, dialogue examples, or opening scene..."
                />

                {/* Editor Footer: Trim & Token Count */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-400 select-none">
                    <input
                      type="checkbox"
                      checked={activeItem.trim !== false}
                      onChange={(e) => updateActiveItem({ trim: e.target.checked })}
                      className="rounded bg-[#18181b] border-zinc-700 text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Trim trailing whitespace before generation</span>
                  </label>

                  <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
                    <span>Item Token Count:</span>
                    <span className="px-2 py-0.5 rounded-md bg-[#18181b] border border-[#27272a] text-indigo-400 font-bold">
                      {countTokens(activeItem.content)} tokens
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs">
              Select or create a prompt item from the right panel to begin editing.
            </div>
          )}
        </section>

        {/* Right Column: Character Cockpit & Prompt Items Tree */}
        <aside className="w-full lg:w-96 flex flex-col bg-[#161619] overflow-y-auto p-6 space-y-6 shrink-0">
          {/* Character Identity & Avatar Card */}
          <div className="p-4 rounded-2xl bg-[#1c1c20] border border-[#27272a] space-y-4">
            <div className="flex items-start gap-3.5">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group relative w-16 h-16 rounded-2xl overflow-hidden bg-zinc-800 border border-[#2e2e36] cursor-pointer shrink-0"
              >
                <img
                  src={avatarUrl}
                  alt={name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Upload className="w-4 h-4 text-white" />
                </div>
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Character Name"
                  className="w-full px-2.5 py-1 text-sm font-bold rounded-lg bg-[#121214] border border-[#27272a] focus:border-indigo-500 text-white outline-none"
                />
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="One-line Tagline / Hook"
                  className="w-full px-2.5 py-1 text-[11px] rounded-lg bg-[#121214] border border-[#27272a] focus:border-indigo-500 text-zinc-300 outline-none"
                />
              </div>
            </div>

            {/* Creator Attribution */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-[#27272a]">
              <span className="text-zinc-500">Created by:</span>
              <input
                type="text"
                value={creator}
                onChange={(e) => setCreator(e.target.value)}
                placeholder="Author Name"
                className="w-28 px-2 py-0.5 text-right text-xs rounded bg-[#121214] border border-[#27272a] text-zinc-300 outline-none"
              />
            </div>

            {/* Wallpaper Backdrop Upload Button */}
            <button
              type="button"
              onClick={() => wallpaperInputRef.current?.click()}
              className="w-full py-1.5 px-3 rounded-xl bg-[#121214] hover:bg-[#202024] border border-[#27272a] text-[11px] font-medium text-zinc-400 hover:text-zinc-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
              <span>{wallpaperUrl ? 'Change Custom Backdrop' : 'Upload Custom Backdrop Wallpaper'}</span>
            </button>
          </div>

          {/* Genre & Discovery Tags */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
              <Tag className="w-3.5 h-3.5 text-indigo-400" />
              <span>Genre Tags</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_GENRE_TAGS.map((genre) => {
                const active = tags.includes(genre);
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => handleToggleTag(genre)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      active
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-[#1e1e22] text-zinc-400 hover:text-zinc-200 border border-[#27272a]'
                    }`}
                  >
                    {active ? `✓ ${genre}` : `+ ${genre}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prompt Blocks List (TavernAI Prompt Manager Style) */}
          <div className="space-y-3 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Prompt Items ({promptItems.length})</span>
              </div>
              <button
                type="button"
                onClick={handleCreatePromptItem}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Item</span>
              </button>
            </div>

            {/* Prompt Items Scrollable List */}
            <div className="space-y-2 flex-1">
              {promptItems.map((item, idx) => {
                const isSelected = item.id === selectedItemId;
                const tokenCost = countTokens(item.content);

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={`group p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-indigo-950/30 border-indigo-500/60 shadow-md shadow-indigo-500/5'
                        : 'bg-[#1a1a1e] hover:bg-[#202026] border-[#27272a]'
                    }`}
                  >
                    {/* Reorder Arrows & Name */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="flex flex-col text-zinc-500 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => moveItem(idx, 'up', e)}
                          disabled={idx === 0}
                          className="hover:text-white disabled:opacity-20 p-0.5"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => moveItem(idx, 'down', e)}
                          disabled={idx === promptItems.length - 1}
                          className="hover:text-white disabled:opacity-20 p-0.5"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold text-zinc-200 truncate block">
                          {item.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {/* Role Icon Badge */}
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                              item.role === 'system'
                                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                                : item.role === 'user'
                                ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                                : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {item.role === 'system' ? (
                              <Shield className="w-2.5 h-2.5 inline mr-0.5" />
                            ) : item.role === 'user' ? (
                              <User className="w-2.5 h-2.5 inline mr-0.5" />
                            ) : (
                              <Bot className="w-2.5 h-2.5 inline mr-0.5" />
                            )}
                            {item.role.toUpperCase()}
                          </span>

                          <span className="text-[10px] text-zinc-500 font-mono">
                            {tokenCost}t
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Enable/Disable Switch */}
                    <button
                      type="button"
                      onClick={(e) => toggleItemEnabled(item.id, e)}
                      className={`w-9 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${
                        item.enabled ? 'bg-emerald-600' : 'bg-zinc-700'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          item.enabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Card Token Budget Meter */}
          <div className="p-3.5 rounded-xl bg-[#1c1c20] border border-[#27272a] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-400">Total Active Prompt Lore:</span>
              <span className="font-mono font-bold text-indigo-400">
                {totalTokens} tokens
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                style={{ width: `${Math.min(100, (totalTokens / 4096) * 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <span>0 tok</span>
              <span>4,096 tok budget baseline</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
