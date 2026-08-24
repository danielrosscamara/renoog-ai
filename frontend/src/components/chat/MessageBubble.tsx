import React, { useState } from 'react';
import {
  PenLine,
  Pin,
  Copy,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';
import type { MessageTurn, Character, Persona } from '../../types';

// ─── Roleplay Prose Renderer ─────────────────────────────────────────────────
// Renders *action text* as muted italics and regular text as crisp dialogue.
// Inspired by TavernAI 2's screen1.png typography hierarchy.
const RoleplayProse: React.FC<{ content: string }> = ({ content }) => {
  // Split content by *action blocks* while preserving the delimiters
  const segments = content.split(/(\*[^*]+\*)/g);

  return (
    <div className="text-sm leading-relaxed whitespace-pre-wrap">
      {segments.map((segment, idx) => {
        // Check if this segment is an *action* block
        if (segment.startsWith('*') && segment.endsWith('*') && segment.length > 2) {
          const actionText = segment.slice(1, -1);
          return (
            <span key={idx} className="italic text-zinc-400">
              {actionText}
            </span>
          );
        }

        // Regular spoken dialogue / narrative text
        if (segment.trim()) {
          return (
            <span key={idx} className="text-zinc-100">
              {segment}
            </span>
          );
        }

        // Whitespace-only segments
        return <span key={idx}>{segment}</span>;
      })}
    </div>
  );
};

// ─── Swipe Controls ──────────────────────────────────────────────────────────
// Gold-accented ◀ 1/3 ▶ candidate switcher (inspired by screen1.png swipe bar)
interface SwipeControlsProps {
  activeIndex: number;
  totalSwipes: number;
  onPrev: () => void;
  onNext: () => void;
  onReroll: () => void;
}

const SwipeControls: React.FC<SwipeControlsProps> = ({
  activeIndex,
  totalSwipes,
  onPrev,
  onNext,
  onReroll,
}) => {
  if (totalSwipes <= 1 && !onReroll) return null;

  return (
    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#27272a]">
      <button
        onClick={onReroll}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
        aria-label="Reroll message"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Reroll
      </button>

      <div className="flex-1" />

      {totalSwipes > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={onPrev}
            disabled={activeIndex === 0}
            className="p-1 rounded-md text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 disabled:opacity-30 disabled:hover:text-zinc-400 disabled:hover:bg-transparent transition-colors"
            aria-label="Previous swipe"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-amber-400 tabular-nums min-w-12 text-center">
            {activeIndex + 1} / {totalSwipes}
          </span>
          <button
            onClick={onNext}
            disabled={activeIndex === totalSwipes - 1}
            className="p-1 rounded-md text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 disabled:opacity-30 disabled:hover:text-zinc-400 disabled:hover:bg-transparent transition-colors"
            aria-label="Next swipe"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Message Action Bar ──────────────────────────────────────────────────────
// Appears on hover (inspired by screen1.png: [+] [···] [✂️] [📋] [✏️])
interface ActionBarProps {
  role: 'user' | 'assistant';
  onEdit: () => void;
  onPin: () => void;
  onCopy: () => void;
  onDelete: () => void;
}

const ActionBar: React.FC<ActionBarProps> = ({ onEdit, onPin, onCopy, onDelete }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[#27272a] border border-[#3f3f46] shadow-lg">
      <button
        onClick={onEdit}
        className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-[#3f3f46] transition-colors"
        aria-label="Edit message"
      >
        <PenLine className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={onPin}
        className="p-1.5 rounded-md text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
        aria-label="Pin message"
      >
        <Pin className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-md text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
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
        aria-label="Delete message"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

// ─── Main MessageBubble Component ────────────────────────────────────────────
export interface MessageBubbleProps {
  turn: MessageTurn;
  character?: Character;
  persona?: Persona;
  modelName?: string;
  onSwipeChange: (turnId: string, newIndex: number) => void;
  onReroll: (turnId: string) => void;
}

const formatModelBadge = (turnModel?: string, fallbackModel?: string) => {
  if (turnModel) {
    return turnModel.split('/')[1] || turnModel;
  }
  if (fallbackModel) {
    return fallbackModel.split('/')[1] || fallbackModel;
  }
  return 'Character Card';
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  turn,
  character,
  persona,
  modelName,
  onSwipeChange,
  onReroll,
}) => {
  const [hovered, setHovered] = useState(false);

  const isAssistant = turn.role === 'assistant';
  const activeContent = turn.swipes[turn.active_index] || turn.swipes[0] || '';

  const avatar = isAssistant ? character?.avatar_url : persona?.avatar_url;
  const name = isAssistant ? character?.name : persona?.name;
  const subtitle = isAssistant ? character?.tagline : 'You';

  const handleCopy = () => {
    navigator.clipboard.writeText(activeContent);
  };

  const handlePrev = () => {
    if (turn.active_index > 0) {
      onSwipeChange(turn.id, turn.active_index - 1);
    }
  };

  const handleNext = () => {
    if (turn.active_index < turn.swipes.length - 1) {
      onSwipeChange(turn.id, turn.active_index + 1);
    }
  };

  return (
    <div
      className={`group relative flex gap-3 py-4 px-4 ${
        isAssistant ? '' : 'flex-row-reverse'
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar */}
      <div className="shrink-0 pt-1">
        <img
          src={avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
          alt={name || 'Avatar'}
          className={`w-10 h-10 rounded-full object-cover ring-1 ${
            isAssistant ? 'ring-zinc-700' : 'ring-emerald-500/50'
          }`}
        />
      </div>

      {/* Message Content */}
      <div className={`flex-1 min-w-0 ${isAssistant ? '' : 'flex flex-col items-end'}`}>
        {/* Name Header */}
        <div className={`flex items-center gap-2 mb-1.5 ${isAssistant ? '' : 'flex-row-reverse'}`}>
          <span className="font-semibold text-sm text-zinc-200">
            {name || 'Unknown'}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            isAssistant
              ? 'text-indigo-300 bg-indigo-500/10 border border-indigo-500/20'
              : 'text-emerald-300 bg-emerald-500/10 border border-emerald-500/20'
          }`}>
            {isAssistant ? formatModelBadge(turn.model_name, modelName) : 'YOU'}
          </span>
          {subtitle && isAssistant && (
            <span className="text-[11px] text-zinc-500 truncate max-w-48">
              {subtitle}
            </span>
          )}
        </div>

        {/* Prose Body */}
        <div className={`rounded-2xl p-4 max-w-[85%] ${
          isAssistant
            ? 'bg-transparent'
            : 'bg-[#1e1e22] border border-[#2a2a2e]'
        }`}>
          <RoleplayProse content={activeContent} />

          {/* Swipe Controls (Assistant only) */}
          {isAssistant && (
            <SwipeControls
              activeIndex={turn.active_index}
              totalSwipes={turn.swipes.length}
              onPrev={handlePrev}
              onNext={handleNext}
              onReroll={() => onReroll(turn.id)}
            />
          )}
        </div>
      </div>

      {/* Hover Action Bar */}
      {hovered && (
        <div className={`absolute top-2 ${isAssistant ? 'right-4' : 'left-4'} z-10`}>
          <ActionBar
            role={turn.role}
            onEdit={() => {}}
            onPin={() => {}}
            onCopy={handleCopy}
            onDelete={() => {}}
          />
        </div>
      )}
    </div>
  );
};
