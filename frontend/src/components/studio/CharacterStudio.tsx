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
  Layers,
  Image as ImageIcon,
  Code2,
  FileText,
  HelpCircle,
  ChevronDown,
  Wand2,
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

interface SemanticPreset {
  id: string;
  name: string;
  tagName: string;
  icon: string;
  role: 'system' | 'user' | 'assistant';
  defaultContent: string;
  guidance: string;
}

const SEMANTIC_PRESETS: SemanticPreset[] = [
  {
    id: 'speech_style',
    name: 'Speech Style & Tone',
    tagName: 'speech_style',
    icon: '🗣️',
    role: 'system',
    defaultContent: 'Speaks with sharp, dry wit and concise phrasing. Uses specialized vocabulary and maintains a guarded, composed cadence.',
    guidance: 'Define the character\'s vocabulary, slang, accents, and how their voice sounds during dialogue.',
  },
  {
    id: 'personality',
    name: 'Core Personality',
    tagName: 'personality',
    icon: '🎭',
    role: 'system',
    defaultContent: 'Perceptive, calculating, and fiercely independent. Reluctant to trust strangers, but deeply loyal once a bond is formed.',
    guidance: 'Describe emotional temperament, moral compass, psychological motivations, and reaction triggers.',
  },
  {
    id: 'scenario',
    name: 'World Lore & Scenario',
    tagName: 'scenario',
    icon: '🗺️',
    role: 'system',
    defaultContent: '{{char}} and {{user}} meet in an evocative setting where a new situation requires immediate cooperation or negotiation.',
    guidance: 'Set the current scene, location, social stakes, and environmental atmosphere.',
  },
  {
    id: 'combat_abilities',
    name: 'Abilities & Combat Style',
    tagName: 'combat_abilities',
    icon: '⚔️',
    role: 'system',
    defaultContent: 'Skilled in close-quarters agility, tactical observation, and swift evasion. Never hesitates during physical danger.',
    guidance: 'Define weapons, magical powers, martial arts, or unique superhuman skills.',
  },
  {
    id: 'hidden_lore',
    name: 'Hidden Secrets & Private Lore',
    tagName: 'hidden_lore',
    icon: '🤫',
    role: 'system',
    defaultContent: 'Carries a hidden artifact or concealed backstory that they will not reveal to {{user}} unless complete trust is earned.',
    guidance: 'Private information the character knows internally but keeps secret from the player.',
  },
  {
    id: 'example_dialogue',
    name: 'Few-Shot Sample Dialogue',
    tagName: 'example_dialogue',
    icon: '💬',
    role: 'system',
    defaultContent: '<START>\n{{user}}: "Are you sure about this?"\n{{char}}: *adjusts coat collar, a faint smirk forming* "Not at all. Which makes it twice as exciting."',
    guidance: 'Concrete input/output demonstrations teaching the model formatting (*actions in asterisks*, "quotes for dialogue").',
  },
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
  const [charId] = useState<string>(
    () => editingCharacter?.id || 'char_new_custom'
  );
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

  // View Mode: Visual Editor vs Live XML Preview
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  const [isPresetDropdownOpen, setIsPresetDropdownOpen] = useState<boolean>(false);

  // Initial Prompt Items Builder with XML Semantic Presets
  const [promptItems, setPromptItems] = useState<PromptItem[]>(() => {
    if (editingCharacter?.prompt_items && editingCharacter.prompt_items.length > 0) {
      return editingCharacter.prompt_items;
    }
    return [
      {
        id: 'item_personality',
        name: '🎭 Core Personality',
        role: 'system',
        position: 'relative',
        content: editingCharacter?.personality || editingCharacter?.description || 'Perceptive, calculating, and fiercely independent. Reluctant to trust strangers, but deeply loyal once a bond is formed.',
        enabled: true,
        trim: true,
        order: 0,
      },
      {
        id: 'item_speech_style',
        name: '🗣️ Speech Style & Tone',
        role: 'system',
        position: 'relative',
        content: 'Speaks with sharp, dry wit and concise phrasing. Never raises her voice; uses subtle humor when deflecting personal questions.',
        enabled: true,
        trim: true,
        order: 1,
      },
      {
        id: 'item_scenario',
        name: '🗺️ World Lore & Scenario',
        role: 'system',
        position: 'relative',
        content: editingCharacter?.scenario || '{{char}} and {{user}} meet in an evocative setting where their story begins.',
        enabled: true,
        trim: true,
        order: 2,
      },
      {
        id: 'item_dialogue',
        name: '💬 Sample Dialogues',
        role: 'system',
        position: 'relative',
        content:
          editingCharacter?.mes_example ||
          '<START>\n{{user}}: "Greetings, who are you?"\n{{char}}: *glances over with a thoughtful smile* "I could ask you the same question."',
        enabled: true,
        trim: true,
        order: 3,
      },
      {
        id: 'item_greeting',
        name: '✨ Opening Greeting',
        role: 'assistant',
        position: 'relative',
        content:
          editingCharacter?.first_mes ||
          '*looks up as you enter, acknowledging your presence with a subtle nod* "Welcome. What brings you here today?"',
        enabled: true,
        trim: true,
        order: 4,
      },
    ];
  });

  const [selectedItemId, setSelectedItemId] = useState<string>('item_personality');
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

  // Add a specific Semantic Preset
  const handleAddSemanticPreset = (preset: SemanticPreset) => {
    const nextIndex = promptItems.length + 1;
    const newItem: PromptItem = {
      id: `item_${preset.tagName}_${nextIndex}`,
      name: `${preset.icon} ${preset.name}`,
      role: preset.role,
      position: 'relative',
      content: preset.defaultContent,
      enabled: true,
      trim: true,
      order: promptItems.length,
    };
    setPromptItems((items) => [...items, newItem]);
    setSelectedItemId(newItem.id);
    setIsPresetDropdownOpen(false);
  };

  // Add a custom prompt block
  const handleCreateCustomItem = () => {
    const nextIndex = promptItems.length + 1;
    const newItem: PromptItem = {
      id: `item_custom_${nextIndex}`,
      name: `⚙️ Custom Block ${nextIndex}`,
      role: 'system',
      position: 'relative',
      content: 'Enter custom instructions or world details here...',
      enabled: true,
      trim: true,
      order: promptItems.length,
    };
    setPromptItems((items) => [...items, newItem]);
    setSelectedItemId(newItem.id);
    setIsPresetDropdownOpen(false);
  };

  // Insert macro or syntax at current position
  const handleInsertSyntax = (snippet: string) => {
    if (!activeItem) return;
    updateActiveItem({
      content: activeItem.content ? `${activeItem.content} ${snippet}` : snippet,
    });
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

    const personalityItem = promptItems.find((i) => i.id.includes('personality'))?.content || '';
    const scenarioItem = promptItems.find((i) => i.id.includes('scenario'))?.content || '';
    const dialogueItem = promptItems.find((i) => i.id.includes('dialogue'))?.content || '';
    const greetingItem = promptItems.find((i) => i.id.includes('greeting'))?.content || '';

    const characterPayload: Partial<Character> = {
      id: charId,
      name: name.trim() || 'Unnamed Character',
      tagline: tagline.trim() || 'AI Companion',
      description: personalityItem,
      personality: personalityItem,
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

  // Generate Live Compiled XML string for preview
  const generateLiveXmlPreview = (): string => {
    const enabledItems = promptItems.filter((i) => i.enabled);
    const parts = [`<character_profile name="${name.trim() || 'Character'}">`];
    
    if (tagline.trim()) {
      parts.push(`  <tagline>${tagline.trim()}</tagline>`);
    }

    enabledItems.forEach((item) => {
      const cleanTag = item.id.replace('item_', '').split('_')[0] || 'custom_lore';
      if (item.content.trim()) {
        parts.push(`  <${cleanTag}>\n    ${item.content.trim()}\n  </${cleanTag}>`);
      }
    });

    parts.push('</character_profile>');
    return parts.join('\n');
  };

  // Total prompt weight calculation
  const totalTokens = promptItems
    .filter((i) => i.enabled)
    .reduce((sum, item) => sum + countTokens(item.content), 0);

  // Active item guidance tip
  const activePreset = SEMANTIC_PRESETS.find((p) => activeItem?.id.includes(p.tagName));

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
              XML Engine
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
          {/* Visual Mode Selector: Edit vs XML Preview */}
          <div className="flex items-center justify-between pb-3 border-b border-[#232326]">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#1a1a1e] border border-[#27272a]">
              <button
                type="button"
                onClick={() => setViewMode('editor')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'editor'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Prompt Block Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'preview'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Live XML Preview</span>
              </button>
            </div>

            {viewMode === 'editor' && promptItems.length > 1 && activeItem && (
              <button
                type="button"
                onClick={(e) => handleDeleteItem(activeItem.id, e)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Block</span>
              </button>
            )}
          </div>

          {viewMode === 'preview' ? (
            /* Live XML Compiled Preview */
            <div className="flex-1 flex flex-col space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1.5 font-semibold text-zinc-300">
                  <Wand2 className="w-4 h-4 text-indigo-400" />
                  Live Compiled Character Profile XML:
                </span>
                <span className="font-mono text-indigo-400 font-bold">
                  {countTokens(generateLiveXmlPreview())} tokens
                </span>
              </div>
              <pre className="flex-1 w-full p-4 rounded-2xl bg-[#16161a] border border-[#27272a] text-xs font-mono text-emerald-300 overflow-auto leading-relaxed select-text">
                {generateLiveXmlPreview()}
              </pre>
            </div>
          ) : activeItem ? (
            <>
              {/* Item Header & Semantic Tag Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      Active Block:
                      <span className="text-indigo-400 font-mono">{activeItem.name}</span>
                    </h2>
                    <p className="text-[11px] text-zinc-500">
                      Compiles to semantic tag: <code className="text-indigo-300 font-mono">{`<${activeItem.id.replace('item_', '').split('_')[0] || 'lore'}>`}</code>
                    </p>
                  </div>
                </div>
              </div>

              {/* Name, Role & Position Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Item Name */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Block Title <span className="text-indigo-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={activeItem.name}
                    onChange={(e) => updateActiveItem({ name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#18181b] border border-[#27272a] focus:border-indigo-500 text-zinc-100 outline-none"
                    placeholder="e.g. Speech Style, Combat Rules"
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
                    <option value="relative">Relative (System Header)</option>
                    <option value="depth">At Depth (Near Recent History)</option>
                  </select>
                </div>
              </div>

              {/* Guidance Tip Box */}
              {activePreset && (
                <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/15 flex items-start gap-2.5">
                  <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    <strong className="text-white">Guidance: </strong>
                    {activePreset.guidance}
                  </p>
                </div>
              )}

              {/* Prompt Text Editor */}
              <div className="flex-1 flex flex-col space-y-2 min-h-80">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-zinc-300">
                    Prompt Body Content
                  </label>

                  {/* Interactive Macro & Syntax Toolbar */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="text-zinc-500 font-semibold">Quick Syntax:</span>
                    <button
                      type="button"
                      onClick={() => handleInsertSyntax('{{char}}')}
                      className="px-1.5 py-0.5 rounded bg-[#1f1f23] hover:bg-[#2a2a30] text-indigo-300 border border-[#2e2e36]"
                    >
                      {'{{char}}'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertSyntax('{{user}}')}
                      className="px-1.5 py-0.5 rounded bg-[#1f1f23] hover:bg-[#2a2a30] text-indigo-300 border border-[#2e2e36]"
                    >
                      {'{{user}}'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertSyntax('*shifts weight, looking over*')}
                      className="px-1.5 py-0.5 rounded bg-[#1f1f23] hover:bg-[#2a2a30] text-emerald-300 border border-[#2e2e36]"
                    >
                      *Action*
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertSyntax('"Spoken dialogue."')}
                      className="px-1.5 py-0.5 rounded bg-[#1f1f23] hover:bg-[#2a2a30] text-amber-300 border border-[#2e2e36]"
                    >
                      "Dialogue"
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertSyntax('<START>\n{{user}}: "Hello"\n{{char}}: *smiles* "Hi"')}
                      className="px-1.5 py-0.5 rounded bg-[#1f1f23] hover:bg-[#2a2a30] text-purple-300 border border-[#2e2e36]"
                    >
                      {'<START>'}
                    </button>
                  </div>
                </div>

                <textarea
                  value={activeItem.content}
                  onChange={(e) => updateActiveItem({ content: e.target.value })}
                  className="flex-1 w-full p-4 rounded-2xl bg-[#18181b] border border-[#27272a] focus:border-indigo-500/60 text-xs font-mono text-zinc-200 placeholder-zinc-500 outline-none resize-none leading-relaxed"
                  placeholder="Enter the prompt instructions, speech style, lore, or few-shot examples..."
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
                    <span>Block Token Weight:</span>
                    <span className="px-2 py-0.5 rounded-md bg-[#18181b] border border-[#27272a] text-indigo-400 font-bold">
                      {countTokens(activeItem.content)} tokens
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs">
              Select or create a prompt block from the right panel to begin editing.
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
            <div className="flex items-center justify-between relative">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Prompt Blocks ({promptItems.length})</span>
              </div>

              {/* Add Block Preset Dropdown Trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsPresetDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Block</span>
                  <ChevronDown className="w-3 h-3 ml-0.5" />
                </button>

                {/* Semantic Tag Presets Dropdown Menu */}
                {isPresetDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 p-1.5 rounded-2xl bg-[#1c1c20] border border-[#2e2e36] shadow-xl z-30 space-y-1">
                    <div className="px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      Semantic XML Presets
                    </div>
                    {SEMANTIC_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleAddSemanticPreset(preset)}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-[#282830] transition-colors"
                      >
                        <span className="text-sm">{preset.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-zinc-100 truncate">
                            {preset.name}
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono">
                            {`<${preset.tagName}>`}
                          </div>
                        </div>
                      </button>
                    ))}
                    <div className="border-t border-[#27272a] my-1" />
                    <button
                      type="button"
                      onClick={handleCreateCustomItem}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left hover:bg-[#282830] text-xs font-semibold text-indigo-300 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Custom Blank Block</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Prompt Items Scrollable List */}
            <div className="space-y-2 flex-1">
              {promptItems.map((item) => {
                const isSelected = item.id === selectedItemId;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedItemId(item.id);
                      setViewMode('editor');
                    }}
                    className={`group p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-indigo-950/30 border-indigo-500/60 shadow-md shadow-indigo-500/5'
                        : 'bg-[#1a1a1e] hover:bg-[#202026] border-[#27272a]'
                    }`}
                  >
                    {/* Item Title */}
                    <span className="text-xs font-semibold text-zinc-200 truncate flex-1">
                      {item.name}
                    </span>

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
              <span className="font-semibold text-zinc-400">Total Active Lore Weight:</span>
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
