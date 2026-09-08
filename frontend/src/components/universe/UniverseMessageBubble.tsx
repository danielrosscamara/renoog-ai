import React, { useState } from 'react';
import {
  Compass,
  Pin,
  Copy,
  Check,
  PenLine,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import type { UniverseMessage } from '../../types/universe';
import { useUniverseStore } from '../../stores/useUniverseStore';

// ─── Sanitizer ───────────────────────────────────────────────────────────────
/**
 * Sanitizes roleplay dialogue text by stripping any internal reasoning tags
 * (<think>...</think> or orphaned </think>) so chat bubbles remain 100% clean story prose.
 */
const sanitizeRoleplayText = (raw: string): string => {
  if (!raw) return '';
  let cleaned = raw;
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');
  if (cleaned.includes('</think>')) {
    const parts = cleaned.split('</think>');
    cleaned = parts[parts.length - 1];
  }
  if (cleaned.includes('<think>')) {
    const parts = cleaned.split('<think>');
    cleaned = parts[0];
  }
  return cleaned.trim();
};

// ─── Roleplay Prose Renderer ─────────────────────────────────────────────────
/**
 * Renders *action text* as muted italics and regular text as crisp dialogue.
 * Renoog AI visual novel typography standard.
 */
const RoleplayProse: React.FC<{ content: string; isNarrator?: boolean }> = ({
  content,
  isNarrator,
}) => {
  const segments = content.split(/(\*[^*]+\*)/g);

  return (
    <div
      className={`text-sm leading-relaxed whitespace-pre-wrap ${
        isNarrator ? 'text-amber-100/90 font-serif italic' : ''
      }`}
    >
      {segments.map((segment, idx) => {
        // Asterisk *action* block
        if (segment.startsWith('*') && segment.endsWith('*') && segment.length > 2) {
          const actionText = segment.slice(1, -1);
          return (
            <span key={idx} className="italic text-zinc-400">
              {actionText}
            </span>
          );
        }

        // Spoken dialogue / narrative text
        if (segment.trim()) {
          return (
            <span
              key={idx}
              className={isNarrator ? 'text-amber-100/90 font-serif' : 'text-zinc-100 font-normal'}
            >
              {segment}
            </span>
          );
        }

        return <span key={idx}>{segment}</span>;
      })}
    </div>
  );
};

// ─── Hover Action Bar ────────────────────────────────────────────────────────
interface MessageActionBarProps {
  senderType: 'narrator' | 'character' | 'user';
  isPinned?: boolean;
  onEdit: () => void;
  onPin?: () => void;
  onCopy: () => void;
  onDelete: () => void;
}

const MessageActionBar: React.FC<MessageActionBarProps> = ({
  senderType,
  isPinned,
  onEdit,
  onPin,
  onCopy,
  onDelete,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[#27272a]/95 border border-[#3f3f46]/80 shadow-xl backdrop-blur-sm">
      {senderType === 'character' && onPin && (
        <button
          onClick={onPin}
          className={`p-1.5 rounded-md transition-colors ${
            isPinned
              ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
              : 'text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10'
          }`}
          title={isPinned ? 'Unpin from memory' : 'Pin to memory anchor'}
          aria-label="Pin message"
        >
          <Pin className="w-3.5 h-3.5" />
        </button>
      )}
      <button
        onClick={onEdit}
        className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-[#3f3f46] transition-colors"
        title="Edit message (Ctrl+Enter to save)"
        aria-label="Edit message"
      >
        <PenLine className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-md text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
        title="Copy to clipboard"
        aria-label="Copy message"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
      <button
        onClick={onDelete}
        className="p-1.5 rounded-md text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        title="Delete message"
        aria-label="Delete message"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

// ─── Universe Message Bubble Component ───────────────────────────────────────
export interface UniverseMessageBubbleProps {
  message: UniverseMessage;
  locationId: string;
  isStreaming?: boolean;
  onPin?: (messageId: string) => void;
  isPinned?: boolean;
}

export const UniverseMessageBubble: React.FC<UniverseMessageBubbleProps> = ({
  message,
  locationId,
  isStreaming = false,
  onPin,
  isPinned = false,
}) => {
  const [hovered, setHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const editUniverseMessage = useUniverseStore((state) => state.editUniverseMessage);
  const deleteUniverseMessage = useUniverseStore((state) => state.deleteUniverseMessage);

  const isNarrator = message.sender_type === 'narrator';
  const isUser = message.sender_type === 'user';
  const isCharacter = message.sender_type === 'character';

  const rawContent = message.content || message.swipes[message.active_swipe_index] || '';
  const activeContent = sanitizeRoleplayText(rawContent);
  const [editText, setEditText] = useState(activeContent);

  const handleCopy = () => {
    navigator.clipboard.writeText(activeContent);
  };

  const handleSaveEdit = () => {
    if (editText.trim() !== '') {
      editUniverseMessage(locationId, message.id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(activeContent);
    setIsEditing(false);
  };

  return (
    <div
      className={`group relative flex gap-3 py-3.5 px-4 transition-colors ${
        isUser ? 'flex-row-reverse' : ''
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 1. Avatar Ring */}
      {isNarrator ? (
        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-500/10 border border-amber-500/25 text-amber-400 shadow-sm shrink-0 mt-0.5">
          <Compass className="w-5 h-5 animate-pulse-slow" />
        </div>
      ) : isCharacter ? (
        <div className="relative shrink-0 mt-0.5">
          <img
            src={
              message.sender_avatar ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
            }
            alt={message.sender_name}
            className="w-10 h-10 rounded-full object-cover ring-1 ring-violet-500/30 shadow-md"
          />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[#121214]" />
        </div>
      ) : (
        <div className="shrink-0 mt-0.5">
          <img
            src={
              message.sender_avatar ||
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
            }
            alt={message.sender_name}
            className="w-10 h-10 rounded-full object-cover ring-1 ring-emerald-500/40 shadow-md"
          />
        </div>
      )}

      {/* 2. Message Content Column */}
      <div className={`flex-1 min-w-0 ${isUser ? 'flex flex-col items-end' : ''}`}>
        {/* Header (Identity + Role Pills) */}
        <div className={`flex items-center gap-2 mb-1.5 ${isUser ? 'flex-row-reverse' : ''}`}>
          <span className="font-semibold text-sm text-zinc-200">{message.sender_name}</span>

          {isNarrator ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              AMBIANCE
            </span>
          ) : isCharacter ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium text-violet-300 bg-violet-500/10 border border-violet-500/20">
              COMPANION
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/20">
              YOU
            </span>
          )}

          {isPinned && isCharacter && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium flex items-center gap-1">
              <Pin className="w-2.5 h-2.5" />
              Pinned
            </span>
          )}
        </div>

        {/* Prose Body or In-place Editor */}
        {isEditing ? (
          <div className="w-full max-w-2xl bg-[#18181b] border border-violet-500/40 rounded-2xl p-3 shadow-xl mt-1">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSaveEdit();
                } else if (e.key === 'Escape') {
                  handleCancelEdit();
                }
              }}
              rows={4}
              className="w-full bg-[#121214] text-zinc-100 p-2.5 rounded-xl border border-zinc-700/60 focus:border-violet-500 focus:outline-none text-sm font-sans resize-y leading-relaxed"
              placeholder="Edit message..."
              autoFocus
            />
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800">
              <span className="text-[11px] text-zinc-500">
                Press{' '}
                <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-400 text-[10px]">
                  Ctrl+Enter
                </kbd>{' '}
                to save, <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-400 text-[10px]">Esc</kbd> to cancel
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-2.5 py-1 text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-3 py-1 text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`max-w-[90%] transition-colors ${
              isUser
                ? 'rounded-2xl p-4 bg-[#1e1e22] border border-[#2a2a2e] shadow-sm'
                : isNarrator
                ? 'rounded-2xl p-3.5 bg-amber-500/3 border border-amber-500/10 shadow-xs'
                : 'rounded-2xl p-2 bg-transparent'
            }`}
          >
            <RoleplayProse content={activeContent} isNarrator={isNarrator} />

            {/* Live Streaming Pulse Cursor */}
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 align-middle bg-violet-400 animate-pulse rounded-xs" />
            )}
          </div>
        )}
      </div>

      {/* Hover Floating Action Bar */}
      {hovered && !isEditing && (
        <div className={`absolute top-2 ${isUser ? 'left-4' : 'right-4'} z-10 animate-fade-in`}>
          <MessageActionBar
            senderType={message.sender_type}
            isPinned={isPinned}
            onEdit={() => {
              setEditText(activeContent);
              setIsEditing(true);
            }}
            onPin={() => onPin?.(message.id)}
            onCopy={handleCopy}
            onDelete={() => deleteUniverseMessage(locationId, message.id)}
          />
        </div>
      )}
    </div>
  );
};

// ─── Universe Turn Divider (Atomic Turn Scenario Bar) ────────────────────────
export interface UniverseTurnDividerProps {
  turnNumber: number;
  locationId: string;
  isStreaming?: boolean;
}

export const UniverseTurnDivider: React.FC<UniverseTurnDividerProps> = ({
  turnNumber,
  locationId,
  isStreaming = false,
}) => {
  const setTurnSwipeIndex = useUniverseStore((state) => state.setTurnSwipeIndex);
  const rerollEntireTurn = useUniverseStore((state) => state.rerollEntireTurn);
  const getTurnSwipeInfo = useUniverseStore((state) => state.getTurnSwipeInfo);

  const { activeIndex, totalSwipes } = getTurnSwipeInfo(locationId, turnNumber);

  const handlePrevScenario = () => {
    if (activeIndex > 0 && !isStreaming) {
      setTurnSwipeIndex(locationId, turnNumber, activeIndex - 1);
    }
  };

  const handleNextScenario = () => {
    if (activeIndex < totalSwipes - 1 && !isStreaming) {
      setTurnSwipeIndex(locationId, turnNumber, activeIndex + 1);
    }
  };

  return (
    <div className="relative my-4 px-4">
      <div className="flex items-center gap-3 py-1.5 px-3 rounded-xl bg-[#18181b]/80 border border-zinc-800/80 shadow-sm backdrop-blur-xs">
        {/* Turn Indicator */}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
          <span className="uppercase tracking-wider text-[11px]">Turn {turnNumber}</span>
        </div>

        <div className="h-3 w-px bg-zinc-800" />

        {/* Macro Whole-Turn Reroll CTA */}
        <button
          onClick={() => rerollEntireTurn(locationId, turnNumber)}
          disabled={isStreaming}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-300 hover:text-amber-400 hover:bg-amber-500/10 disabled:opacity-40 transition-colors"
          title="Regenerate the entire turn (Narrator ambiance + Companions) in lockstep"
          aria-label="Regenerate whole turn"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isStreaming ? 'animate-spin text-amber-400' : ''}`}
          />
          <span>Regenerate Whole Turn</span>
        </button>

        <div className="flex-1" />

        {/* Scenario Switcher (if multi-swipe exists) */}
        {totalSwipes > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevScenario}
              disabled={activeIndex === 0 || isStreaming}
              className="p-1 rounded text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:text-zinc-400 disabled:hover:bg-transparent transition-colors"
              title="Previous turn scenario"
              aria-label="Previous scenario"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-amber-400 tabular-nums min-w-24 text-center">
              Scenario {activeIndex + 1} of {totalSwipes}
            </span>
            <button
              onClick={handleNextScenario}
              disabled={activeIndex === totalSwipes - 1 || isStreaming}
              className="p-1 rounded text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:text-zinc-400 disabled:hover:bg-transparent transition-colors"
              title="Next turn scenario"
              aria-label="Next scenario"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
