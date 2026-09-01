import React from 'react';
import {
  Brain,
  Pin,
  Sparkles,
  Compass,
  X,
  Copy,
  Check,
  Clock,
  Gauge,
  User,
  Layers,
  ChevronRight,
  Database,
} from 'lucide-react';
import { useChatStore } from '../../stores/useChatStore';
import type { Character, Persona, MessageTurn } from '../../types';

interface RightSidebarProps {
  character?: Character;
  persona?: Persona;
  turns: MessageTurn[];
  onOpenInspector: () => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  character,
  persona,
  turns,
  onOpenInspector,
}) => {
  const {
    activeChatId,
    isRightSidebarOpen,
    toggleRightSidebar,
    activeRightTab,
    setActiveRightTab,
    latestThoughtTrace,
    togglePinTurn,
  } = useChatStore();

  const [copied, setCopied] = React.useState(false);

  if (!isRightSidebarOpen || !activeChatId) return null;

  const thoughtData = latestThoughtTrace[activeChatId] || {
    thought: '',
    isThinking: false,
  };

  const pinnedTurns = turns.filter((t) => t.is_pinned);

  const handleCopyThought = () => {
    if (!thoughtData.thought) return;
    navigator.clipboard.writeText(thoughtData.thought);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="w-80 md:w-96 flex flex-col h-full bg-[#121214] border-l border-[#27272a] shrink-0 z-20 animate-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#27272a] bg-[#18181b]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Brain className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-white tracking-wide">
            Companion HUD & Diagnostics
          </span>
        </div>
        <button
          type="button"
          onClick={toggleRightSidebar}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 4-Tab Navigation Buttons */}
      <div className="grid grid-cols-4 gap-1 p-2 bg-[#141416] border-b border-[#232326]">
        <button
          type="button"
          onClick={() => setActiveRightTab('thoughts')}
          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all ${
            activeRightTab === 'thoughts'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f23]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Thoughts</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveRightTab('memory')}
          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all ${
            activeRightTab === 'memory'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f23]'
          }`}
        >
          <Pin className="w-3.5 h-3.5" />
          <span>Memory</span>
          {pinnedTurns.length > 0 && (
            <span className="px-1 py-0.2 rounded-full text-[9px] bg-black/40 text-amber-200 font-mono">
              {pinnedTurns.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveRightTab('sheet')}
          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all ${
            activeRightTab === 'sheet'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f23]'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Sheet</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveRightTab('world')}
          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all ${
            activeRightTab === 'world'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f23]'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>World</span>
        </button>
      </div>

      {/* Main Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: AI Thoughts & Reasoning */}
        {activeRightTab === 'thoughts' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            {/* Live Speedometer HUD */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-[#18181b] border border-[#27272a] flex flex-col">
                <div className="flex items-center gap-1.5 text-zinc-400 text-[10px]">
                  <Gauge className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Gen Speed</span>
                </div>
                <span className="text-sm font-bold font-mono text-zinc-100 mt-1">
                  {thoughtData.speedTokS ? `${thoughtData.speedTokS} tok/s` : '-- tok/s'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#18181b] border border-[#27272a] flex flex-col">
                <div className="flex items-center gap-1.5 text-zinc-400 text-[10px]">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>1st Token Latency</span>
                </div>
                <span className="text-sm font-bold font-mono text-zinc-100 mt-1">
                  {thoughtData.latencyMs ? `${thoughtData.latencyMs} ms` : '-- ms'}
                </span>
              </div>
            </div>

            {/* Live Thought Trace Container */}
            <div className="p-3.5 rounded-2xl bg-[#18181b] border border-[#27272a] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${thoughtData.isThinking ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                  <span className="text-xs font-bold text-zinc-200">
                    {thoughtData.isThinking ? 'AI Reasoning in Progress...' : 'Latest Reasoning Trace'}
                  </span>
                </div>
                {thoughtData.thought && (
                  <button
                    type="button"
                    onClick={handleCopyThought}
                    className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-[10px] flex items-center gap-1"
                    title="Copy reasoning"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>

              <div className="p-3 rounded-xl bg-[#121214] border border-[#232326] text-xs font-mono text-zinc-300 leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap">
                {thoughtData.thought ? (
                  thoughtData.thought
                ) : (
                  <div className="text-zinc-500 text-center py-6">
                    <Brain className="w-6 h-6 mx-auto mb-2 opacity-40" />
                    <span>Send a message to see the model&apos;s internal chain of thought here in real time.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Pinned Memories */}
        {activeRightTab === 'memory' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Pinned Turns Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#232326]">
                <span className="text-xs font-bold text-zinc-200">
                  Layer 4: Permanent Memories ({pinnedTurns.length})
                </span>
                <span className="text-[10px] text-zinc-500">Zero-eviction</span>
              </div>

              {pinnedTurns.length === 0 ? (
                <div className="text-center py-6 text-zinc-500 text-xs">
                  <Pin className="w-6 h-6 mx-auto mb-2 opacity-40 text-amber-400" />
                  <p>No turns pinned in this chat.</p>
                  <p className="text-[11px] text-zinc-600 mt-1">
                    Click the 📌 icon on any message to permanently lock it into the model&apos;s memory!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pinnedTurns.map((turn) => {
                    const roleLabel = turn.role === 'assistant' ? character?.name || 'Character' : persona?.name || 'User';
                    const text = turn.swipes[turn.active_index] || '';
                    return (
                      <div
                        key={turn.id}
                        className="p-3 rounded-xl bg-[#18181b] border border-amber-500/30 space-y-1.5 text-xs group"
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold text-amber-300">
                          <span>{roleLabel}</span>
                          <button
                            type="button"
                            onClick={() => togglePinTurn(activeChatId, turn.id)}
                            className="text-zinc-500 hover:text-red-400 text-[10px]"
                            title="Unpin memory"
                          >
                            Unpin
                          </button>
                        </div>
                        <p className="text-zinc-300 line-clamp-3 leading-relaxed font-sans">{text}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Verbatim Recall Engine Status */}
            <div className="p-3 rounded-2xl bg-[#18181b] border border-emerald-500/25 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <Database className="w-4 h-4" />
                  <span>Verbatim Recall Engine</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-semibold">
                  Local BM25
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                100% of historical turns are preserved verbatim in SQLite. When you reference a past event from 50+ turns ago, the exact original messages are dynamically recalled into context in &lt;5ms.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: Character Quick Sheet & Persona */}
        {activeRightTab === 'sheet' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {character && (
              <div className="p-3.5 rounded-2xl bg-[#18181b] border border-[#27272a] space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={character.avatar_url}
                    alt={character.name}
                    className="w-12 h-12 rounded-xl object-cover border border-zinc-700"
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">{character.name}</h3>
                    <p className="text-[11px] text-zinc-400 truncate">{character.tagline || 'Companion'}</p>
                  </div>
                </div>
                {character.personality && (
                  <div className="p-2.5 rounded-xl bg-[#121214] border border-[#232326] text-xs text-zinc-300 leading-relaxed">
                    <span className="text-[10px] font-bold text-purple-400 uppercase block mb-1">Personality</span>
                    {character.personality}
                  </div>
                )}
              </div>
            )}

            {persona && (
              <div className="p-3.5 rounded-2xl bg-[#18181b] border border-[#27272a] space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <User className="w-4 h-4" />
                  <span>Active User Persona</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#121214] border border-[#232326] text-xs text-zinc-300 leading-relaxed">
                  <span className="font-bold text-zinc-200 block">{persona.name}</span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{persona.description || 'Adventurer'}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Scene Director & World Notes */}
        {activeRightTab === 'world' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            <div className="p-3.5 rounded-2xl bg-[#18181b] border border-[#27272a] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <Compass className="w-4 h-4" />
                <span>Active Scene Scenario</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#121214] border border-[#232326] text-xs text-zinc-300 leading-relaxed">
                {character?.scenario || 'Default room / starting scenario.'}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#18181b] border border-[#27272a] space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-200">
                <span>Phase 5: World Info (Lorebook)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                  Upcoming
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                World Info keyword scanner will automatically inject matching lore entries into Layer 2 and Layer 9 here.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Diagnostics Quick-Action Bar */}
      <div className="p-3 border-t border-[#27272a] bg-[#141416]">
        <button
          type="button"
          onClick={onOpenInspector}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            <span>Open Full Prompt Inspector</span>
          </div>
          <ChevronRight className="w-4 h-4 opacity-70" />
        </button>
      </div>
    </aside>
  );
};
